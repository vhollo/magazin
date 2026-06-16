import { error, json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { db } from '$lib/firebase-admin'
import { getRecipes } from '$lib/siteConf'
import { recipeSlug, type Recipe } from '$lib/receptsarok'
import { requireReceptsarokSubscriber } from '$lib/server/receptsarokSubscriber'

type RecipePublished = Recipe & { published?: boolean }

/**
 * Full (ungated) recipe for verified subscribers. Reads the Firestore doc
 * directly — one read, and fresh after every sync without a redeploy; the
 * bundled recipes.json is only a fallback for environments without sync.
 */
export const GET: RequestHandler = async ({ request, params }) => {
  const auth = await requireReceptsarokSubscriber(request)
  if (!auth.ok) return auth.response

  const year = Number(params.year)
  if (!Number.isFinite(year) || !/^\d{4}$/.test(params.year)) {
    error(400, { message: 'Érvénytelen év' })
  }
  const id = decodeURIComponent(params.id)

  let recipe: RecipePublished | null = null
  try {
    const snap = await db.collection('recipes').doc(recipeSlug({ year, id })).get()
    if (snap.exists) recipe = snap.data() as RecipePublished
  } catch {
    // Firestore unavailable — fall back to the bundled catalogue below.
  }

  if (!recipe) {
    const recipes = await getRecipes()
    recipe = recipes.find((r: Recipe) => r.year === year && r.id === id) ?? null
  }

  if (!recipe || recipe.published === false) error(404, { message: 'Recept nem található' })

  return json({ recipe })
}
