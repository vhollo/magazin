import type { PageServerLoad } from './$types'
import { error } from '@sveltejs/kit'
import { getReceptsarokRecipe } from '$lib/receptsarokFirestore'
import { similarRecipesFor } from '$lib/server/similarRecipes'

export const load: PageServerLoad = async ({ params }) => {
  const year = Number(params.year)
  if (!Number.isFinite(year) || year !== parseInt(params.year, 10)) {
    error(404, { message: `Érvénytelen év: ${params.year}` })
  }

  const id = decodeURIComponent(params.id)
  const result = await getReceptsarokRecipe(year, id)
  if (!result.ok) {
    error(404, { message: `Recept nem található: ${params.year}/${params.id}` })
  }

  const similarRecipes = await similarRecipesFor(result.recipe.title, {
    year: result.recipe.year,
    id: result.recipe.id,
  })

  return {
    recipe: result.recipe,
    isFree: result.isFree,
    categoryId: result.recipe.category,
    similarRecipes,
  }
}
