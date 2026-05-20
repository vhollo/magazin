/**
 * Firestore doc id for a magazine article path (no leading slash).
 * @param {string} pathValue
 */
export function encodeDocPathId(pathValue) {
  return String(pathValue ?? '')
    .trim()
    .replace(/^\/+/, '')
    .replace(/\//g, '~')
}

/**
 * @param {string} docId
 */
export function decodeDocPathId(docId) {
  return String(docId ?? '').replace(/~/g, '/')
}
