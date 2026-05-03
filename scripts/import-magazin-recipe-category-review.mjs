import fs from 'node:fs'
import path from 'node:path'

const RECIPES_PATH = path.resolve(process.cwd(), 'src/lib/data/recipes.json')
const REVIEW_PATH = path.resolve(process.cwd(), 'src/lib/data/magazin-recipe-category-review.json')

function normalizeCategory(value) {
  return String(value ?? '').trim()
}

const review = JSON.parse(fs.readFileSync(REVIEW_PATH, 'utf8'))
if (!review || !Array.isArray(review.entries)) {
  throw new Error('Review file is invalid: expected { entries: [] }')
}

const desiredByKey = new Map()
for (const entry of review.entries) {
  const key = String(entry?.key ?? `${entry?.year}/${entry?.id}`)
  const category = normalizeCategory(entry?.category)
  if (!key || !category) continue
  desiredByKey.set(key, category)
}

const recipes = JSON.parse(fs.readFileSync(RECIPES_PATH, 'utf8'))
if (!Array.isArray(recipes)) {
  throw new Error('recipes.json must be an array')
}

let updated = 0
let unchanged = 0

for (const recipe of recipes) {
  const key = `${recipe.year}/${recipe.id}`
  if (!desiredByKey.has(key)) continue

  const nextCategory = desiredByKey.get(key)
  const currentCategory = normalizeCategory(recipe.category)

  if (currentCategory === nextCategory) {
    unchanged += 1
    continue
  }

  recipe.category = nextCategory
  updated += 1
}

const unmatched = [...desiredByKey.keys()].filter(
  (key) => !recipes.some((recipe) => `${recipe.year}/${recipe.id}` === key)
).length

fs.writeFileSync(RECIPES_PATH, `${JSON.stringify(recipes, null, 2)}\n`)

console.log(
  `Imported category review: updated=${updated}, unchanged=${unchanged}, unmatched=${unmatched}`
)
