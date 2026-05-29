import type { PageServerLoad } from './$types'
import { getReceptsarokCategory } from '$lib/receptsarokFirestore'

export const load: PageServerLoad = async ({ params }) => {
  const { cards, count } = await getReceptsarokCategory(params.category)
  return {
    categoryId: params.category,
    cards,
    count,
  }
}
