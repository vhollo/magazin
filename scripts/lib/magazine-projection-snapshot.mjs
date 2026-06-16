import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { encodeDocPathId, normalizeArticlePath } from './doc-path-id.mjs'
import { pickDocFields, PROJECTION_FIELDS } from './firestore-docs.mjs'
import { downloadGzipJson, gzipJson } from './storage-gzip-json.mjs'
import { uploadPublicFile } from './firebase-storage.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const META_PROJECTIONS_DOC = 'projections'

/**
 * @typedef {object} ProjectionLoadResult
 * @property {Record<string, unknown>[]} docs
 * @property {{ projection: number, meta: number }} reads
 * @property {boolean} fullRebuild
 */

/**
 * @param {import('firebase-admin/firestore').Firestore} firestore
 */
async function readMetaProjections(firestore) {
  const snap = await firestore.collection('meta').doc(META_PROJECTIONS_DOC).get()
  if (!snap.exists) return { data: null, reads: 1 }
  return { data: snap.data(), reads: 1 }
}

/**
 * @param {import('firebase-admin/firestore').Firestore} firestore
 */
async function loadFullProjectionFromFirestore(firestore) {
  const snapshot = await firestore.collection('docs').select(...PROJECTION_FIELDS).get()
  const docs = snapshot.docs.map((snap) => snap.data())
  return { docs, reads: snapshot.size }
}

/**
 * Merge Storage snapshot with in-memory sync rows and apply removals.
 *
 * @param {Record<string, unknown>[]} baseDocs
 * @param {Map<number, Record<string, unknown>>} workingById
 * @param {Set<string>} removedPaths normalized paths to drop
 * @param {Set<number>} [removedModxIds] drop every snapshot row with these MODX ids (any path)
 * @param {Set<number>|null} [overlayIds] only overlay workingById rows in this set; null = all
 */
function mergeProjectionSnapshot(
  baseDocs,
  workingById,
  removedPaths,
  removedModxIds = new Set(),
  overlayIds = null
) {
  const byDocId = new Map()
  for (const doc of baseDocs) {
    if (typeof doc?.path !== 'string' || !doc.path.trim()) continue
    byDocId.set(encodeDocPathId(doc.path), pickDocFields(doc))
  }
  if (removedModxIds.size > 0) {
    for (const [encoded, doc] of byDocId) {
      const modxId = Number(doc.id)
      if (Number.isFinite(modxId) && removedModxIds.has(modxId)) {
        byDocId.delete(encoded)
      }
    }
  }
  for (const processed of workingById.values()) {
    const modxId = Number(processed?.id)
    if (overlayIds != null) {
      if (!Number.isFinite(modxId) || !overlayIds.has(modxId)) continue
    }
    if (typeof processed?.path !== 'string' || !processed.path.trim()) continue
    byDocId.set(encodeDocPathId(processed.path), pickDocFields(processed))
  }
  for (const p of removedPaths) {
    if (p) byDocId.delete(encodeDocPathId(p))
  }
  return [...byDocId.values()]
}

/**
 * @param {import('firebase-admin/firestore').Firestore} firestore
 * @param {Map<number, Record<string, unknown>>} workingById
 * @param {string[]} removedPaths
 * @param {{ fullRebuild?: boolean, removedModxIds?: Set<number>, overlayIds?: Set<number>|null }} [options]
 * @returns {Promise<ProjectionLoadResult>}
 */
export async function loadProjectionDocsForSync(
  firestore,
  workingById,
  removedPaths,
  { fullRebuild = false, removedModxIds = new Set(), overlayIds = null } = {}
) {
  /** @type {{ projection: number, meta: number }} */
  const reads = { projection: 0, meta: 0 }

  const normalizedRemoved = new Set(
    removedPaths
      .map((p) => (typeof p === 'string' ? normalizeArticlePath(p) : ''))
      .filter(Boolean)
  )

  if (fullRebuild) {
    const { docs, reads: n } = await loadFullProjectionFromFirestore(firestore)
    reads.projection = n
    const { reads: metaReads } = await readMetaProjections(firestore)
    reads.meta = metaReads
    const merged = mergeProjectionSnapshot(
      docs,
      workingById,
      normalizedRemoved,
      removedModxIds,
      overlayIds
    )
    return { docs: merged, reads, fullRebuild: true }
  }

  const { data: meta, reads: metaReads } = await readMetaProjections(firestore)
  reads.meta = metaReads

  const snapshotUrl = typeof meta?.snapshotUrl === 'string' ? meta.snapshotUrl.trim() : ''
  if (!snapshotUrl) {
    console.warn('projection snapshot: missing meta/projections.snapshotUrl — full Firestore scan')
    const { docs, reads: n } = await loadFullProjectionFromFirestore(firestore)
    reads.projection = n
    const merged = mergeProjectionSnapshot(
      docs,
      workingById,
      normalizedRemoved,
      removedModxIds,
      overlayIds
    )
    return { docs: merged, reads, fullRebuild: true }
  }

  try {
    const parsed = await downloadGzipJson(snapshotUrl)
    const baseDocs = Array.isArray(parsed) ? parsed : []
    console.log(`projection snapshot: loaded ${baseDocs.length} docs from Storage`)
    const merged = mergeProjectionSnapshot(
      baseDocs,
      workingById,
      normalizedRemoved,
      removedModxIds,
      overlayIds
    )
    return { docs: merged, reads, fullRebuild: false }
  } catch (err) {
    console.warn(`projection snapshot: download failed (${err.message}) — full Firestore scan`)
    const { docs, reads: n } = await loadFullProjectionFromFirestore(firestore)
    reads.projection = n
    const merged = mergeProjectionSnapshot(
      docs,
      workingById,
      normalizedRemoved,
      removedModxIds,
      overlayIds
    )
    return { docs: merged, reads, fullRebuild: true }
  }
}

/**
 * @param {import('firebase-admin/firestore').Firestore} firestore
 * @param {Record<string, unknown>[]} projectionDocs
 */
export async function uploadProjectionSnapshot(firestore, projectionDocs) {
  const version = Date.now()
  const objectPath = `projections/slim-${version}.json.gz`
  const gzipped = gzipJson(projectionDocs)
  const snapshotUrl = await uploadPublicFile(objectPath, gzipped, 'application/gzip')

  await firestore.collection('meta').doc(META_PROJECTIONS_DOC).set({
    snapshotUrl,
    version,
    docCount: projectionDocs.length,
    generatedAt: new Date().toISOString(),
  })

  console.log(
    `projection snapshot: ${objectPath} (${(gzipped.length / 1024).toFixed(0)} KiB gzip), docs=${projectionDocs.length}`
  )
  return { snapshotUrl, version, docCount: projectionDocs.length }
}
