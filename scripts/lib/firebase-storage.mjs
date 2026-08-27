import { getStorage } from 'firebase-admin/storage'
import { getFirestoreDb } from './firebase-admin.mjs'

/** @type {import('firebase-admin/storage').Storage | undefined} */
let storage

function getFirebaseStorage() {
  if (storage) return storage
  getFirestoreDb()
  storage = getStorage()
  return storage
}

function resolveBucketName() {
  if (process.env.FIREBASE_STORAGE_BUCKET) return process.env.FIREBASE_STORAGE_BUCKET
  const raw = process.env.FIREBASE_ADMIN_KEY
  if (raw) {
    try {
      const projectId = JSON.parse(raw).project_id
      if (projectId) return `${projectId}.firebasestorage.app`
    } catch {
      /* ignore */
    }
  }
  return null
}

/**
 * Bucket handle for the configured Storage bucket.
 * @returns {import('@google-cloud/storage').Bucket}
 */
export function getStorageBucket() {
  const bucketName = resolveBucketName()
  if (!bucketName) {
    throw new Error('FIREBASE_STORAGE_BUCKET is required for Storage access')
  }
  return getFirebaseStorage().bucket(bucketName)
}

/**
 * Upload a buffer to Firebase Storage and return a public download URL.
 * @param {string} objectPath e.g. search/index-1716123456.json.gz
 * @param {Buffer} buffer
 * @param {string} contentType
 * @param {Record<string, string>} [metadata]
 */
export async function uploadPublicFile(objectPath, buffer, contentType, metadata = {}) {
  const bucket = getStorageBucket()
  const file = bucket.file(objectPath)
  await file.save(buffer, {
    metadata: {
      contentType,
      cacheControl: 'public, max-age=31536000, immutable',
      metadata,
    },
    gzip: false,
  })
  await file.makePublic()
  return `https://storage.googleapis.com/${bucket.name}/${encodeURIComponent(objectPath).replace(/%2F/g, '/')}`
}

/**
 * Upload a buffer to Firebase Storage WITHOUT making it public — for
 * subscriber-gated artifacts the API serves after auth (e.g. the slim
 * Receptsarok catalog). Overwritten in place at a fixed path each sync.
 * @param {string} objectPath
 * @param {Buffer} buffer
 * @param {string} contentType
 * @param {Record<string, string>} [metadata]
 */
export async function uploadPrivateFile(objectPath, buffer, contentType, metadata = {}) {
  const bucket = getStorageBucket()
  const file = bucket.file(objectPath)
  await file.save(buffer, {
    metadata: {
      contentType,
      cacheControl: 'private, max-age=0, no-store',
      metadata,
    },
    gzip: false,
  })
  return `gs://${bucket.name}/${objectPath}`
}

/** Versioned Storage artifacts older than this may be deleted after an upload. */
export const STORAGE_PRUNE_MAX_AGE_DAYS = 7
/** Newest N versions always survive, however old they are. */
export const STORAGE_PRUNE_KEEP_MIN = 2

/**
 * Object path behind a public download URL produced by {@link uploadPublicFile},
 * or null when the URL does not belong to this bucket.
 * @param {string} url
 * @param {string} bucketName
 */
function objectPathFromPublicUrl(url, bucketName) {
  if (typeof url !== 'string' || !url.trim()) return null
  const prefix = `https://storage.googleapis.com/${bucketName}/`
  if (!url.startsWith(prefix)) return null
  try {
    return decodeURIComponent(url.slice(prefix.length))
  } catch {
    return null
  }
}

/** Millisecond timestamp encoded in `…-<ms>.json.gz`, else null. */
function versionFromObjectName(objectPath) {
  const base = objectPath.slice(objectPath.lastIndexOf('/') + 1)
  const match = /-(\d{12,})\./.exec(base)
  if (!match) return null
  const value = Number(match[1])
  return Number.isFinite(value) ? value : null
}

/**
 * List every object under a prefix with its version timestamp and size.
 * @param {string} prefix e.g. `search/`
 */
