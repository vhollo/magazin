export const prerender = true
import type { PageServerLoad } from './$types'
import { error } from '@sveltejs/kit'
import { getRecipes } from '$lib/siteConf'
import { isRecipeFree, stripRecipeGatedFields } from '$lib/receptsarok'
import type { Recipe } from '$lib/receptsarok'

export const load: PageServerLoad = async ({ params, parent }) => {
  const { recipes, categories } = await parent()
  const year = Number(params.year)
  if (!Number.isFinite(year) || year !== parseInt(params.year, 10)) {
    error(404, { message: `Érvénytelen év: ${params.year}` })
  }
  const id = decodeURIComponent(params.id)
  const known = recipes.some((r) => r.year === year && r.id === id)
  if (!known) {
    error(404, { message: `Recept nem található: ${params.year}/${params.id}` })
  }

  const all = (await getRecipes()) as Recipe[]
  const recipe = all.find((r) => r.year === year && r.id === id)
  if (!recipe) {
    error(404, { message: `Recept nem található: ${params.year}/${params.id}` })
  }

  const isFree = isRecipeFree(recipe)
  const withFree = { ...recipe, free: isFree }
  return {
    recipes,
    categories,
    recipe: isFree ? withFree : stripRecipeGatedFields(withFree),
    isFree,
    categoryId: recipe.category,
  }
}
