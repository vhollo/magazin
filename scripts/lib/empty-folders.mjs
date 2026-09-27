import { encodeDocPathId } from './doc-path-id.mjs'

/**
 * A pure container folder: its stored (post-`alapjav`) `content` is blank. Kept out of
 * every listing — collections, related cards and the search index.
 *
 * @param {Record<string, any>} doc needs `isfolder` + `content`
 */
export function isEmptyContentFolder(doc) {
  return Boolean(doc?.isfolder) && !String(doc?.content ?? '').trim()
}

/**
 * Paths of listed folders whose stored (post-`alapjav`) `content` is blank — i.e. pure
 * container folders. `content` lives outside the projection, so read just the listed
 * folders' bodies via one field-masked `getAll`.
 *
 * @param {import('firebase-admin/firestore').Firestore} firestore
 * @param {Record<string, any>[]} listedDocs
 * @returns {Promise<Set<string>>} set of folder paths with empty content
 */
export async function emptyContentFolderPaths(firestore, listedDocs) {
  const folders = listedDocs.filter((d) => d?.isfolder && d?.path)
  if (!folders.length) return new Set()
  const refs = folders.map((d) => firestore.collection('docs').doc(encodeDocPathId(d.path)))
  const snaps = await firestore.getAll(...refs, { fieldMask: ['content'] })
  const empty = new Set()
  snaps.forEach((snap, i) => {
    const content = snap.exists ? snap.get('content') : ''
    if (isEmptyContentFolder({ ...folders[i], content })) empty.add(folders[i].path)
  })
  return empty
}
