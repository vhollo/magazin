export const prerender = true
import type { PageServerLoad } from './$types'
import { error } from '@sveltejs/kit'
import { isRecipeFree, recipeSlug } from '$lib/receptsarok'

export const load: PageServerLoad = async ({ params, parent }) => {
  const { recipes, categories } = await parent()
  const recipe = recipes.find((r: any) => recipeSlug(r) === params.slug && r.category === params.category)

  if (!recipe) {
    error(404, { message: `Recept nem található: ${params.slug}` })
  }

  return {
    recipes,
    categories,
    recipe,
    isFree: isRecipeFree(recipe),
    categoryId: params.category
  }
}
