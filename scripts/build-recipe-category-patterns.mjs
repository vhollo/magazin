import fs from 'node:fs'
import path from 'node:path'
import { categoryFeaturesFromRecipe } from './lib/receptsarok-category-predictor.mjs'

const RECIPES_PATH = path.resolve(process.cwd(), 'src/lib/data/recipes.json')
const OUTPUT_PATH = path.resolve(process.cwd(), 'src/lib/data/receptsarok-category-patterns.json')

const MIN_DOC_FREQ = 3
const MAX_FEATURES_PER_CATEGORY = 220
const ALPHA = 0.75

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`)
}

function logOddsRatio(catDocsWithFeature, catDocs, otherDocsWithFeature, otherDocs, alpha) {
  const catOdds = (catDocsWithFeature + alpha) / (catDocs - catDocsWithFeature + alpha)
  const otherOdds = (otherDocsWithFeature + alpha) / (otherDocs - otherDocsWithFeature + alpha)
  return Math.log(catOdds / otherOdds)
}

const recipes = readJson(RECIPES_PATH)
if (!Array.isArray(recipes)) throw new Error('recipes.json must be an array')

const categories = [...new Set(recipes.map((recipe) => String(recipe?.category ?? '').trim()).filter(Boolean))].sort()
const totalDocs = recipes.length

const categoryDocCount = Object.fromEntries(categories.map((category) => [category, 0]))
const categoryFeatureDocFreq = Object.fromEntries(categories.map((category) => [category, new Map()]))
const globalFeatureDocFreq = new Map()

for (const recipe of recipes) {
  const category = String(recipe?.category ?? '').trim()
  if (!categoryFeatureDocFreq[category]) continue
  categoryDocCount[category] += 1

  const uniqueFeatures = new Set(categoryFeaturesFromRecipe(recipe))
  for (const feature of uniqueFeatures) {
    globalFeatureDocFreq.set(feature, (globalFeatureDocFreq.get(feature) || 0) + 1)
    const current = categoryFeatureDocFreq[category].get(feature) || 0
    categoryFeatureDocFreq[category].set(feature, current + 1)
  }
}

const categoryStats = {}
const featuresByCategory = {}

for (const category of categories) {
  const catDocs = categoryDocCount[category]
  const otherDocs = Math.max(totalDocs - catDocs, 1)
  categoryStats[category] = {
    docCount: catDocs,
    prior: catDocs / Math.max(totalDocs, 1),
  }

  const weighted = []
  for (const [feature, catDf] of categoryFeatureDocFreq[category].entries()) {
    if (catDf < MIN_DOC_FREQ) continue
    const globalDf = globalFeatureDocFreq.get(feature) || 0
    const otherDf = Math.max(globalDf - catDf, 0)
    const score = logOddsRatio(catDf, catDocs, otherDf, otherDocs, ALPHA)
    if (!Number.isFinite(score) || score <= 0) continue

    const purity = catDf / Math.max(globalDf, 1)
    weighted.push({
      feature,
      score: Number(score.toFixed(6)),
      docFreq: catDf,
      globalDocFreq: globalDf,
      purity: Number(purity.toFixed(4)),
    })
  }

  weighted.sort((a, b) => b.score - a.score || b.docFreq - a.docFreq || a.feature.localeCompare(b.feature))
  featuresByCategory[category] = weighted.slice(0, MAX_FEATURES_PER_CATEGORY)
}

const payload = {
  generatedAt: new Date().toISOString(),
  source: 'src/lib/data/recipes.json',
  recipeCount: totalDocs,
  categories,
  config: {
    minDocFreq: MIN_DOC_FREQ,
    alpha: ALPHA,
    maxFeaturesPerCategory: MAX_FEATURES_PER_CATEGORY,
    featureSpace: 'title + ingredientNames + searchTerms, unigram + bigram (accent-insensitive)',
    scoring: 'smoothed log-odds ratio (category vs rest)',
  },
  thresholds: {
    minConfidence: 0.45,
    minMargin: 0.12,
    minMatchedFeatures: 2,
  },
  categoryStats,
  featuresByCategory,
}

writeJson(OUTPUT_PATH, payload)
console.log(`Wrote category patterns to ${path.relative(process.cwd(), OUTPUT_PATH)} for ${totalDocs} recipes`)
