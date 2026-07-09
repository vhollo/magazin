import fs from 'node:fs'
import { stringifyRecipesJson } from '../../src/lib/recipesJsonFormat.js'
import { buildRecipeFromModxDoc, deriveSyncRecipeAuthor } from './modx-to-rs-parser.mjs'
import { normalizeRecipeIngredientPunctuation } from './normalize-ingredient-punctuation.mjs'

/**
 * Load the manual category-override map (year→category) from
 * `magazin-recipe-category-review.json`. Mirrors `loadCategoryReviewMap` in
 * `src/lib/receptsarokDedupePipeline.js`: entries with an empty `category` are
 * ignored, so a placeholder row (queued for human review) does not resolve.
 *
 * @param {string} categoryReviewPath
 * @returns {Map<string, string>} keyed by both `${year}/${id}` and `${year}-${id}`
 */
export function loadCategoryReviewMap(categoryReviewPath) {
  const data = fs.existsSync(categoryReviewPath)
    ? JSON.parse(fs.readFileSync(categoryReviewPath, 'utf8'))
    : { entries: [] }
  if (!Array.isArray(data?.entries)) {
    throw new Error('magazin-recipe-category-review.json must contain entries array')
  }
  const map = new Map()
  for (const entry of data.entries) {
    const year = Number(entry?.year)
    const id = String(entry?.id ?? '').trim()
    const category = String(entry?.category ?? '').trim()
    if (!Number.isFinite(year) || !id || !category) continue
    map.set(`${year}/${id}`, category)
    map.set(`${year}-${id}`, category)
  }
  return map
}

/**
 * Build a Receptsarok recipe from a single-tag `recept` MODX doc that has no
 * existing Receptsarok match. PURE: no Firestore / filesystem writes — the
 * caller sets the doc's redirect from the returned `redirect` and batches the
 * side-effects via {@link persistCreatedRecipes}.
 *
 * @param {any} doc — transformed MODX doc (addTVs/findPath/nagyito/alapjav already applied)
 * @param {object} ctx
 * @param {Record<string, any>[]} ctx.recipes — current recipes (existence check)
 * @param {Map<string, string>} ctx.categoryByKey — manual category overrides
 * @param {(input: any) => { resolved: boolean; category: string | null }} ctx.predictCategory
 * @param {Set<string>} [ctx.createdKeys] — `${year}-${id}` already created this run
 * @returns {{ resolved: true; recipe: any; redirect: string; dynamicEntry: object; key: string }
 *   | { uncategorized: { year: number; id: string; title: string } }
 *   | null}
 */
export function buildReceptsarokRecipeForDoc(doc, { recipes, categoryByKey, predictCategory, createdKeys }) {
  let recipe
  let categoryDecision
  try {
    ;({ recipe, categoryDecision } = buildRecipeFromModxDoc(doc, { categoryByKey, predictCategory }))
  } catch (error) {
    console.warn(`  receptsarok create: build failed for MODX id=${doc?.id}: ${error?.message ?? error}`)
    return null
  }

  const year = Number(recipe?.year)
  const id = String(recipe?.id ?? '').trim()
  if (!id || !Number.isFinite(year)) return null

  const key = `${year}-${id}`
  if (createdKeys?.has(key)) return null
  if (recipes.some((r) => `${r.year}-${r.id}` === key)) return null

  // Author follows the sync-create priority (szerzo TV → alairas → description-"receptje" → '').
  recipe.author = deriveSyncRecipeAuthor(doc)

  if (!categoryDecision?.resolved || !recipe.category) {
    return { uncategorized: { year, id, title: recipe.title ?? '' } }
  }

  recipe.published = true
  normalizeRecipeIngredientPunctuation(recipe)

  const redirect = `/receptsarok/${year}/${encodeURIComponent(id)}`
  const dynamicEntry = {
    modxContentId: Number(doc.id),
    path: String(doc.path ?? '').trim().replace(/^\/+/, ''),
    year,
    id,
  }
  return { resolved: true, recipe, redirect, dynamicEntry, key }
}

