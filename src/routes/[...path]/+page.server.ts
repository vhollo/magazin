import { similarRecipesFor } from '$lib/server/similarRecipes'
import type { RecipeLayoutEntry } from '$lib/receptsarok'
import type { PageServerLoad } from './$types'

type WidgetDoc = {
  title?: string
  redirect?: string
  tv?: { tags?: string[] }
}

export const load: PageServerLoad = async ({ parent }) => {
  const { doc } = await parent()
  const d = doc as WidgetDoc
  if (d?.redirect || !d?.tv?.tags?.includes('recept')) {
    return { rsWidgetRecipes: [] as RecipeLayoutEntry[] }
  }
  return { rsWidgetRecipes: await similarRecipesFor(d.title || '') }
}
