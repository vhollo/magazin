/**
 * Correct Receptsarok recipe years for MODX-imported recipes using data.json paths/content.
 *
 * Compares sourceModxId recipes and redirect entries against MODX docs; rs-winner links
 * to existing booklet recipes are left unchanged.
 *
 * Usage: node scripts/fix-modx-recipe-years.mjs [--apply]
 */
import fs from 'node:fs'
import path from 'node:path'
import { buildRecipeFromModxDoc, parseIssueCodeYear } from '../src/lib/modxToRsParser.js'

const root = process.cwd()
const apply = process.argv.includes('--apply')

const DATA_PATH = path.resolve(root, 'src/lib/data/data.json')
const RECIPES_PATH = path.resolve(root, 'src/lib/data/recipes.json')
const REDIRECTS_PATH = path.resolve(root, 'src/lib/data/receptsarok-redirects.json')
const AUDIT_PATH = path.resolve(root, 'src/lib/data/receptsarok-dedupe-audit.json')

const EXTRA_JSON_PATHS = [
  'src/lib/data/receptsarok-create-review.json',
  'src/lib/data/receptsarok-uncategorized-review.json',
  'src/lib/data/.import-magazin-recipes-state.json',
]

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`)
}

function replaceRecipeKey(value, fromKey, toKey) {
  if (typeof value === 'string') {
    return value.replaceAll(fromKey, toKey).replaceAll(fromKey.replace('-', '/'), toKey.replace('-', '/'))
  }
  if (Array.isArray(value)) return value.map((item) => replaceRecipeKey(item, fromKey, toKey))
  if (value && typeof value === 'object') {
    const out = {}
    for (const [key, nested] of Object.entries(value)) {
      const nextKey = key === fromKey ? toKey : key.replaceAll(fromKey, toKey)
      out[nextKey] = replaceRecipeKey(nested, fromKey, toKey)
    }
    return out
  }
  return value
}

if (!fs.existsSync(DATA_PATH)) {
  console.error(`Missing ${DATA_PATH} — export MODX recept docs first (see sync or manual export).`)
  process.exit(1)
}

const docs = readJson(DATA_PATH)
if (!Array.isArray(docs)) {
  console.error('data.json must be an array')
  process.exit(1)
}

const docById = new Map(docs.map((doc) => [Number(doc.id), doc]))
const recipes = readJson(RECIPES_PATH)
const redirects = readJson(REDIRECTS_PATH)
const audit = fs.existsSync(AUDIT_PATH) ? readJson(AUDIT_PATH) : { entries: [] }

const rsWinnerKeys = new Set(
  (Array.isArray(audit.entries) ? audit.entries : [])
    .filter((entry) => entry.type === 'rs-winner')
    .map((entry) => String(entry.winner ?? ''))
)

/** Expected RS year for a new MODX import (not an existing booklet rs-winner). */
function expectedModxImportYear(doc, recipe) {
  if (!doc) return null

  const assetHint = [recipe?.image?.src, recipe?.img?.src].filter(Boolean).join(' ')
  const fromAssets = parseIssueCodeYear(assetHint)
  if (fromAssets) return fromAssets

  const { recipe: parsed } = buildRecipeFromModxDoc(doc, {
    id: String(recipe?.id || doc.alias || 'x'),
    categoryByKey: new Map(),
  })
  return Number.isFinite(parsed?.year) ? parsed.year : null
}

const yearChanges = new Map()

for (const recipe of recipes) {
  if (!Number.isFinite(recipe?.sourceModxId)) continue
  const oldKey = `${recipe.year}-${recipe.id}`
  if (rsWinnerKeys.has(oldKey)) continue

  const doc = docById.get(Number(recipe.sourceModxId))
  const expected = expectedModxImportYear(doc, recipe)
  if (!expected || recipe.year === expected) continue

  yearChanges.set(oldKey, { recipe, expected, modxId: recipe.sourceModxId, path: doc?.path ?? null })
}

for (const entry of redirects.entries ?? []) {
  const recipe = recipes.find(
    (r) => Number(r.sourceModxId) === Number(entry.modxContentId) && String(r.id) === String(entry.id)
  )
  if (!recipe) continue
  const oldKey = `${recipe.year}-${recipe.id}`
  if (rsWinnerKeys.has(oldKey)) continue
  const change = yearChanges.get(oldKey)
  if (change && entry.year !== change.expected) {
    change.redirectYear = entry.year
  }
}

if (yearChanges.size === 0) {
  console.log('No MODX-import recipe year corrections needed.')
  process.exit(0)
}

console.log(`Found ${yearChanges.size} MODX-import recipes to re-year:`)
for (const [oldKey, change] of [...yearChanges.entries()].sort()) {
  console.log(`  ${oldKey} → ${change.expected}-${change.recipe.id}  (${change.path ?? 'no path'})`)
}

if (!apply) {
  console.log('\nDry run — pass --apply to write recipes.json, redirects.json, and related keys.')
  process.exit(0)
}

const recipeByKey = new Map(recipes.map((r) => [`${r.year}-${r.id}`, r]))

for (const [oldKey, change] of yearChanges.entries()) {
  const recipe = recipeByKey.get(oldKey)
  if (!recipe) continue
  const newKey = `${change.expected}-${recipe.id}`
  if (recipeByKey.has(newKey) && newKey !== oldKey) {
    console.error(`Collision: ${newKey} already exists — skip ${oldKey}`)
    continue
  }
  recipe.year = change.expected
  recipeByKey.delete(oldKey)
  recipeByKey.set(newKey, recipe)
}

writeJson(RECIPES_PATH, recipes)

for (const entry of redirects.entries ?? []) {
  const change = [...yearChanges.values()].find(
    (c) => Number(c.modxId) === Number(entry.modxContentId) && String(c.recipe.id) === String(entry.id)
  )
  if (change) entry.year = change.expected
}
writeJson(REDIRECTS_PATH, redirects)

for (const relPath of EXTRA_JSON_PATHS) {
  const filePath = path.resolve(root, relPath)
  if (!fs.existsSync(filePath)) continue
  let payload = readJson(filePath)
  for (const [oldKey, change] of yearChanges.entries()) {
    const newKey = `${change.expected}-${change.recipe.id}`
    payload = replaceRecipeKey(payload, oldKey, newKey)
  }
  writeJson(filePath, payload)
}

console.log(`Applied ${yearChanges.size} year corrections.`)
