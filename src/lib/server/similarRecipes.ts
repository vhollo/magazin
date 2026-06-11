/**
 * "Hasonló receptek" via a recipes-only MiniSearch index built in-process —
 * the same engine and matching behavior as /keres (fuzzy + prefix), scoped to
 * published recipes so the SSR lambda never touches the 10 MB article index.
 *
 * The index is memoized against the `getRecipes()` result it was built from
 * (same lifetime as the recipe memo in siteConf, so the two cannot drift;
 * ~100 ms build once per process, sub-ms per query).
 */
import MiniSearch from 'minisearch'
import { getRecipes } from '$lib/siteConf'
import {
  recipeSlug,
  toLayoutRecipe,
  type Recipe,
  type RecipeLayoutEntry,
} from '$lib/receptsarok'

type RecipePublished = Recipe & { published?: boolean }

const SEARCH_OPTIONS = { fuzzy: 0.2, prefix: true, boost: { title: 2 } }

let memoSource: unknown = null
let memo: {
  index: MiniSearch
  entries: Map<string, RecipeLayoutEntry>
  /** Term → number of recipes using it (for rarity-ranked fallback queries). */
  df: Map<string, number>
} | null = null

function ownTermsOf(entry: RecipeLayoutEntry | undefined): string[] {
  if (!entry) return []
  const terms = [...(entry.searchTerms ?? []), ...(entry.ingredientNames ?? [])]
  return [...new Set(terms.map((t) => t.toLowerCase()).filter((t) => t.length > 2))]
}

async function getRecipeSearchIndex() {
  const recipes = (await getRecipes()) as RecipePublished[]
  if (memo && memoSource === recipes) return memo

  const published = recipes.filter((r) => r.published !== false)
  const entries = new Map(published.map((r) => [recipeSlug(r), toLayoutRecipe(r)]))
  const index = new MiniSearch({
    fields: ['title', 'searchTerms', 'ingredientNames'],
    extractField: (doc, fieldName) => {
      const value = (doc as Record<string, unknown>)[fieldName]
      return Array.isArray(value) ? value.join(' ') : String(value ?? '')
    },
  })
  index.addAll(
    published.map((r) => ({
      id: recipeSlug(r),
      title: r.title,
      searchTerms: r.searchTerms,
      ingredientNames: r.ingredientNames,
    }))
  )

  const df = new Map<string, number>()
  for (const entry of entries.values()) {
    for (const term of ownTermsOf(entry)) df.set(term, (df.get(term) ?? 0) + 1)
  }

  memoSource = recipes
  memo = { index, entries, df }
  return memo
}

/**
 * Top `limit` recipes matching a title (recipe detail page and the magazine
 * ReceptsarokWidget). When the title alone matches nothing (compound-word
 * titles like „Csicsókaleves”) and `exclude` names a recipe, retry once with
 * that recipe's own searchTerms.
 */
export async function similarRecipesFor(
  title: string,
  exclude?: Pick<Recipe, 'year' | 'id'>,
  limit = 4
): Promise<RecipeLayoutEntry[]> {
  const { index, entries, df } = await getRecipeSearchIndex()
  const excludeId = exclude ? recipeSlug(exclude) : null

  const pick = (query: string): RecipeLayoutEntry[] =>
    index
      .search(query, SEARCH_OPTIONS)
      .filter((hit) => hit.id !== excludeId)
      .slice(0, limit)
      .map((hit) => entries.get(hit.id as string))
      .filter((entry): entry is RecipeLayoutEntry => Boolean(entry))

  let hits = title?.trim() ? pick(title) : []
  if (hits.length === 0 && excludeId) {
    // Compound-word titles („Csicsókaleves”) match nothing on their own —
    // retry with the recipe's rarest own terms (corpus document frequency),
    // so a distinctive ingredient (csicsóka) is not outvoted by pantry
    // staples (só, étolaj) that co-occur in hundreds of other recipes.
    const sorted = ownTermsOf(entries.get(excludeId))
      .filter((t) => (df.get(t) ?? 0) > 1) // df 1 = only this recipe; matches nothing
      .sort((a, b) => (df.get(a) ?? 0) - (df.get(b) ?? 0))
    const baseDf = sorted.length ? (df.get(sorted[0]) ?? 0) : 0
    // Keep only terms about as rare as the rarest one, so a distinctive
    // ingredient is not diluted by terms shared with hundreds of recipes.
    const rarest = sorted
      .filter((t) => (df.get(t) ?? 0) <= Math.max(baseDf * 5, 10))
      .slice(0, 3)
    if (rarest.length) hits = pick(rarest.join(' '))
  }
  return hits
}
