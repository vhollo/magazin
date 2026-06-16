import type { PageServerLoad } from './$types'
import { error } from '@sveltejs/kit'
import { getReceptsarokRecipe } from '$lib/receptsarokFirestore'
import { linkedRecipesFor, similarRecipesFor } from '$lib/server/similarRecipes'

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

  // Curated "További receptek" links from the source article win over the
  // title-similarity search — and all of them are shown, not just 4.
  const self = { year: result.recipe.year, id: result.recipe.id }
  const linked = result.recipe.linkedModxIds?.length
    ? await linkedRecipesFor(result.recipe.linkedModxIds, self)
    : []
  const similarRecipes = linked.length
    ? linked
    : await similarRecipesFor(result.recipe.title, self)

  return {
    recipe: result.recipe,
    isFree: result.isFree,
    categoryId: result.recipe.category,
    similarRecipes,
    similarIsLinked: linked.length > 0,
  }
}
