import { getRecipes } from '$lib/siteConf'
import { toTeaser, type Recipe, type RecipeTeaser } from '$lib/receptsarok'

export const prerender = true

export async function load() {
  const recipes = (await getRecipes()) as Recipe[]
  const recipeTeasersByKey: Record<string, RecipeTeaser> = {}

  for (const recipe of recipes) {
    if (recipe.published === false) continue
    recipeTeasersByKey[`${recipe.year}/${recipe.id}`] = toTeaser(recipe)
  }

  return {
    doc: { path: 'keres', title: 'Keresés' },
    recipeTeasersByKey,
  }
}
