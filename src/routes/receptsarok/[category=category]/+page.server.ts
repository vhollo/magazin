export const prerender = true
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = ({ params, parent }) => {
  return { categoryId: params.category }
}
