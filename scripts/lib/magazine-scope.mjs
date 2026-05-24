/**
 * Which MODX site_content rows belong to the magazine sync universe.
 * Keep in sync with scripts/modx/modx-firestore-sync-plugin.php.
 */

/**
 * @param {{ id?: number, parent?: number, template?: number, type?: string }} row
 */
export function isMagazineCandidate(row) {
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
