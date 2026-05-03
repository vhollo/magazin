import fs from 'node:fs'
import path from 'node:path'

const RECIPES_PATH = path.resolve(process.cwd(), 'src/lib/data/recipes.json')
const REVIEW_PATH = path.resolve(process.cwd(), 'src/lib/data/magazin-recipe-category-review.json')

function normalizeTag(value) {
  return String(value ?? '').trim().toLowerCase()
}

function recipeTags(recipe) {
  const source = Array.isArray(recipe?.tags)
    ? recipe.tags
    : Array.isArray(recipe?.searchTerms)
      ? recipe.searchTerms
      : []
  return source.map(normalizeTag).filter(Boolean)
}

function isMagazinImportedRecipe(recipe) {
  const tags = recipeTags(recipe)
  const hasRecept = tags.includes('recept')
  if (!hasRecept) return false
  return tags.some((tag) => tag !== 'recept')
}

const recipes = JSON.parse(fs.readFileSync(RECIPES_PATH, 'utf8'))
if (!Array.isArray(recipes)) {
  throw new Error('recipes.json must be an array')
}

const entries = recipes
  .filter(isMagazinImportedRecipe)
  .map((recipe) => ({
    key: `${recipe.year}/${recipe.id}`,
    year: recipe.year,
    id: recipe.id,
    title: recipe.title,
    author: recipe.author ?? '',
    category: recipe.category ?? '',
    searchTerms: Array.isArray(recipe.searchTerms) ? recipe.searchTerms : [],
    img: recipe.img?.src ?? null,
  }))
  .sort((a, b) => String(b.year).localeCompare(String(a.year)) || a.id.localeCompare(b.id))

const review = {
  generatedAt: new Date().toISOString(),
  source: 'src/lib/data/recipes.json',
  instructions:
    'Edit only `entries[].category`, then run: npm run recipes:review:import',
  entries,
}

fs.writeFileSync(REVIEW_PATH, `${JSON.stringify(review, null, 2)}\n`)

console.log(`Wrote ${entries.length} entries to ${path.relative(process.cwd(), REVIEW_PATH)}`)
