/**
 * A multi-recipe article ("gyűjtőcikk") whose body was split into ≥2 Receptsarok
 * recipes (recipe.sourceModxId == doc id) is no longer a recipe itself: its dishes
 * render as recipe cards and leave its body (`stripSplitRecipeBlocks`). It loses the
 * `recept` tag on the site so it stops listing as a recipe article. MODX keeps the
 * tag — the offline splitter selects collection articles by it — so the sync drops
 * it on every save, and `scripts/drop-split-article-recept-tags.mjs` backfills docs
 * after the splitter created new recipes.
 */

const RECEPT_TAG = 'recept'

/** Per recipes-array memo: the sync calls this once per processed row. */
const countsCache = new WeakMap()

/**
 * @param {Array<{ sourceModxId?: unknown, published?: unknown }>} recipes
 * @returns {Map<number, number>} MODX article id → number of published recipes split out of it
 */
export function splitDishCountBySourceModxId(recipes) {
  const cached = countsCache.get(recipes)
  if (cached) return cached
  const counts = new Map()
  countsCache.set(recipes, counts)
  for (const r of recipes) {
    if (r?.published === false) continue
    const src = Number(r?.sourceModxId)
    if (!Number.isFinite(src)) continue
    counts.set(src, (counts.get(src) ?? 0) + 1)
  }
  return counts
}

/**
 * Remove the `recept` tag from a split article (in place). The sync calls it before
 * the redirect match and sync-create, which would otherwise treat a split article
 * tagged only `recept` as one recipe. A manifest redirect does not depend on tags,
 * and the existing-recipe update already skips collection sources.
 *
 * @param {{ id?: unknown, tv?: { tags?: string[] } }} doc
 * @param {Map<number, number>} splitCounts from {@link splitDishCountBySourceModxId}
 * @returns {boolean} whether the tag was removed
 */
export function dropReceptTagFromSplitArticle(doc, splitCounts) {
  const tags = doc?.tv?.tags
  if (!Array.isArray(tags) || !tags.includes(RECEPT_TAG)) return false
  if ((splitCounts.get(Number(doc.id)) ?? 0) < 2) return false
  doc.tv.tags = tags.filter((t) => t !== RECEPT_TAG)
  return true
}