/**
 * Append newly-created recipes to `recipes` (dedup by `${year}-${id}`), write
 * each to Firestore `recipes/{year}-{id}` (same doc shape as `sync:recipes`),
 * and persist `recipes.json`. Mirrors the write pattern of
 * `receptsarok-modx-free-sync.mjs`.
 *
 * @param {object} options
 * @param {Record<string, any>[]} options.createdRecipes
 * @param {Record<string, any>[]} options.recipes — mutable array from recipes.json
 * @param {string} options.recipesJsonPath
 * @param {import('firebase-admin/firestore').Firestore} options.firestore
 * @param {boolean} options.apply
 * @returns {Promise<{ created: number; keys: string[]; entries: { year: number; id: string }[] }>}
 */
export async function persistCreatedRecipes({ createdRecipes, recipes, recipesJsonPath, firestore, apply }) {
  if (!Array.isArray(createdRecipes) || createdRecipes.length === 0) {
    return { created: 0, keys: [], entries: [] }
  }

  // Dedup against existing recipes AND within this batch (defensive: `createdKeys`
  // already prevents building the same key twice upstream).
  const seen = new Set(recipes.map((r) => `${r.year}-${r.id}`))
  const toAdd = []
  for (const recipe of createdRecipes) {
    const key = `${recipe.year}-${recipe.id}`
    if (seen.has(key)) continue
    seen.add(key)
    toAdd.push(recipe)
    recipes.push(recipe)
  }

  const keys = toAdd.map((r) => `${r.year}-${r.id}`)
  const entries = toAdd.map((r) => ({ year: Number(r.year), id: String(r.id) }))
  if (!apply || toAdd.length === 0) return { created: toAdd.length, keys, entries }

  let batch = firestore.batch()
  let batchCount = 0
  for (const recipe of toAdd) {
    batch.set(firestore.collection('recipes').doc(`${recipe.year}-${recipe.id}`), recipe)
    batchCount += 1
    if (batchCount % 400 === 0) {
      await batch.commit()
      batch = firestore.batch()
    }
  }
  if (batchCount % 400 !== 0) await batch.commit()

  fs.writeFileSync(recipesJsonPath, stringifyRecipesJson(recipes))
  return { created: toAdd.length, keys, entries }
}

/**
 * Append docs whose category the predictor could not resolve to the manual
 * review file `magazin-recipe-category-review.json` with an empty `category`
 * for a human to fill in. The GitHub Action commits + pushes this file. Once a
 * category is set and the article is re-saved, the manual override resolves and
 * the recipe is created on the next sync.
 *
 * @param {object} options
 * @param {{ year: number; id: string; title: string }[]} options.uncategorized
 * @param {string} options.categoryReviewPath
 * @param {boolean} options.apply
 * @returns {{ added: number; keys: string[] }}
 */
export function appendUncategorizedReview({ uncategorized, categoryReviewPath, apply }) {
  if (!Array.isArray(uncategorized) || uncategorized.length === 0) {
    return { added: 0, keys: [] }
  }

  const data = fs.existsSync(categoryReviewPath)
    ? JSON.parse(fs.readFileSync(categoryReviewPath, 'utf8'))
    : { entries: [] }
  if (!Array.isArray(data.entries)) data.entries = []

  const existing = new Set(
    data.entries.map((e) => `${Number(e?.year)}-${String(e?.id ?? '').trim()}`)
  )
  const keys = []
  for (const u of uncategorized) {
    const key = `${u.year}-${u.id}`
    if (existing.has(key)) continue
    data.entries.push({ year: u.year, id: u.id, title: u.title ?? '', category: '' })
    existing.add(key)
    keys.push(key)
  }

  if (apply && keys.length > 0) {
    fs.writeFileSync(categoryReviewPath, `${JSON.stringify(data, null, 2)}\n`)
  }
  return { added: keys.length, keys }
}
