import { encodeDocPathId } from './doc-path-id.mjs'

/** Fields for collection / related-cards projection — no HTML body. */
export const PROJECTION_FIELDS = [
  'id',
  'path',
  'title',
  'longtitle',
  'description',
  'ellipsis',
  'img',
  'video',
  'table',
  'redirect',
  'isfolder',
  'editedon',
  'publishedon',
  'tv',
]

/**
 * @param {Record<string, unknown>} doc
 * @param {string[]} fields
 */
export function pickDocFields(doc, fields = PROJECTION_FIELDS) {
  /** @type {Record<string, unknown>} */
  const out = {}
  for (const field of fields) {
    if (doc[field] !== undefined) out[field] = doc[field]
  }
  return out
}

/**
 * Load slim docs for collection ranking (no article HTML). Overlays in-memory
 * rows from the current sync run so collections see fresh data.
 *
 * @deprecated Prefer loadProjectionDocsForSync (Storage snapshot). Kept for finish-modx one-off.
 * @param {import('firebase-admin/firestore').Firestore} firestore
 * @param {Map<number, Record<string, unknown>>} [workingById]
 */
export async function loadProjectionDocs(firestore, workingById = new Map()) {
  const snapshot = await firestore.collection('docs').select(...PROJECTION_FIELDS).get()
  const byDocId = new Map()
  for (const snap of snapshot.docs) {
    byDocId.set(snap.id, snap.data())
  }
  for (const processed of workingById.values()) {
    if (typeof processed?.path !== 'string' || !processed.path) continue
    byDocId.set(encodeDocPathId(processed.path), pickDocFields(processed))
  }
  return [...byDocId.values()]
}

export { loadProjectionDocsForSync, uploadProjectionSnapshot } from './magazine-projection-snapshot.mjs'
