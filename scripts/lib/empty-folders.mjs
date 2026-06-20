import { encodeDocPathId } from './doc-path-id.mjs'

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
    if (!String(content ?? '').trim()) empty.add(folders[i].path)
  })
  return empty
}
