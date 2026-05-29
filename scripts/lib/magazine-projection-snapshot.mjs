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
 */
function mergeProjectionSnapshot(baseDocs, workingById, removedPaths) {
  const byDocId = new Map()
  for (const doc of baseDocs) {
    if (typeof doc?.path !== 'string' || !doc.path.trim()) continue
    byDocId.set(encodeDocPathId(doc.path), pickDocFields(doc))
  }
  for (const processed of workingById.values()) {
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
 * @param {{ fullRebuild: boolean }} options
 * @returns {Promise<ProjectionLoadResult>}
 */
export async function loadProjectionDocsForSync(
  firestore,
  workingById,
  removedPaths,
  { fullRebuild = false } = {}
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
    const merged = mergeProjectionSnapshot(docs, workingById, normalizedRemoved)
    return { docs: merged, reads, fullRebuild: true }
  }

  const { data: meta, reads: metaReads } = await readMetaProjections(firestore)
  reads.meta = metaReads

  const snapshotUrl = typeof meta?.snapshotUrl === 'string' ? meta.snapshotUrl.trim() : ''
  if (!snapshotUrl) {
    console.warn('projection snapshot: missing meta/projections.snapshotUrl — full Firestore scan')
    const { docs, reads: n } = await loadFullProjectionFromFirestore(firestore)
    reads.projection = n
    const merged = mergeProjectionSnapshot(docs, workingById, normalizedRemoved)
    return { docs: merged, reads, fullRebuild: true }
  }

  try {
    const parsed = await downloadGzipJson(snapshotUrl)
    const baseDocs = Array.isArray(parsed) ? parsed : []
    console.log(`projection snapshot: loaded ${baseDocs.length} docs from Storage`)
    const merged = mergeProjectionSnapshot(baseDocs, workingById, normalizedRemoved)
    return { docs: merged, reads, fullRebuild: false }
  } catch (err) {
    console.warn(`projection snapshot: download failed (${err.message}) — full Firestore scan`)
    const { docs, reads: n } = await loadFullProjectionFromFirestore(firestore)
    reads.projection = n
    const merged = mergeProjectionSnapshot(docs, workingById, normalizedRemoved)
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
