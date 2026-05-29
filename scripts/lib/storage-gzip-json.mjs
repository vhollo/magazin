import { gunzipSync, gzipSync } from 'node:zlib'

/**
 * @param {string} url
 * @returns {Promise<Buffer>}
 */
export async function downloadBuffer(url) {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Storage download failed: ${res.status} ${url}`)
  }
  const ab = await res.arrayBuffer()
  return Buffer.from(ab)
}

/**
 * @param {string} url
 * @returns {Promise<unknown>}
 */
export async function downloadGzipJson(url) {
  const buf = await downloadBuffer(url)
  const json = gunzipSync(buf).toString('utf8')
  return JSON.parse(json)
}

/**
 * @param {unknown} data
 * @returns {Buffer}
 */
export function gzipJson(data) {
  return gzipSync(Buffer.from(JSON.stringify(data), 'utf8'))
}
