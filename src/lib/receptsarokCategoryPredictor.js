import fs from 'node:fs'
import path from 'node:path'

const DEFAULT_PATTERNS_PATH = path.resolve(
  process.cwd(),
  'src/lib/data/receptsarok-category-patterns.json'
)

const CATEGORY_IDS = [
  'levesek',
  'zoldsegetelek',
  'haletelek',
  'husetelek',
  'egytaletelek',
  'koretek-italok-hidegkonyha',
  'sos-edes-sutemenyek-desszertek-tesztak',
]

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

function collectText({ title = '', ingredientNames = [], searchTerms = [], instructions = [] }) {
  const parts = [title]
  if (Array.isArray(ingredientNames)) parts.push(...ingredientNames)
  if (Array.isArray(searchTerms)) parts.push(...searchTerms)
  if (Array.isArray(instructions)) parts.push(...instructions)
  return parts.join(' ')
}

function sourcePathCategoryProof(sourcePath) {
  const normalizedPath = normalizeForCategoryModel(sourcePath)
  if (!normalizedPath) return null
  const pathTokens = new Set(normalizedPath.split(/\s+/).filter((token) => token.length >= 4))
  if (pathTokens.size === 0) return null

  const scores = []
  for (const category of CATEGORY_IDS) {
    const categoryParts = category.split('-').filter((part) => part.length >= 4)
    if (categoryParts.length === 0) continue
    const matched = categoryParts.filter((part) => pathTokens.has(part))
    if (matched.length === 0) continue
    scores.push({
      category,
      score: matched.length,
      matchedFeatures: matched.map((part) => ({ feature: `sourcePath:${part}`, score: 5 })),
    })
  }

  if (scores.length === 0) return null
  scores.sort((a, b) => b.score - a.score || a.category.localeCompare(b.category))
  const top = scores[0]
  const second = scores[1]
  if (second && second.score === top.score) return null
  return top
}

const CATEGORY_KEYWORDS = {
  levesek: ['leves', 'levesek', 'kremleves', 'huseleves', 'gyumolcsleves'],
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
  haletelek: [
    'hal',
    'lazac',
    'tonhal',
    'tokehal',
    'harcsa',
    'pisztrang',
    'heck',
    'busa',
    'ponty',
    'makrela',
    'szardinia',
    'hering',
    'rak',
    'garnela',
    'garnela',
    'kagyl',
    'tintahal',
    'polip',
    'surimi',
    'halrudacska',
    'halkonzerv',
    'halszelet',
    'halfile',
  ],
}

/** Phrases in Elkészítés / instructions (normalized, accent-stripped). */
const INSTRUCTION_CATEGORY_KEYWORDS = {
  'koretek-italok-hidegkonyha': ['koret', 'koretnek', 'korethez', 'koretkent', 'koretet'],
}

const TITLE_CATEGORY_PROOF = {
  levesek: ['leves'],
  egytaletelek: ['rakott'],
}

const TITLE_KEYWORD_BOOST = 1.8
const INGREDIENT_KEYWORD_BOOST = 2.2
const INSTRUCTION_KEYWORD_BOOST = 2.6
const STUFFED_FORBIDDEN_CATEGORY = 'levesek'

const STUFFED_MEAT_KEYWORDS = [
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
  'daralthus',
]

const STUFFED_GREEN_KEYWORDS = [
  'zoldseg',
  'cukkini',
  'sutotok',
  'tok',
  'padlizsan',
  'karalabe',
  'kel',
  'kaposzta',
  'spenot',
  'brokkoli',
  'karfiol',
  'paprika',
  'paradicsom',
  'gomba',
  'burgonya',
  'zeller',
  'hagyma',
]

const STUFFED_SWEET_KEYWORDS = [
  'gyumolcs',
  'alma',
  'korte',
  'barack',
  'szilva',
  'meggy',
  'cseresznye',
  'malna',
  'eper',
  'afonya',
  'narancs',
  'citrom',
  'dio',
  'mandula',
  'mogyoro',
  'gesztenye',
  'aszalt',
]

const MEAT_INGREDIENT_KEYWORDS = [
  'marhahus',
  'serteshus',
  'csirkehus',
  'pulykahus',
  'daralthus',
  'husgoly',
  'hus',
  'marha',
  'sertes',
  'csirke',
  'pulyka',
  'karaj',
  'tarja',
  'comb',
  'maj',
  'sonka',
  'szuzpecsenye',
]

