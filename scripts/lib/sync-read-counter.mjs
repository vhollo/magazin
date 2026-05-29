/** @typedef {{ projection: number, meta: number, searchArticles: number, searchRecipes: number, redirects: number, searchMeta: number, orphanScan: number }} ReadCounts */

export function createReadCounter() {
  return {
    projection: 0,
    meta: 0,
    searchArticles: 0,
    searchRecipes: 0,
    redirects: 0,
    searchMeta: 0,
    orphanScan: 0,
  }
}

/**
 * @param {ReadCounts} counts
 */
export function totalReads(counts) {
  return (
    counts.projection +
    counts.meta +
    counts.searchArticles +
    counts.searchRecipes +
    counts.redirects +
    counts.searchMeta +
    counts.orphanScan
  )
}

/**
 * @param {ReadCounts} counts
 */
export function formatReadCounts(counts) {
  const total = totalReads(counts)
  return `firestoreReads={projection:${counts.projection},searchArticles:${counts.searchArticles},searchRecipes:${counts.searchRecipes},redirects:${counts.redirects},searchMeta:${counts.searchMeta},orphanScan:${counts.orphanScan},meta:${counts.meta},total:${total}}`
}
