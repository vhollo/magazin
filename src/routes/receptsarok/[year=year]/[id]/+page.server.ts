import type { PageServerLoad } from './$types'
import { error } from '@sveltejs/kit'
import { getReceptsarokRecipe } from '$lib/receptsarokFirestore'
import { getRecipes } from '$lib/siteConf'
import { similarRecipesForTitle, toLayoutRecipe, type Recipe } from '$lib/receptsarok'

type RecipePublished = Recipe & { published?: boolean }

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

  const full = (await getRecipes()) as Recipe[]
  const entries = full
    .filter((r: RecipePublished) => r.published !== false)
    .map(toLayoutRecipe)
  const similarRecipes = similarRecipesForTitle(result.recipe.title, entries, {
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
