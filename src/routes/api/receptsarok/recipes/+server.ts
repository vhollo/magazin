import { gunzipSync } from 'node:zlib'
import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { getAdminBucket } from '$lib/firebase-admin'
import { getRecipes } from '$lib/siteConf'
import { toLayoutRecipe, type Recipe } from '$lib/receptsarok'
import { requireReceptsarokSubscriber } from '$lib/server/receptsarokSubscriber'

/** Built and uploaded by sync:rs-collections (slim RecipeLayoutEntry list, gzip). */
const CATALOG_OBJECT_PATH = 'receptsarok/catalog.json.gz'

/**
 * Meal-planner catalogue for verified subscribers. Slim layout entries only
 * (no instructions/subRecipes/ingredientGroups — the shopping list fetches
 * planned recipes individually via /api/receptsarok/recipe/[year]/[id]).
 * ~190 KB gzipped vs the ~4 MB full catalogue this endpoint used to return.
 */
export const GET: RequestHandler = async ({ request }) => {
  const auth = await requireReceptsarokSubscriber(request)
  if (!auth.ok) return auth.response

  try {
    const [buffer] = await getAdminBucket().file(CATALOG_OBJECT_PATH).download()
    // Decompress here rather than forwarding the gzip bytes with a manual
    // Content-Encoding header: Netlify Functions' Lambda-style transport
    // mangles binary bodies for non-binary Content-Types, which broke the
    // client's gunzip in production (net::ERR_CONTENT_DECODING_FAILED)
    // even though it worked fine against local dev/preview servers.
    const catalog = gunzipSync(buffer)
    return new Response(new Uint8Array(catalog), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch {
    // Storage artifact missing (sync not run yet) — build from the bundled JSON.
  }

  const recipes = (await getRecipes()).filter(
    (r: { published?: boolean }) => r.published !== false
  )
  return json(
    { recipes: recipes.map((r: Recipe) => toLayoutRecipe(r)) },
    { headers: { 'Cache-Control': 'private, max-age=3600' } }
  )
}
