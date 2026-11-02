/**
 * MODX newsletters (children of the „Hírlevelek” folder, MODX id 2) →
 * Firestore `hirlevelek/{modxId}`.
 *
 * Only the save payload writes here (one newsletter per MODX save); older
 * newsletters are not imported. FireCMS (`../firecms/src/collections/hirlevelek.tsx`)
 * edits the same docs and exports them for sending — see AGENTS.md → Newsletter Route.
 */

import { Timestamp } from 'firebase-admin/firestore'
import { isNewsletterRow } from './magazine-scope.mjs'

export const NEWSLETTERS_COLLECTION = 'hirlevelek'

/** @param {number} seconds MODX unix seconds */
function toTimestamp(seconds) {
  return seconds > 0 ? Timestamp.fromMillis(seconds * 1000) : null
}

/**
 * Relative `assets/…` links only work on the MODX site; in an email every link
 * must be absolute.
 *
 * @param {string} html
 * @param {string} baseUrl ends with `/`
 */
export function absolutizeAssetLinks(html, baseUrl) {
  return html.replace(/(\s(?:src|href)=["'])\/?(assets\/)/gi, `$1${baseUrl}$2`)
}

/**
 * Fields MODX owns. `subject` is left out on purpose: it is CMS-owned, so a
 * MODX save (merge write) keeps whatever the editor set in FireCMS.
 *
 * @param {Record<string, unknown>} row MODX site_content row
 * @param {string} baseUrl
 */
export function newsletterDocFromRow(row, baseUrl) {
  const date =
    toTimestamp(Number(row.pub_date)) ??
    toTimestamp(Number(row.publishedon)) ??
    toTimestamp(Number(row.createdon))
  return {
    title: String(row.pagetitle ?? ''),
    content: absolutizeAssetLinks(String(row.content ?? ''), baseUrl),
    published: Number(row.published) === 1,
    date,
    modxId: Number(row.id),
    source: 'modx',
    editedon: toTimestamp(Number(row.editedon)),
  }
}

/**
 * Upsert the saved newsletters, delete trashed ones and every MODX id removed
 * without a row (emptied trash — the id may or may not be a newsletter; deleting
 * a missing doc is harmless). Unpublished newsletters are kept with
 * `published: false`: the old MODX export allowed sending them too.
 *
 * @param {import('firebase-admin/firestore').Firestore} firestore
 * @param {{ rows: Record<string, unknown>[], removedIds?: number[], baseUrl: string }} input
 * @returns {Promise<{ written: number, deleted: number }>}
 */
export async function writeNewsletters(firestore, { rows, removedIds = [], baseUrl }) {
  const col = firestore.collection(NEWSLETTERS_COLLECTION)
  const deleteIds = new Set(removedIds.map(Number))
  let written = 0

  const batch = firestore.batch()
  for (const row of rows) {
    if (!isNewsletterRow(row)) continue
    const id = Number(row.id)
    if (Number(row.deleted) !== 0) {
      deleteIds.add(id)
      continue
    }
    deleteIds.delete(id)
    batch.set(col.doc(String(id)), newsletterDocFromRow(row, baseUrl), { merge: true })
    written++
    console.log(`  newsletter: hirlevelek/${id} "${row.pagetitle ?? ''}"`)
  }
  for (const id of deleteIds) {
    batch.delete(col.doc(String(id)))
  }
  if (written > 0 || deleteIds.size > 0) await batch.commit()
  return { written, deleted: deleteIds.size }
}
