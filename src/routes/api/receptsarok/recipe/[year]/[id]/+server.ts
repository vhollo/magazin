import { error, json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { getRecipes } from '$lib/siteConf'
import type { Recipe } from '$lib/receptsarok'
import { requireReceptsarokSubscriber } from '$lib/server/receptsarokSubscriber'

export const GET: RequestHandler = async ({ request, params }) => {
  const auth = await requireReceptsarokSubscriber(request)
  if (!auth.ok) return auth.response

  const year = Number(params.year)
  if (!Number.isFinite(year) || !/^\d{4}$/.test(params.year)) {
    error(400, { message: 'Érvénytelen év' })
  }
  const id = decodeURIComponent(params.id)

  const recipes = await getRecipes()
  const recipe = recipes.find((r: Recipe) => r.year === year && r.id === id)
  if (!recipe) error(404, { message: 'Recept nem található' })

  return json({ recipe })
}