export async function listVersionedObjects(prefix) {
  const bucket = getStorageBucket()
  const [files] = await bucket.getFiles({ prefix })
  return files.map((file) => {
    const created = Date.parse(file.metadata?.timeCreated ?? '')
    const version = versionFromObjectName(file.name)
    return {
      file,
      name: file.name,
      size: Number(file.metadata?.size ?? 0) || 0,
      version,
      /** Best available age reference; null when neither name nor metadata gives one. */
      timestamp: version ?? (Number.isFinite(created) ? created : null),
    }
  })
}

/**
 * Delete superseded versioned artifacts under a prefix.
 *
 * Kept: the newest `keepMin` versions, anything younger than `maxAgeDays`,
 * anything referenced by `keepUrls` (live meta pointers), and anything whose name
 * carries no version timestamp (foreign objects, folder placeholders) — those are
 * never touched. Never throws: a prune failure must not fail the content sync
 * that triggered it.
 *
 * @param {string} prefix
 * @param {{ maxAgeDays?: number, keepMin?: number, keepUrls?: (string|null|undefined)[], dryRun?: boolean, quiet?: boolean }} [options]
 */
export async function pruneVersionedObjects(prefix, options = {}) {
  const {
    maxAgeDays = STORAGE_PRUNE_MAX_AGE_DAYS,
    keepMin = STORAGE_PRUNE_KEEP_MIN,
    keepUrls = [],
    dryRun = false,
    quiet = false,
  } = options

  const empty = { deleted: 0, kept: 0, freedBytes: 0, deletedNames: [], keptNames: [] }

  let bucketName
  try {
    bucketName = resolveBucketName()
    if (!bucketName) throw new Error('FIREBASE_STORAGE_BUCKET is required')
  } catch (err) {
    if (!quiet) console.warn(`storage prune: ${prefix} skipped (${err.message})`)
    return { ...empty, skippedReason: err.message }
  }

  /** @type {Set<string>} */
  const protectedPaths = new Set()
  for (const url of keepUrls) {
    const objectPath = objectPathFromPublicUrl(url ?? '', bucketName)
    if (objectPath) protectedPaths.add(objectPath)
  }

  let entries
  try {
    entries = await listVersionedObjects(prefix)
  } catch (err) {
    if (!quiet) console.warn(`storage prune: ${prefix} listing failed (${err.message})`)
    return { ...empty, skippedReason: err.message }
  }

  const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000
  const sorted = [...entries].sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0))

  /** @type {typeof sorted} */
  const doomed = []
  /** @type {typeof sorted} */
  const kept = []
  sorted.forEach((entry, index) => {
    const keep =
      index < keepMin ||
      entry.version == null ||
      entry.timestamp >= cutoff ||
      protectedPaths.has(entry.name)
    ;(keep ? kept : doomed).push(entry)
  })

  let deleted = 0
  let freedBytes = 0
  const deletedNames = []
  if (!dryRun && doomed.length > 0) {
    const queue = [...doomed]
    const workers = Array.from({ length: Math.min(8, queue.length) }, async () => {
      for (let entry = queue.shift(); entry; entry = queue.shift()) {
        try {
          await entry.file.delete({ ignoreNotFound: true })
          deleted++
          freedBytes += entry.size
          deletedNames.push(entry.name)
        } catch (err) {
          if (!quiet) console.warn(`storage prune: failed to delete ${entry.name} (${err.message})`)
        }
      }
    })
    await Promise.all(workers)
  } else if (dryRun) {
    deleted = doomed.length
    freedBytes = doomed.reduce((sum, entry) => sum + entry.size, 0)
    deletedNames.push(...doomed.map((entry) => entry.name))
  }

  if (!quiet) {
    const mib = (freedBytes / 1024 / 1024).toFixed(1)
    console.log(
      `storage prune: ${prefix} — ${dryRun ? 'would delete' : 'deleted'} ${deleted} (${mib} MiB), kept ${kept.length}`
    )
  }

  return {
    deleted,
    kept: kept.length,
    freedBytes,
    deletedNames,
    keptNames: kept.map((entry) => entry.name),
  }
}
