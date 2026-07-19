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
  const recipe = result.recipe

  // Related/similar recipes are secondary (rendered below the recipe) and the
  // slowest part of this load — the fallback is a title-similarity search over the
  // recipe index. STREAM it: the promise is returned unawaited so a cold render
  // sends the recipe HTML immediately and the recommendations fill in afterwards
  // via `{#await data.similar}` (see +page.svelte). The critical recipe (needed for
  // the 404 check and the page body) stays awaited above.
  async function resolveSimilar() {
    // Curated related recipes win over the title-similarity search — and all of
    // them are shown, not just 4. Precomputed `relatedCards` (the recipe's link
    // group) first, then the legacy runtime resolution of `linkedModxIds`.
    const self = { year: recipe.year, id: recipe.id }
    const related = recipe.relatedCards?.length
      ? await relatedRecipesByKey(recipe.relatedCards, self)
      : []
    const linked =
      !related.length && recipe.linkedModxIds?.length
        ? await linkedRecipesFor(recipe.linkedModxIds, self)
        : []
    let curated = related.length ? related : linked
    // Co-derived siblings: other dishes split out of the same collection article.
    if (!curated.length && Number.isFinite(recipe.sourceModxId)) {
      const siblings = (await recipesBySourceModxId(Number(recipe.sourceModxId))).filter(
        (e) => !(e.year === self.year && e.id === self.id)
      )
      if (siblings.length) curated = siblings
    }
    const similarRecipes = curated.length
      ? curated
      : await similarRecipesFor(recipe.title, self)
    return { similarRecipes, similarIsLinked: curated.length > 0 }
  }

  return {
    recipe,
    isFree: result.isFree,
    categoryId: recipe.category,
    // Streamed (Promise) — consumed with `{#await data.similar}` in +page.svelte.
    similar: resolveSimilar(),
  }
}
