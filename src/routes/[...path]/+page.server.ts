import { linkedRecipesFor, similarRecipesFor } from '$lib/server/similarRecipes'
import { getChildModxIds, getSiblingReceptModxIds } from '$lib/magazine/firestore'
import type { RecipeLayoutEntry } from '$lib/receptsarok'
import type { PageServerLoad } from './$types'

type WidgetDoc = {
  id?: number
  parent?: number
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
  if (d?.redirect) {
    return { rsWidgetRecipes: [] as RecipeLayoutEntry[], rsWidgetLinked: false }
  }

  let linkedIds = d.linkedModxIds ?? []
  if (!linkedIds.length && d.isfolder && d.id != null) {
    linkedIds = await getChildModxIds(Number(d.id))
  }
  // Editorial hub next to `recept` siblings (e.g. hypertonia/1601/nyari-gyumolcsok).
  if (!linkedIds.length && d.id != null && Number.isFinite(d.parent) && d.parent! > 0) {
    linkedIds = await getSiblingReceptModxIds(Number(d.parent), Number(d.id))
  }

  const linked = linkedIds.length ? await linkedRecipesFor(linkedIds) : []
  const isRecept = d?.tv?.tags?.includes('recept')

  if (!linked.length && !isRecept) {
    return { rsWidgetRecipes: [] as RecipeLayoutEntry[], rsWidgetLinked: false }
  }

  const rsWidgetRecipes = linked.length ? linked : await similarRecipesFor(d.title || '')
  return { rsWidgetRecipes, rsWidgetLinked: linked.length > 0 }
}
