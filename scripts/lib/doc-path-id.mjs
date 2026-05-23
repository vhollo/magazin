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
 * Canonical article path for deduping (no leading slash).
 * @param {string} pathValue
 */
export function normalizeArticlePath(pathValue) {
  const encoded = encodeDocPathId(pathValue)
  if (!encoded) return ''
  return encoded.replace(/~/g, '/')
}

/**
 * @param {string} docId
 */
export function decodeDocPathId(docId) {
  return String(docId ?? '').replace(/~/g, '/')
}