const GREEN_INGREDIENT_KEYWORDS = [
  'zoldseg',
  'cukkini',
  'spenot',
  'gomba',
  'brokkoli',
  'karfiol',
  'padlizsan',
  'sutotok',
  'tok',
  'sargaborso',
  'borso',
  'bab',
  'lencse',
  'kaposzta',
  'kel',
  'zeller',
  'hagyma',
  'paradicsom',
  'paprika',
  'karalabe',
]

const FISH_INGREDIENT_KEYWORDS = [
  'hal',
  'lazac',
  'tonhal',
  'harcsa',
  'pisztrang',
  'ponty',
  'tokehal',
  'halfile',
]

function keywordMatches(text, keywords) {
  const out = []
  for (const keyword of keywords) {
    if (!keyword) continue
    if (text.includes(keyword)) out.push(keyword)
  }
  return [...new Set(out)]
}

function hasSoupSignals({ title = '', sourcePath = '', searchTerms = [] }) {
  const signal = normalizeForCategoryModel([title, sourcePath, ...(Array.isArray(searchTerms) ? searchTerms : [])].join(' '))
  return signal.includes('leves') || signal.includes('kremleves') || signal.includes('huseleves')
}

function ingredientCategoryProof({ title = '', ingredientNames = [], searchTerms = [], sourcePath = '' }) {
  const ingredientText = normalizeForCategoryModel(
    [...(Array.isArray(ingredientNames) ? ingredientNames : []), ...(Array.isArray(searchTerms) ? searchTerms : [])].join(' ')
  )
  if (!ingredientText) return null

  const meatMatches = keywordMatches(ingredientText, MEAT_INGREDIENT_KEYWORDS)
  if (meatMatches.length > 0) {
    return {
      category: 'husetelek',
      reason: 'ingredient-proof-meat',
      matchedFeatures: meatMatches.slice(0, 6).map((token) => ({ feature: `ingredientProof:${token}`, score: 999 })),
    }
  }

  const fishMatches = keywordMatches(ingredientText, FISH_INGREDIENT_KEYWORDS)
  if (fishMatches.length > 0) {
    return {
      category: 'haletelek',
      reason: 'ingredient-proof-fish',
      matchedFeatures: fishMatches.slice(0, 6).map((token) => ({ feature: `ingredientProof:${token}`, score: 999 })),
    }
  }

  const greenMatches = keywordMatches(ingredientText, GREEN_INGREDIENT_KEYWORDS)
  if (
    greenMatches.length >= 2 &&
    !hasSoupSignals({ title, sourcePath, searchTerms })
  ) {
    return {
      category: 'zoldsegetelek',
      reason: 'ingredient-proof-greens',
      matchedFeatures: greenMatches.slice(0, 6).map((token) => ({ feature: `ingredientProof:${token}`, score: 999 })),
    }
  }

  return null
}

function titleCategoryProof(title) {
  const normalizedTitle = normalizeForCategoryModel(title)
  if (!normalizedTitle) return null

  for (const [category, keywords] of Object.entries(TITLE_CATEGORY_PROOF)) {
    for (const keyword of keywords) {
      if (!keyword || !normalizedTitle.includes(keyword)) continue
      return {
        category,
        matchedFeatures: [{ feature: `titleProof:${keyword}`, score: 5 }],
      }
    }
  }
  return null
}

function keywordBoostsFromText(categoryKeywords, text, featurePrefix, boostScore) {
  const normalized = normalizeForCategoryModel(text)
  if (!normalized) return []
  const boosts = []
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    for (const keyword of keywords) {
      if (!keyword) continue
      if (!normalized.includes(keyword)) continue
      boosts.push({
        category,
        feature: `${featurePrefix}:*${keyword}*`,
        score: boostScore,
      })
    }
  }
  return boosts
}

function titleKeywordBoosts(title) {
  return keywordBoostsFromText(CATEGORY_KEYWORDS, title, 'title', TITLE_KEYWORD_BOOST)
}

function ingredientKeywordBoosts(ingredientNames, searchTerms) {
  const ingredientText = [
    ...(Array.isArray(ingredientNames) ? ingredientNames : []),
    ...(Array.isArray(searchTerms) ? searchTerms : []),
  ].join(' ')
  return keywordBoostsFromText(CATEGORY_KEYWORDS, ingredientText, 'ingredient', INGREDIENT_KEYWORD_BOOST)
}

function instructionKeywordBoosts(instructions) {
  const text = Array.isArray(instructions) ? instructions.join(' ') : ''
  return keywordBoostsFromText(
    INSTRUCTION_CATEGORY_KEYWORDS,
    text,
    'instruction',
    INSTRUCTION_KEYWORD_BOOST
  )
}

