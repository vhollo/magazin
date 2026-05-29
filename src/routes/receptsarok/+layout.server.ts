import type { LayoutServerLoad } from './$types'
import { MAGAZINE_CACHE_CONTROL } from '$lib/magazine/cacheHeaders'
import { getReceptsarokHome } from '$lib/receptsarokFirestore'

export const load: LayoutServerLoad = async ({ setHeaders }) => {
  setHeaders({ 'Cache-Control': MAGAZINE_CACHE_CONTROL })
  const { categories, totalRecipes, totalFree, freeCountsByCategory } =
    await getReceptsarokHome()

  return {
    categories,
    totalRecipes,
    totalFree,
    freeCountsByCategory,
    doc: { path: 'receptsarok', title: 'Receptsarok' },
  }
}
