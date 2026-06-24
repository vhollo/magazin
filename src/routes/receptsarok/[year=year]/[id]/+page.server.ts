import type { PageServerLoad } from './$types'
import { error } from '@sveltejs/kit'
import { getReceptsarokRecipe } from '$lib/receptsarokFirestore'
import {
  linkedRecipesFor,
  similarRecipesFor,
  relatedRecipesByKey,
  recipesBySourceModxId,
} from '$lib/server/similarRecipes'

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

  // Curated related recipes win over the title-similarity search — and all of
  // them are shown, not just 4. Precomputed `relatedCards` (the recipe's link
  // group) first, then the legacy runtime resolution of `linkedModxIds`.
  const self = { year: result.recipe.year, id: result.recipe.id }
  const related = result.recipe.relatedCards?.length
    ? await relatedRecipesByKey(result.recipe.relatedCards, self)
    : []
  const linked =
    !related.length && result.recipe.linkedModxIds?.length
      ? await linkedRecipesFor(result.recipe.linkedModxIds, self)
      : []
  let curated = related.length ? related : linked
  // Co-derived siblings: other dishes split out of the same collection article.
  if (!curated.length && Number.isFinite(result.recipe.sourceModxId)) {
    const siblings = (await recipesBySourceModxId(Number(result.recipe.sourceModxId))).filter(
      (e) => !(e.year === self.year && e.id === self.id)
    )
    if (siblings.length) curated = siblings
  }
  const similarRecipes = curated.length
    ? curated
    : await similarRecipesFor(result.recipe.title, self)

  return {
    recipe: result.recipe,
    isFree: result.isFree,
    categoryId: result.recipe.category,
    similarRecipes,
    similarIsLinked: curated.length > 0,
  }
}
