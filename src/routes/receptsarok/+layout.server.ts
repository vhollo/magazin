export const prerender = true
import type { LayoutServerLoad } from './$types'
import { getRecipes, getCategories } from '$lib/siteConf'
import { isRecipeFree } from '$lib/receptsarok'
import type { Recipe, Category } from '$lib/receptsarok'

const allRecipes: Recipe[] = await getRecipes()
const categories: Category[] = await getCategories()

const recipeCounts: Record<string, number> = {}
for (const r of allRecipes) {
  recipeCounts[r.category] = (recipeCounts[r.category] || 0) + 1
}
for (const cat of categories) {
  cat.recipeCount = recipeCounts[cat.id] || 0
}

console.log('receptsarok:', allRecipes.length, 'recipes in', categories.length, 'categories')

export const load: LayoutServerLoad = () => {
  const recipes = allRecipes.map(r => ({
    ...r,
    free: isRecipeFree(r)
  }))
  return {
    recipes,
    categories,
    doc: { path: 'receptsarok', title: 'Receptsarok' }
  }
}