function firstKeywordMatch(haystack, keywords) {
  for (const keyword of keywords) {
    if (!keyword) continue
    if (haystack.includes(keyword)) return keyword
  }
  return null
}

function stuffedTitleRule({ title = '', ingredientNames = [], searchTerms = [] }) {
  const normalizedTitle = normalizeForCategoryModel(title)
  if (!normalizedTitle.includes('toltott')) return { active: false }

  const signalText = normalizeForCategoryModel(
    [title, ...(Array.isArray(ingredientNames) ? ingredientNames : []), ...(Array.isArray(searchTerms) ? searchTerms : [])].join(
      ' '
    )
  )

  const meat = firstKeywordMatch(signalText, STUFFED_MEAT_KEYWORDS)
  if (meat) {
    return {
      active: true,
      resolved: true,
      category: 'husetelek',
      reason: 'stuffed-title-meat',
      matchedFeatures: [{ feature: `stuffed:${meat}`, score: 999 }],
    }
  }

  const greens = firstKeywordMatch(signalText, STUFFED_GREEN_KEYWORDS)
  if (greens) {
    return {
      active: true,
      resolved: true,
      category: 'zoldsegetelek',
      reason: 'stuffed-title-greens',
      matchedFeatures: [{ feature: `stuffed:${greens}`, score: 999 }],
    }
  }

  const sweet = firstKeywordMatch(signalText, STUFFED_SWEET_KEYWORDS)
  if (sweet) {
    return {
      active: true,
      resolved: true,
      category: 'sos-edes-sutemenyek-desszertek-tesztak',
      reason: 'stuffed-title-sweet',
      matchedFeatures: [{ feature: `stuffed:${sweet}`, score: 999 }],
    }
  }

  return {
    active: true,
    resolved: false,
    category: null,
    reason: 'stuffed-title-no-soup',
    matchedFeatures: [{ feature: 'stuffed:title', score: 5 }],
    forbiddenCategory: STUFFED_FORBIDDEN_CATEGORY,
  }
}

/**
 * @param {{
 *   title?: string
 *   ingredientNames?: string[]
 *   searchTerms?: string[]
 *   instructions?: string[]
 *   sourcePath?: string
 *   patternsPath?: string
 *   minConfidence?: number
 *   minMargin?: number
 *   minMatchedFeatures?: number
 * }} input
 */
export function predictRecipeCategory(input) {
  const sourcePathProof = sourcePathCategoryProof(input?.sourcePath)
  if (sourcePathProof?.category) {
    return {
      resolved: true,
      category: sourcePathProof.category,
      predictedCategory: sourcePathProof.category,
      confidence: 1,
      margin: 1,
      matchedFeatures: sourcePathProof.matchedFeatures,
      reason: 'source-path-proof',
    }
  }

  const stuffedRule = stuffedTitleRule(input ?? {})
  if (stuffedRule.active && stuffedRule.resolved && stuffedRule.category) {
    return {
      resolved: true,
      category: stuffedRule.category,
      predictedCategory: stuffedRule.category,
      confidence: 1,
      margin: 1,
      matchedFeatures: stuffedRule.matchedFeatures,
      reason: stuffedRule.reason,
    }
  }

  const strongTitleProof = titleCategoryProof(input?.title)
  if (strongTitleProof?.category && !stuffedRule.active) {
    return {
      resolved: true,
      category: strongTitleProof.category,
      predictedCategory: strongTitleProof.category,
      confidence: 1,
      margin: 1,
      matchedFeatures: strongTitleProof.matchedFeatures,
      reason: 'title-proof',
    }
  }

  const ingredientProof = ingredientCategoryProof(input ?? {})
  if (ingredientProof?.category) {
    return {
      resolved: true,
      category: ingredientProof.category,
      predictedCategory: ingredientProof.category,
      confidence: 1,
      margin: 1,
      matchedFeatures: ingredientProof.matchedFeatures,
      reason: ingredientProof.reason,
    }
  }

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
  const boosts = [
    ...titleKeywordBoosts(input?.title),
    ...ingredientKeywordBoosts(input?.ingredientNames, input?.searchTerms),
    ...instructionKeywordBoosts(input?.instructions),
  ]
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
    if (stuffedRule.active && stuffedRule.forbiddenCategory === category) {
      score -= 1000
      contributions.push({ feature: 'stuffed:forbid-levesek', score: -1000 })
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
  const instructions = Array.isArray(recipe?.instructions) ? recipe.instructions : []
  const tokens = tokenize([title, ...ingredientNames, ...searchTerms, ...instructions].join(' '))
  return featuresFromTokens(tokens)
}
