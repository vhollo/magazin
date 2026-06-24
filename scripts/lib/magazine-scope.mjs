/**
 * Which MODX site_content rows belong to the magazine sync universe.
 * Keep in sync with scripts/modx/modx-firestore-sync-plugin.php.
 */

/** MODX Evolution `reference` (= manager "weblink"); Revolution uses `weblink`. */
export function isModxReferenceType(type) {
  return type === 'reference' || type === 'weblink'
}

/**
 * Root-level weblink/reference (parent=0) — alias is the site path (`/alias`).
 * @param {{ parent?: number, type?: string }} row
 */
export function isRootReferenceRow(row) {
  return Number(row.parent) === 0 && isModxReferenceType(row.type)
}

/**
 * Numeric MODX id stored in a reference row's `content` (not an external URL).
 * @param {unknown} content
 * @returns {number | undefined}
 */
export function parseModxReferenceTargetId(content) {
  const trimmed = String(content ?? '').trim()
  if (!/^\d+$/.test(trimmed)) return undefined
  const id = Number(trimmed)
  return Number.isFinite(id) && id > 0 ? id : undefined
}

/**
 * @param {typeof modx_site_content.$inferSelect[]} rows
 * @returns {number[]}
 */
export function referenceTargetIds(rows) {
  /** @type {number[]} */
  const ids = []
  for (const row of rows) {
    const targetId = parseModxReferenceTargetId(row.content)
    if (targetId && isRootReferenceRow(row)) ids.push(targetId)
  }
  return ids
}

/**
 * @param {{ id?: number, parent?: number, template?: number, type?: string }} row
 */
export function isMagazineCandidate(row) {
  if (isRootReferenceRow(row)) return true
  if (row.type !== 'document') return false
  if (Number(row.id) === 2797) return true
  const parent = Number(row.parent)
  const template = Number(row.template)
  if (parent === 1) return true
  if (parent !== 1 && (template === 9 || template === 13)) return true
  return false
}

/**
 * @param {{ id?: number, parent?: number, template?: number, type?: string, deleted?: number, published?: number, hidemenu?: number }} row
 */
export function shouldSyncRow(row) {
  if (isRootReferenceRow(row)) {
    if (Number(row.deleted) !== 0) return false
    if (Number(row.published) !== 1) return false
    return parseModxReferenceTargetId(row.content) != null
  }
  if (row.type !== 'document') return false
  // Special hirek container: sync while not deleted (published flag ignored, matches queryChangedRows)
  if (Number(row.id) === 2797) return Number(row.deleted) === 0
  if (Number(row.deleted) !== 0) return false
  if (Number(row.published) !== 1) return false
  const parent = Number(row.parent)
  const template = Number(row.template)
  if (parent === 1) return Number(row.hidemenu) === 0
  if (parent !== 1 && (template === 9 || template === 13)) return true
  return false
}
