/**
 * Recipe `authorSlug`: the `authors/{slug}` profile a recipe's free-text `author`
 * name belongs to — the recipe-side twin of a magazine doc's `tv.szerzo[].slug` /
 * `authorSlugs`, resolved at sync time the same way (`$lib/authorMatch.js`), so
 * page views need no lookup. The recipe page links the byline to `/szerzok/{slug}`
 * (else to `/keres?q=…`) and shows that author's signature box; the profile page
 * lists the author's recipes by this slug.
 *
 * Recomputed for every recipe on each `sync:modx*` run (like `relatedCards`), so a
 * new recipe, an edited `author` or a new author record lands on the next sync.
 * One-off: `node scripts/backfill-recipe-author-slugs.mjs [--apply]`.
 */
import fs from 'node:fs'
import { FieldValue } from 'firebase-admin/firestore'
import { stringifyRecipesJson } from '../../src/lib/recipesJsonFormat.js'
import { buildAuthorSlugIndex, recipeAuthorSlug } from '../../src/lib/authorMatch.js'

const recipeKey = (year, id) => `${year}-${id}`

/**
 * Set / remove `authorSlug` on every recipe in place.
 * @param {Record<string, any>[]} recipes recipes.json entries (mutated)
 * @param {Record<string, any>[]} authors author records (`collections/authors`)
 * @returns {{ changed: string[] }} keys whose `authorSlug` changed
 */
export function computeRecipeAuthorSlugChanges(recipes, authors) {
  const index = buildAuthorSlugIndex(authors)
  const changed = []
  for (const r of recipes) {
    const next = recipeAuthorSlug(index, r.author)
    const prev = typeof r.authorSlug === 'string' ? r.authorSlug : ''
    if (prev === next) continue
    if (next) r.authorSlug = next
    else delete r.authorSlug
    changed.push(recipeKey(r.year, r.id))
  }
  return { changed }
}

/**
 * Recompute `authorSlug` and (when `apply`) write the changed recipes to
 * `recipes.json` + Firestore `recipes/*` (merge). Diff-based: a no-op run writes
 * nothing. Mirrors `syncRecipeRelatedCards`.
 *
 * An empty author list (aggregate unreadable) is treated as "unknown", not as
 * "nobody has a profile": nothing is changed, so a failed read cannot strip every
 * slug.
 *
 * @returns {Promise<{ updated: number; keys: string[] }>}
 */
export async function syncRecipeAuthorSlugs({ recipes, authors, recipesJsonPath, firestore, apply }) {
  if (!Array.isArray(authors) || authors.length === 0) return { updated: 0, keys: [] }
  const { changed } = computeRecipeAuthorSlugChanges(recipes, authors)
  if (changed.length === 0) return { updated: 0, keys: [] }
  if (!apply) return { updated: changed.length, keys: changed }

  const byKey = new Map(recipes.map((r) => [recipeKey(r.year, r.id), r]))
  let batch = firestore.batch()
  let n = 0
  for (const key of changed) {
    const slug = byKey.get(key)?.authorSlug
    batch.set(
      firestore.collection('recipes').doc(key),
      { authorSlug: slug || FieldValue.delete() },
      { merge: true }
    )
    if (++n % 400 === 0) {
      await batch.commit()
      batch = firestore.batch()
    }
  }
  if (n % 400 !== 0) await batch.commit()
  fs.writeFileSync(recipesJsonPath, stringifyRecipesJson(recipes))
  return { updated: changed.length, keys: changed }
}
