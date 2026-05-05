import fs from 'node:fs'
import path from 'node:path'
import { predictRecipeCategory } from './lib/receptsarok-category-predictor.mjs'

const RECIPES_PATH = path.resolve(process.cwd(), 'src/lib/data/recipes.json')

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

const recipes = readJson(RECIPES_PATH)
if (!Array.isArray(recipes)) throw new Error('recipes.json must be an array')

let total = 0
let resolved = 0
let correct = 0

for (const recipe of recipes) {
  const truth = String(recipe?.category ?? '').trim()
  if (!truth) continue
  total += 1
  const result = predictRecipeCategory({
    title: recipe.title,
    ingredientNames: Array.isArray(recipe.ingredientNames) ? recipe.ingredientNames : [],
    searchTerms: Array.isArray(recipe.searchTerms) ? recipe.searchTerms : [],
  })
  if (!result.resolved || !result.category) continue
  resolved += 1
  if (result.category === truth) correct += 1
}

const coverage = total > 0 ? resolved / total : 0
const accuracyOnResolved = resolved > 0 ? correct / resolved : 0
const overallAccuracy = total > 0 ? correct / total : 0

console.log(
  `category-eval: total=${total}, resolved=${resolved}, correct=${correct}, coverage=${coverage.toFixed(
    4
  )}, accuracyResolved=${accuracyOnResolved.toFixed(4)}, overallAccuracy=${overallAccuracy.toFixed(4)}`
)
