/**
 * Parse and validate a gzip+base64 MODX save payload produced by the
 * MODX plugin (modx-firestore-sync-plugin.php).
 *
 * Each repository_dispatch carries exactly one saved doc (+ ancestors).
 * Payload shape (after gunzip + JSON.parse):
 * {
 *   rows:    ModxSiteContentRow[]              // saved doc + all ancestors
 *   tvs:     { tmplvarid, contentid, value }[] // filtered TV rows (ids 3,4,18,23,25,28,29,30,31)
 *   szerzok: { name, snippet }[]               // matched author chunks (category 24)
 * }
 */

import zlib from 'node:zlib'
import { promisify } from 'node:util'
import { isMagazineCandidate, shouldSyncRow } from './magazine-scope.mjs'

const gunzip = promisify(zlib.gunzip)

/**
 * @param {string} base64Gz
 * @returns {Promise<{ rows: object[], tvs: object[], szerzok: object[] }>}
 */
export async function parseModxSavePayload(base64Gz) {
  const buf = Buffer.from(base64Gz, 'base64')
  const json = await gunzip(buf)
  const parsed = JSON.parse(json.toString('utf8'))

  if (!Array.isArray(parsed?.rows) || !Array.isArray(parsed?.tvs) || !Array.isArray(parsed?.szerzok)) {
    throw new Error('modx-save-payload: unexpected shape — expected { rows, tvs, szerzok }')
  }

  return {
    rows: parsed.rows,
    tvs: parsed.tvs,
    szerzok: parsed.szerzok,
  }
}

/**
 * Classify payload rows into changedRows / removedRows, exactly mirroring
 * queryChangedRows + queryRemovedRows + queryForcedRow from the MySQL path.
 *
 * Payload rows = doc + ancestors. Only rows that are magazine candidates and
 * are in the "top-of-queue" doc set (non-ancestor) get classified as
 * changed/removed. Ancestor rows are only needed for path resolution.
 *
 * @param {{ rows: object[], tvs: object[], szerzok: object[] }} payload
 * @returns {{ changedRows: object[], removedRows: object[], rowsToProcess: object[], tmplvarContentvalues: object[], modxSzerzok: object[] }}
 */
export function classifyPayload(payload) {
  const { rows, tvs, szerzok } = payload

  const changedRows = []
  const removedRows = []

  for (const row of rows) {
    if (!isMagazineCandidate(row)) continue
    if (shouldSyncRow(row)) {
      changedRows.push(row)
    } else {
      removedRows.push(row)
    }
  }

  // All payload rows (including ancestors) are needed for path resolution.
  // sortRowsByDepth is called by the caller; we return the full set.
  return {
    changedRows,
    removedRows,
    rowsToProcess: rows,
    tmplvarContentvalues: tvs,
    modxSzerzok: szerzok,
  }
}
