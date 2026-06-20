import { linkedRecipesFor, similarRecipesFor } from '$lib/server/similarRecipes'
import { getChildModxIds } from '$lib/magazine/firestore'
import type { RecipeLayoutEntry } from '$lib/receptsarok'
import type { PageServerLoad } from './$types'

type WidgetDoc = {
  id?: number
  isfolder?: boolean | number
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
  // A curated "További receptek" link list wins; otherwise a recipe folder lists its
  // own child recipes (children redirect into the Receptsarok). All are shown, not 4.
  let linkedIds = d.linkedModxIds ?? []
  if (!linkedIds.length && d.isfolder && d.id != null) {
    linkedIds = await getChildModxIds(Number(d.id))
  }
  const linked = linkedIds.length ? await linkedRecipesFor(linkedIds) : []
  const rsWidgetRecipes = linked.length ? linked : await similarRecipesFor(d.title || '')
  return { rsWidgetRecipes, rsWidgetLinked: linked.length > 0 }
}
