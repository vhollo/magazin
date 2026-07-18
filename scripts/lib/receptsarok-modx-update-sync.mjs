import fs from 'node:fs'
import { FieldValue } from 'firebase-admin/firestore'
import { stringifyRecipesJson } from '../../src/lib/recipesJsonFormat.js'
import { buildRecipeFromModxDoc, deriveSyncRecipeAuthor } from './modx-to-rs-parser.mjs'
import { normalizeRecipeIngredientPunctuation } from './normalize-ingredient-punctuation.mjs'

/**
 * Fields the MODX→RS parser fully derives from the article body + pageimage. MODX is
 * the editing surface for these, so a re-saved recipe article pushes their new values
 * through to an already-existing recipe (e.g. a pageimage added after import).
 *
 * Deliberately excluded (curated / identity — never overwritten by the update path):
 *   `id`, `year`             — the recipe key (`recipes/{year}-{id}`); changing it would
 *                              orphan the recipe instead of updating it.
 *   `category`               — predicted/curated at create time + fixed via the manual
 *                              `magazin-recipe-category-review.json` map, not a MODX field.
 *   `free`, `published`      — set by the free-sync / dedupe pipeline.
 *   `createdAt`, `sourceModxId` — original provenance.
 * `updatedAt` is refreshed only when a content field actually changed.
 */
export const MODX_AUTHORITATIVE_RECIPE_FIELDS = [
  'title',
  'author',
  'servings',
  'energy',
  'protein',
  'fat',
  'saturatedFat',
  'carbs',
  'fiber',
  'nutritionTables',
  'ingredientGroups',
  'ingredientNames',
  'searchTerms',
  'instructions',
  'img',
  'subRecipes',
  'hasSubRecipes',
  'video',
  'linkedModxIds',
]

/** Order-independent deep serialization (object keys sorted, array order preserved). */
function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  const keys = Object.keys(value).sort()
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`
}

/** `null` and `undefined` both mean “no value” — treated as equal (avoids null↔absent churn). */
function isNone(value) {
  return value === null || value === undefined
}

function fieldsEqual(a, b) {
  if (isNone(a) && isNone(b)) return true
  if (isNone(a) || isNone(b)) return false
  return stableStringify(a) === stableStringify(b)
}

/**
 * Re-derive an EXISTING Receptsarok recipe from its (re-saved) source MODX doc and
 * compute the changed MODX-authoritative content fields. PURE: no Firestore /
 * filesystem writes — the caller batches the side-effects via {@link persistUpdatedRecipes}.
 *
 * The recipe is built pinned to the existing `target.id`/`target.year` so the key never
 * moves; author follows the sync-create derivation ({@link deriveSyncRecipeAuthor}) so a
 * re-derive can't drift from how the recipe was originally created.
 *
 * @param {any} doc — transformed MODX doc (addTVs/findPath/nagyito/alapjav already applied)
 * @param {object} ctx
 * @param {{ year: number | string; id: string }} ctx.target — the existing recipe to update
 * @param {Map<string, string>} ctx.categoryByKey — manual category overrides
 * @param {(input: any) => { resolved: boolean; category: string | null }} ctx.predictCategory
 * @returns {{ key: string; patch: Record<string, unknown>; setFields: Record<string, unknown>;
 *   deletedFields: string[]; changedFields: string[] } | null}
 */
export function buildReceptsarokRecipeUpdateForDoc(doc, { target, categoryByKey, predictCategory }) {
  const year = Number(target?.year)
  const id = String(target?.id ?? '').trim()
  if (!id || !Number.isFinite(year)) return null

  let recipe
  try {
    ;({ recipe } = buildRecipeFromModxDoc(doc, { id, year, categoryByKey, predictCategory }))
  } catch (error) {
    console.warn(`  receptsarok update: build failed for MODX id=${doc?.id}: ${error?.message ?? error}`)
    return null
  }
  recipe.author = deriveSyncRecipeAuthor(doc)
  normalizeRecipeIngredientPunctuation(recipe)

  /** @type {Record<string, unknown>} Firestore merge patch (may hold FieldValue.delete()). */
  const patch = {}
  /** @type {Record<string, unknown>} values to assign onto the in-memory recipe. */
  const setFields = {}
  /** @type {string[]} keys to delete from the in-memory recipe. */
  const deletedFields = []
  /** @type {string[]} */
  const changedFields = []

  for (const field of MODX_AUTHORITATIVE_RECIPE_FIELDS) {
    const fresh = recipe[field]
    const stored = target[field]
    if (fieldsEqual(fresh, stored)) continue
    changedFields.push(field)
    if (isNone(fresh)) {
      // MODX removed the value (e.g. pageimage cleared) and the stored recipe had a
      // real one → delete the field on both sides.
      patch[field] = FieldValue.delete()
      deletedFields.push(field)
    } else {
      patch[field] = fresh
      setFields[field] = fresh
    }
  }

  if (changedFields.length === 0) return null

  // Refresh `updatedAt` from the doc's edit time, but only alongside a real content change.
  if (recipe.updatedAt && recipe.updatedAt !== target.updatedAt) {
    patch.updatedAt = recipe.updatedAt
    setFields.updatedAt = recipe.updatedAt
  }

  return { key: `${year}-${id}`, patch, setFields, deletedFields, changedFields }
}

/**
 * Apply recipe updates built by {@link buildReceptsarokRecipeUpdateForDoc}: mutate the
 * in-memory `recipes` array, merge-write each changed `recipes/{year}-{id}` doc, and
 * persist `recipes.json`. Mirrors the write pattern of `receptsarok-modx-free-sync.mjs`.
 *
 * @param {object} options
 * @param {{ key: string; patch: Record<string, unknown>; setFields: Record<string, unknown>;
 *   deletedFields: string[]; changedFields: string[] }[]} options.updates
 * @param {Record<string, any>[]} options.recipes — mutable array from recipes.json
 * @param {string} options.recipesJsonPath
 * @param {import('firebase-admin/firestore').Firestore} options.firestore
 * @param {boolean} options.apply — write Firestore + recipes.json
 * @returns {Promise<{ updated: number; keys: string[] }>}
 */
export async function persistUpdatedRecipes({ updates, recipes, recipesJsonPath, firestore, apply }) {
  if (!Array.isArray(updates) || updates.length === 0) {
    return { updated: 0, keys: [] }
  }

  const byKey = new Map(recipes.map((r) => [`${r.year}-${r.id}`, r]))
  const applied = []
  let batch = firestore.batch()
  let batchCount = 0

  for (const update of updates) {
    const target = byKey.get(update.key)
    if (!target) continue
    Object.assign(target, update.setFields)
    for (const field of update.deletedFields) delete target[field]
    applied.push(update.key)
    if (!apply) continue

    batch.set(firestore.collection('recipes').doc(update.key), update.patch, { merge: true })
    batchCount += 1
    if (batchCount % 400 === 0) {
      await batch.commit()
      batch = firestore.batch()
    }
  }

  if (apply && batchCount % 400 !== 0) await batch.commit()
  if (apply && applied.length > 0) {
    fs.writeFileSync(recipesJsonPath, stringifyRecipesJson(recipes))
  }

  return { updated: applied.length, keys: applied }
}
