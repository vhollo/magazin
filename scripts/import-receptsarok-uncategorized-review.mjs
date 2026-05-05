import fs from 'node:fs'
import path from 'node:path'

const RECIPES_PATH = path.resolve(process.cwd(), 'src/lib/data/recipes.json')
const REVIEW_PATH = path.resolve(process.cwd(), 'src/lib/data/receptsarok-uncategorized-review.json')

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`)
}

function normalizeCategory(value) {
  return String(value ?? '').trim()
}

const recipes = readJson(RECIPES_PATH)
const review = readJson(REVIEW_PATH)

if (!Array.isArray(recipes)) throw new Error('recipes.json must be an array')
if (!Array.isArray(review?.entries)) throw new Error('receptsarok-uncategorized-review.json must contain entries[]')

const recipeByKey = new Map(recipes.map((recipe) => [`${recipe.year}-${recipe.id}`, recipe]))

let inserted = 0
let updated = 0
let skipped = 0

for (const entry of review.entries) {
  const recipe = entry?.recipe && typeof entry.recipe === 'object' ? { ...entry.recipe } : null
  if (!recipe) {
    skipped += 1
    continue
  }

  const category = normalizeCategory(entry?.category || recipe.category)
  if (!category) {
    skipped += 1
    continue
  }

  recipe.category = category
  const key = `${recipe.year}-${recipe.id}`
  if (!key || !recipe.id || !Number.isFinite(Number(recipe.year))) {
    skipped += 1
    continue
  }

  const existing = recipeByKey.get(key)
  if (!existing) {
    recipes.push(recipe)
    recipeByKey.set(key, recipe)
    inserted += 1
    continue
  }

  if (normalizeCategory(existing.category) !== category) {
    existing.category = category
    updated += 1
  } else {
    skipped += 1
  }
}

writeJson(RECIPES_PATH, recipes)
console.log(`Imported uncategorized review: inserted=${inserted}, updated=${updated}, skipped=${skipped}`)
