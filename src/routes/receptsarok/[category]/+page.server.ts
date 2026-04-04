export const prerender = true
import type { PageServerLoad } from './$types'
import { error } from '@sveltejs/kit'

export const load: PageServerLoad = ({ params, parent }) => {
  return { categoryId: params.category }
}
