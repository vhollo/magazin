import fs from 'node:fs'
import path from 'node:path'

const DEFAULT_PATTERNS_PATH = path.resolve(
  process.cwd(),
  'src/lib/data/receptsarok-category-patterns.json'
)

const DEFAULT_STOPWORDS = new Set([
  'egy',
  'ketto',
  'harom',
  'negy',
  'ot',
  'hat',
  'adag',
  'adaghoz',
  'db',
  'dkg',
  'kg',
  'g',
  'mg',
  'ml',
  'cl',
  'dl',
  'l',
  'ek',
  'tk',
  'kk',
  'cs',
  'es',
  'vagy',
  'iz',
  'szerint',
  'friss',
  'apritott',
  'apora',
  'orolt',
  'apritva',
  'daralt',
])

let cachedPath = ''
let cachedModel = null

export function normalizeForCategoryModel(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function tokenize(value) {
  return normalizeForCategoryModel(value)
    .split(/\s+/)
    .filter((token) => token.length >= 3 && !DEFAULT_STOPWORDS.has(token))
}

function featuresFromTokens(tokens) {
  const features = new Set(tokens)
  for (let i = 0; i < tokens.length - 1; i += 1) {
    features.add(`${tokens[i]}_${tokens[i + 1]}`)
  }
  return [...features]
}

function softmax(scores) {
  const max = Math.max(...scores)
  const exps = scores.map((score) => Math.exp(score - max))
  const sum = exps.reduce((acc, value) => acc + value, 0)
  return exps.map((value) => value / (sum || 1))
}

function parseCategoryModel(raw) {
  const categories = Array.isArray(raw?.categories) ? raw.categories : []
  const categoryStats = raw?.categoryStats && typeof raw.categoryStats === 'object' ? raw.categoryStats : {}
  const featuresByCategory =
    raw?.featuresByCategory && typeof raw.featuresByCategory === 'object' ? raw.featuresByCategory : {}
  const thresholds = raw?.thresholds && typeof raw.thresholds === 'object' ? raw.thresholds : {}

  const weightMaps = new Map()
  for (const category of categories) {
    const features = Array.isArray(featuresByCategory[category]) ? featuresByCategory[category] : []
    const map = new Map()
    for (const feature of features) {
      const key = String(feature?.feature ?? '')
      const score = Number(feature?.score)
      if (!key || !Number.isFinite(score) || score <= 0) continue
      map.set(key, score)
    }
    weightMaps.set(category, map)
  }

  return { categories, categoryStats, thresholds, weightMaps, raw }
}

export function loadCategoryPatterns(patternsPath = DEFAULT_PATTERNS_PATH) {
  if (cachedModel && cachedPath === patternsPath) return cachedModel
  const raw = JSON.parse(fs.readFileSync(patternsPath, 'utf8'))
  cachedModel = parseCategoryModel(raw)
  cachedPath = patternsPath
  return cachedModel
}

function collectText({ title = '', ingredientNames = [], searchTerms = [] }) {
  const parts = [title]
  if (Array.isArray(ingredientNames)) parts.push(...ingredientNames)
  if (Array.isArray(searchTerms)) parts.push(...searchTerms)
  return parts.join(' ')
}

const TITLE_CATEGORY_KEYWORDS = {
  husetelek: [
    'hus',
    'csirke',
    'marha',
    'sertes',
    'pulyka',
    'tarja',
    'karaj',
    'comb',
    'maj',
    'nyul',
    'virsli',
    'vagdalt',
    'fasirt',
    'fasirozott',
    'jerce',
    'steak',
    'csibe',
    'szuz',
    'tokany',
    'sonka',
    'pecsenye',
  ],
}

const TITLE_KEYWORD_BOOST = 1.8

function titleKeywordBoosts(title) {
  const normalizedTitle = normalizeForCategoryModel(title)
  if (!normalizedTitle) return []
  const boosts = []
  for (const [category, keywords] of Object.entries(TITLE_CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (!keyword) continue
      if (!normalizedTitle.includes(keyword)) continue
      boosts.push({
        category,
        feature: `title:*${keyword}*`,
        score: TITLE_KEYWORD_BOOST,
      })
    }
  }
  return boosts
}

/**
 * @param {{
 *   title?: string
 *   ingredientNames?: string[]
 *   searchTerms?: string[]
 *   patternsPath?: string
 *   minConfidence?: number
 *   minMargin?: number
 *   minMatchedFeatures?: number
 * }} input
 */
export function predictRecipeCategory(input) {
  const model = loadCategoryPatterns(input?.patternsPath)
  const categories = model.categories
  if (categories.length === 0) {
    return {
      resolved: false,
      category: null,
      predictedCategory: null,
      confidence: 0,
      margin: 0,
      matchedFeatures: [],
      reason: 'model-empty',
    }
  }

  const tokens = tokenize(collectText(input ?? {}))
  const features = featuresFromTokens(tokens)
  const boosts = titleKeywordBoosts(input?.title)
  if (features.length === 0) {
    return {
      resolved: false,
      category: null,
      predictedCategory: null,
      confidence: 0,
      margin: 0,
      matchedFeatures: [],
      reason: 'no-features',
    }
  }

  const scores = []
  const contributionsByCategory = new Map()
  for (const category of categories) {
    const prior = Number(model.categoryStats?.[category]?.prior ?? 0)
    let score = Math.log(Math.max(prior, 1e-6))
    const categoryWeights = model.weightMaps.get(category) || new Map()
    const contributions = []
    for (const feature of features) {
      const weight = categoryWeights.get(feature)
      if (!Number.isFinite(weight) || weight <= 0) continue
      score += weight
      contributions.push({ feature, score: weight })
    }
    for (const boost of boosts) {
      if (boost.category !== category) continue
      score += boost.score
      contributions.push({ feature: boost.feature, score: boost.score })
    }
    contributions.sort((a, b) => b.score - a.score)
    contributionsByCategory.set(category, contributions)
    scores.push(score)
  }

  const probs = softmax(scores)
  const rows = categories.map((category, idx) => ({
    category,
    score: scores[idx],
    probability: probs[idx],
  }))
  rows.sort((a, b) => b.probability - a.probability)

  const top = rows[0]
  const second = rows[1] || { probability: 0 }
  const confidence = Number(top?.probability ?? 0)
  const margin = confidence - Number(second?.probability ?? 0)
  const matchedFeatures = (contributionsByCategory.get(top?.category) || []).slice(0, 8)

  const minConfidence =
    Number.isFinite(input?.minConfidence) ? Number(input.minConfidence) : Number(model.thresholds?.minConfidence ?? 0.45)
  const minMargin =
    Number.isFinite(input?.minMargin) ? Number(input.minMargin) : Number(model.thresholds?.minMargin ?? 0.12)
  const minMatchedFeatures = Number.isFinite(input?.minMatchedFeatures)
    ? Number(input.minMatchedFeatures)
    : Number(model.thresholds?.minMatchedFeatures ?? 2)

  const resolved =
    confidence >= minConfidence &&
    margin >= minMargin &&
    matchedFeatures.length >= minMatchedFeatures

  return {
    resolved,
    category: resolved ? top.category : null,
    predictedCategory: top?.category ?? null,
    confidence,
    margin,
    matchedFeatures,
    reason: resolved ? 'predicted' : 'below-threshold',
  }
}

export function categoryFeaturesFromRecipe(recipe) {
  const title = String(recipe?.title ?? '')
  const ingredientNames = Array.isArray(recipe?.ingredientNames) ? recipe.ingredientNames : []
  const searchTerms = Array.isArray(recipe?.searchTerms) ? recipe.searchTerms : []
  const tokens = tokenize([title, ...ingredientNames, ...searchTerms].join(' '))
  return featuresFromTokens(tokens)
}
