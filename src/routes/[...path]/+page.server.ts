import { linkedRecipesFor, similarRecipesFor } from '$lib/server/similarRecipes'
import type { RecipeLayoutEntry } from '$lib/receptsarok'
import type { PageServerLoad } from './$types'

type WidgetDoc = {
  title?: string
  redirect?: string
  tv?: { tags?: string[] }
  /** Curated "További receptek" MODX ids, set by the sync transform. */
  linkedModxIds?: number[]
}

export const load: PageServerLoad = async ({ parent }) => {
  const { doc } = await parent()
  const d = doc as WidgetDoc
  if (d?.redirect || !d?.tv?.tags?.includes('recept')) {
    return { rsWidgetRecipes: [] as RecipeLayoutEntry[], rsWidgetLinked: false }
  }
  // The article's own "További receptek" link list wins over similarity search —
  // and all of its recipes are shown, not just 4.
  const linked = d.linkedModxIds?.length ? await linkedRecipesFor(d.linkedModxIds) : []
  const rsWidgetRecipes = linked.length ? linked : await similarRecipesFor(d.title || '')
  return { rsWidgetRecipes, rsWidgetLinked: linked.length > 0 }
}
