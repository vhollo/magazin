export const prerender = true
import { dev } from '$app/environment'
import type { LayoutServerLoad } from './$types'
import { getRecipes, getCategories } from '$lib/siteConf'
import { toLayoutRecipe } from '$lib/receptsarok'
import type { Recipe, Category } from '$lib/receptsarok'

type RecipePublished = Recipe & { published?: boolean }

export const load: LayoutServerLoad = async () => {
  const allRecipes: Recipe[] = (await getRecipes()).filter(
    (r: Recipe) => (r as RecipePublished).published !== false
  )
  const categories: Category[] = await getCategories()

  const recipeCounts: Record<string, number> = {}
  for (const r of allRecipes) {
    recipeCounts[r.category] = (recipeCounts[r.category] || 0) + 1
  }
  for (const cat of categories) {
    cat.recipeCount = recipeCounts[cat.id] || 0
  }

  if (dev) console.log('receptsarok:', allRecipes.length, 'recipes in', categories.length, 'categories')

  return {
    recipes: allRecipes.map(toLayoutRecipe),
    categories,
    doc: { path: 'receptsarok', title: 'Receptsarok' },
  }
}
