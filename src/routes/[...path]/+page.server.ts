import { getRecipes } from '$lib/siteConf'
import {
  similarRecipesForTitle,
  toLayoutRecipe,
  type Recipe,
  type RecipeLayoutEntry,
} from '$lib/receptsarok'
import type { PageServerLoad } from './$types'

type WidgetDoc = {
  title?: string
  redirect?: string
  tv?: { tags?: string[] }
}

type RecipePublished = Recipe & { published?: boolean }

export const load: PageServerLoad = async ({ parent }) => {
  const { doc } = await parent()
  const d = doc as WidgetDoc
  if (d?.redirect || !d?.tv?.tags?.includes('recept')) {
    return { rsWidgetRecipes: [] as RecipeLayoutEntry[] }
  }
  const full = (await getRecipes()) as Recipe[]
  const entries = full
    .filter((r: Recipe) => (r as RecipePublished).published !== false)
    .map(toLayoutRecipe)
  return { rsWidgetRecipes: similarRecipesForTitle(d.title || '', entries) }
}
