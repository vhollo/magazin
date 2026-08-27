/**
 * Parse and validate a gzip+base64 MODX save payload produced by the
 * MODX plugin (modx-firestore-sync-plugin.php).
 *
 * Each repository_dispatch carries exactly one saved doc (+ ancestors), or —
 * for a hard removal (emptied trash, deleted descendants) — only the MODX ids
 * whose rows no longer exist to be classified.
 * Payload shape (after gunzip + JSON.parse):
 * {
 *   rows:       ModxSiteContentRow[]              // saved doc + all ancestors (may be empty)
 *   tvs:        { tmplvarid, contentid, value }[] // filtered TV rows (ids 3,4,18,23,25,28,29,30,31)
 *   removedIds: number[]                          // optional — MODX ids to delete from Firestore by id
 *   szerzok:    { name, snippet }[]               // legacy, ignored (authors live in Firestore)
 * }
 */

import zlib from 'node:zlib'
import { promisify } from 'node:util'
import { isMagazineCandidate, shouldSyncRow } from './magazine-scope.mjs'

const gunzip = promisify(zlib.gunzip)

/**
 * @param {string} base64Gz
 * @returns {Promise<{ rows: object[], tvs: object[], removedIds: number[] }>}
 */
export async function parseModxSavePayload(base64Gz) {
  const buf = Buffer.from(base64Gz, 'base64')
  const json = await gunzip(buf)
  const parsed = JSON.parse(json.toString('utf8'))

  // `szerzok` is not read any more (authors live in Firestore), so a plugin that
  // still sends it and one that no longer does are both accepted.
  if (!Array.isArray(parsed?.rows) || !Array.isArray(parsed?.tvs)) {
    throw new Error('modx-save-payload: unexpected shape — expected { rows, tvs }')
  }

  return {
    rows: parsed.rows,
    tvs: parsed.tvs,
    removedIds: normaliseRemovedIds(parsed?.removedIds),
  }
}

/**
 * `removedIds` carries MODX ids whose `site_content` row is already gone
 * (emptied trash) or whose row was not worth shipping (trashed descendants of a
 * deleted folder). They are deleted from Firestore by their stored `id` field.
 *
 * @param {unknown} value
 * @returns {number[]}
 */
function normaliseRemovedIds(value) {
  if (!Array.isArray(value)) return []
  const ids = new Set()
  for (const raw of value) {
    const id = Number(raw)
    if (Number.isFinite(id) && id > 0) ids.add(id)
  }
  return [...ids]
}

/**
 * Classify payload rows into changedRows / removedRows, exactly mirroring
 * queryChangedRows + queryRemovedRows + queryForcedRow from the MySQL path.
 *
 * Payload rows = doc + ancestors. Only rows that are magazine candidates and
 * are in the "top-of-queue" doc set (non-ancestor) get classified as
 * changed/removed. Ancestor rows are only needed for path resolution.
 *
 * @param {{ rows: object[], tvs: object[], removedIds?: number[] }} payload
 * @returns {{ changedRows: object[], removedRows: object[], removedModxIds: number[], rowsToProcess: object[], tmplvarContentvalues: object[] }}
 */
export function classifyPayload(payload) {
  const { rows, tvs } = payload

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
  // Rows that travelled with the payload win over a bare id: a row still present
  // in MODX is classified by shouldSyncRow (which keeps e.g. the always-synced
  // hirek container 2797), never blind-deleted.
  const classifiedIds = new Set(rows.map((row) => Number(row?.id)))
  const removedModxIds = normaliseRemovedIds(payload?.removedIds).filter(
    (id) => !classifiedIds.has(id)
  )

  return {
    changedRows,
    removedRows,
    removedModxIds,
    rowsToProcess: rows,
    tmplvarContentvalues: tvs,
  }
}
