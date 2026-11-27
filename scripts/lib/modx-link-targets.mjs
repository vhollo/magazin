/**
 * Paths for MODX internal links (`[~id~]`) whose target is not in a sync run's
 * working set.
 *
 * `transform.ts` rewrites `[~id~]` to the target's path from `getEveryDocs()`.
 * A full sync loads every published row, but an incremental, forced or payload
 * (MODX save) run loads only the changed rows and their ancestors — so a link to
 * any other article resolved to '' and was stored as `href=""` (a link to the
 * page itself). This looks the missing targets up in Firestore `docs/*` (the same
 * published set a full sync would see; an unpublished target stays '', as there).
 * One read per target found; nothing when every target is already loaded.
 */

const LINK_RE = /\[~(\d+)~\]/g

/**
 * What `alapjav` (transform.ts) drops from a field: HTML comments and MODX tag
 * calls — `[[…]]`, `[!…!]` (e.g. a ChunkTimer whose `&chunk` holds a dated link),
 * `{{…}}`, `[+…+]`. A link inside them never reaches the stored doc, so its target
 * needs no lookup. (`nagyito` calls become images before this and carry no links.)
 */
const DROPPED_RE = [/<!--[\s\S]*?-->/g, /\[\[[\s\S]*?\]\]/g, /\[![\s\S]*?!\]/g, /\{\{[\s\S]*?\}\}/g, /\[\+[\s\S]*?\+\]/g]

/** @param {unknown} value */
const withoutDropped = (value) => DROPPED_RE.reduce((text, re) => text.replace(re, ''), String(value ?? ''))

/**
 * Target ids of the `[~id~]` links that end up in the rows' stored `content`,
 * `introtext` and `description` — links in comments and MODX tag calls are skipped.
 * @param {Record<string, unknown>[]} rows
 * @returns {number[]}
 */
export function modxLinkTargetIds(rows) {
  const ids = new Set()
  for (const row of rows) {
    for (const field of ['content', 'introtext', 'description']) {
      for (const m of withoutDropped(row?.[field]).matchAll(LINK_RE)) ids.add(Number(m[1]))
    }
  }
  return [...ids].filter((id) => id > 0)
}

/**
 * @param {import('firebase-admin/firestore').Firestore} firestore
 * @param {number[]} ids target ids not in the working set
 * @returns {Promise<{ paths: Map<number, string>, reads: number }>}
 */
export async function loadLinkTargetPaths(firestore, ids) {
  /** @type {Map<number, string>} */
  const paths = new Map()
  let reads = 0
  for (let i = 0; i < ids.length; i += 30) {
    const chunk = ids.slice(i, i + 30)
    const snap = await firestore.collection('docs').where('id', 'in', chunk).select('id', 'path').get()
    reads += Math.max(1, snap.size) // an empty query still bills one read
    for (const doc of snap.docs) {
      const id = Number(doc.get('id'))
      const path = doc.get('path')
      if (Number.isFinite(id) && typeof path === 'string' && path) paths.set(id, path)
    }
  }
  return { paths, reads }
}
