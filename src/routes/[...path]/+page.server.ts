export const prerender = true

import { getRecipes } from '$lib/siteConf'
import { toLayoutRecipe, type Recipe, type RecipeLayoutEntry } from '$lib/receptsarok'
import type { PageServerLoad } from './$types'

function widgetMatchesForDoc(doc: { title?: string; tv?: { tags?: string[] } }, entries: RecipeLayoutEntry[]): RecipeLayoutEntry[] {
  if (!doc?.tv?.tags?.includes('recept')) return []
  const titleWords = (doc.title || '').toLowerCase().split(/\s+/)
  return entries
    .filter(
      (r) =>
        r.searchTerms?.some((t) => titleWords.some((w) => w.length > 3 && t.includes(w))) ||
        r.ingredientNames?.some((n) => titleWords.some((w) => w.length > 3 && n.includes(w)))
    )
    .slice(0, 4)
}

export const load: PageServerLoad = async ({ parent }) => {
  const { doc } = await parent()
  const d = doc as { title?: string; tv?: { tags?: string[] } }
  if (!d?.tv?.tags?.includes('recept')) {
    return { rsWidgetRecipes: [] as RecipeLayoutEntry[] }
  }
  const full = (await getRecipes()) as Recipe[]
  const entries = full.map(toLayoutRecipe)
  return { rsWidgetRecipes: widgetMatchesForDoc(d, entries) }
}
