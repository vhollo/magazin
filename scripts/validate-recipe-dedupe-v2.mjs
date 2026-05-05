import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { compareRecipeCandidates } from '../src/lib/receptsarokDedupeShared.js'
import { isDescriptionAuthorCompatible } from './lib/modx-to-rs-parser.mjs'
import { predictRecipeCategory, loadCategoryPatterns } from './lib/receptsarok-category-predictor.mjs'

const root = process.cwd()
const createReviewPath = path.resolve(root, 'src/lib/data/receptsarok-create-review.json')
const redirectsPath = path.resolve(root, 'src/lib/data/receptsarok-redirects.json')
const patternsPath = path.resolve(root, 'src/lib/data/receptsarok-category-patterns.json')
const uncategorizedPath = path.resolve(root, 'src/lib/data/receptsarok-uncategorized-review.json')
const recipesPath = path.resolve(root, 'src/lib/data/recipes.json')

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function testComparatorOrder() {
  const noVideoMoreNutrition = {
    id: 'a',
    year: 2024,
    video: '',
    nutritionTables: [{ energy: 1, protein: 1, fat: 1, saturatedFat: 1, carbs: 1, fiber: 1 }],
  }
  const hasVideoLessNutrition = {
    id: 'b',
    year: 2024,
    video: 'https://example.com',
    nutritionTables: [{ energy: 1 }],
  }
  const videoResult = compareRecipeCandidates(noVideoMoreNutrition, hasVideoLessNutrition)
  assert.equal(videoResult.winner.id, 'b')
  assert.equal(videoResult.reason, 'video')

  const sameVideoA = {
    id: 'c',
    year: 2024,
    video: '',
    nutritionTables: [{ energy: 1, protein: 1, fat: 1, saturatedFat: 1, carbs: 1, fiber: 1 }],
  }
  const sameVideoB = { id: 'd', year: 2025, video: '', nutritionTables: [{ energy: 1 }] }
  const nutritionResult = compareRecipeCandidates(sameVideoA, sameVideoB)
  assert.equal(nutritionResult.winner.id, 'c')
  assert.equal(nutritionResult.reason, 'nutrition')

  const yearA = { id: 'e', year: 2023, video: '', nutritionTables: [{ energy: 1 }] }
  const yearB = { id: 'f', year: 2025, video: '', nutritionTables: [{ energy: 1 }] }
  const yearResult = compareRecipeCandidates(yearA, yearB)
  assert.equal(yearResult.winner.id, 'f')
  assert.equal(yearResult.reason, 'year')
}

function testAuthorGate() {
  assert.equal(isDescriptionAuthorCompatible('Gyurcsáné Kondrát Ilona receptje', 'Gyurcsáné Kondrát Ilona'), true)
  assert.equal(isDescriptionAuthorCompatible('Kovács Bence receptje', 'Szabó Anna'), false)
  assert.equal(isDescriptionAuthorCompatible('', 'Szabó Anna'), true)
  assert.equal(isDescriptionAuthorCompatible('Kovács Bence receptje', ''), true)
}

function testParsedBranchBCompleteness() {
  const review = readJson(createReviewPath)
  const entries = Array.isArray(review?.entries) ? review.entries : []
  const missingBody = entries.filter((entry) => {
    const recipe = entry?.recipe ?? {}
    const ingredientGroups = Array.isArray(recipe.ingredientGroups) ? recipe.ingredientGroups : []
    const instructions = Array.isArray(recipe.instructions) ? recipe.instructions : []
    const nutritionTables = Array.isArray(recipe.nutritionTables) ? recipe.nutritionTables : []
    return ingredientGroups.length === 0 || instructions.length === 0 || nutritionTables.length === 0
  })
  assert.equal(missingBody.length, 0, `Parsed recipes missing body fields: ${missingBody.length}`)
}

function testRedirectsShape() {
  const redirects = readJson(redirectsPath)
  const entries = Array.isArray(redirects?.entries) ? redirects.entries : []
  assert.ok(entries.length > 0, 'redirect manifest should contain entries')
  const invalid = entries.filter((entry) => !entry.path || !entry.id || !Number.isFinite(Number(entry.year)))
  assert.equal(invalid.length, 0, `Invalid redirect rows: ${invalid.length}`)
}

function testCategoryPatternsShapeAndPredictor() {
  const model = loadCategoryPatterns(patternsPath)
  const expectedCategories = new Set([
    'levesek',
    'zoldsegetelek',
    'haletelek',
    'husetelek',
    'egytaletelek',
    'koretek-italok-hidegkonyha',
    'sos-edes-sutemenyek-desszertek-tesztak',
  ])
  assert.equal(model.categories.length, expectedCategories.size, 'Unexpected category count in pattern file')
  for (const category of expectedCategories) {
    assert.ok(model.categories.includes(category), `Missing category in pattern file: ${category}`)
  }

  const prediction = predictRecipeCategory({
    title: 'Tarkonyos zoldsegleves csirkehussal',
    ingredientNames: ['csirkemell', 'sargarepa', 'zeller', 'petrezselyemgyoker', 'tarkony'],
  })
  assert.ok(prediction.predictedCategory, 'Predictor did not return a top category')
}

function testUncategorizedQueueConsistency() {
  const redirects = readJson(redirectsPath)
  const redirectKeySet = new Set(
    (Array.isArray(redirects?.entries) ? redirects.entries : []).map((entry) => `${entry.year}-${entry.id}`)
  )
  const recipes = readJson(recipesPath)
  const recipeKeySet = new Set((Array.isArray(recipes) ? recipes : []).map((recipe) => `${recipe.year}-${recipe.id}`))

  if (!fs.existsSync(uncategorizedPath)) return
  const queue = readJson(uncategorizedPath)
  const entries = Array.isArray(queue?.entries) ? queue.entries : []
  const conflictingRedirects = entries.filter((entry) => redirectKeySet.has(String(entry?.key ?? '').replace('/', '-')))
  const conflictingRecipes = entries.filter((entry) => recipeKeySet.has(String(entry?.key ?? '').replace('/', '-')))
  assert.equal(
    conflictingRedirects.length,
    0,
    `Uncategorized entries unexpectedly present in redirects: ${conflictingRedirects.length}`
  )
  assert.equal(
    conflictingRecipes.length,
    0,
    `Uncategorized entries unexpectedly present in recipes.json: ${conflictingRecipes.length}`
  )
}

testComparatorOrder()
testAuthorGate()
testParsedBranchBCompleteness()
testRedirectsShape()
testCategoryPatternsShapeAndPredictor()
testUncategorizedQueueConsistency()

console.log('validate-recipe-dedupe-v2: OK')
