import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { getRecipes } from '$lib/siteConf'
import { isRecipeFree } from '$lib/receptsarok'
import { requireReceptsarokSubscriber } from '$lib/server/receptsarokSubscriber'

export const GET: RequestHandler = async ({ request }) => {
  const auth = await requireReceptsarokSubscriber(request)
  if (!auth.ok) return auth.response

  const recipes = (await getRecipes()).filter(
    (r: { published?: boolean }) => r.published !== false
  )
  const withFlags = recipes.map((r: { year: number; free?: boolean }) => ({
    ...r,
    free: isRecipeFree(r),
  }))

  return json({ recipes: withFlags })
}
