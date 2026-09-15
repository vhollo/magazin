import {
  linkedRecipesFor,
  similarRecipesFor,
  relatedRecipesByKey,
  recipesBySourceModxId,
} from '$lib/server/similarRecipes'
import { getChildModxIds, getSiblingReceptModxIds } from '$lib/magazine/firestore'
import type { RecipeLayoutEntry } from '$lib/receptsarok'
import type { PageServerLoad } from './$types'

type WidgetDoc = {
  id?: number
  parent?: number
  isfolder?: boolean | number
  path?: string
  title?: string
  content?: string
  redirect?: string
  tv?: { tags?: string[] }
  /** Curated "További receptek" MODX ids, set by the sync transform. */
  linkedModxIds?: number[]
  /** Precomputed recipe-group keys (`{year}-{id}`), set at sync. */
  related?: string[]
}

export const load: PageServerLoad = async ({ parent }) => {
  const { doc } = await parent()
  const d = doc as WidgetDoc
  if (d?.redirect) {
    return { rsWidgetRecipes: [] as RecipeLayoutEntry[], rsWidgetLinked: false }
  }

  // Precomputed recipe link group wins (e.g. an editorial hub whose body lists
  // its sibling recipes). Falls through to runtime detection when unset.
  if (d.related?.length) {
    const relatedCards = await relatedRecipesByKey(d.related)
    if (relatedCards.length) {
      return { rsWidgetRecipes: relatedCards, rsWidgetLinked: true }
    }
  }

  // A multi-recipe collection article ("gyűjtőcikk") relates to the dishes split
  // out of its own body (recipe.sourceModxId == this doc's id) — mirrors the sync.
  if (d.id != null) {
    const derived = await recipesBySourceModxId(Number(d.id))
    if (derived.length) {
      return { rsWidgetRecipes: derived, rsWidgetLinked: true }
    }
  }

  let linkedIds = d.linkedModxIds ?? []
  if (!linkedIds.length && d.isfolder && d.id != null) {
    linkedIds = await getChildModxIds(Number(d.id))
  }
  // Editorial hub *linking* its `recept` siblings (e.g. hypertonia/1601/nyari-gyumolcsok).
  // The body link is required: a leaf's MODX parent is its magazine issue folder, so
  // without it every article in an issue would inherit that issue's recipes.
  if (!linkedIds.length && d.id != null && Number.isFinite(d.parent) && d.parent! > 0) {
    linkedIds = await getSiblingReceptModxIds(
      Number(d.parent),
      Number(d.id),
      d.path ?? '',
      d.content ?? ''
    )
  }

  const linked = linkedIds.length ? await linkedRecipesFor(linkedIds) : []
  const isRecept = d?.tv?.tags?.includes('recept')

  if (!linked.length && !isRecept) {
    return { rsWidgetRecipes: [] as RecipeLayoutEntry[], rsWidgetLinked: false }
  }

  const rsWidgetRecipes = linked.length ? linked : await similarRecipesFor(d.title || '')
  return { rsWidgetRecipes, rsWidgetLinked: linked.length > 0 }
}
