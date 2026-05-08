import fs from 'node:fs'
import path from 'node:path'
import { chooseWinner } from '../src/lib/receptsarokDedupeShared.js'
import {
  buildRecipeFromModxDoc,
  isDescriptionAuthorCompatible,
  parseYearFromMagazinPath,
  normalizeText,
} from './lib/modx-to-rs-parser.mjs'
import { predictRecipeCategory } from './lib/receptsarok-category-predictor.mjs'

const DATA_PATH = path.resolve(process.cwd(), 'src/lib/data/data.json')
const RECIPES_PATH = path.resolve(process.cwd(), 'src/lib/data/recipes.json')
const REDIRECTS_PATH = path.resolve(process.cwd(), 'src/lib/data/receptsarok-redirects.json')
const AUDIT_PATH = path.resolve(process.cwd(), 'src/lib/data/receptsarok-dedupe-audit.json')
const CREATE_REVIEW_PATH = path.resolve(process.cwd(), 'src/lib/data/receptsarok-create-review.json')
const UNCATEGORIZED_REVIEW_PATH = path.resolve(
  process.cwd(),
  'src/lib/data/receptsarok-uncategorized-review.json'
)
const CATEGORY_REVIEW_PATH = path.resolve(
  process.cwd(),
  'src/lib/data/magazin-recipe-category-review.json'
)

const applyLocal = process.argv.includes('--apply-local')
const createLocal = process.argv.includes('--create-local')
const allowMissingData = process.argv.includes('--allow-missing-data')

if (!fs.existsSync(DATA_PATH)) {
  if (allowMissingData) {
    console.warn(
      `dedupe skipped: missing input file ${DATA_PATH} (this is allowed with --allow-missing-data)`
    )
    process.exit(0)
  }
  throw new Error(`Missing required input file: ${DATA_PATH}`)
}

function tokenize(value) {
  return normalizeText(value).split(/\s+/).filter(Boolean)
}

function titleMatchScore(doc, recipe) {
  const docTitle = normalizeText(doc.longtitle || doc.title || '')
  const recipeTitle = normalizeText(recipe.title || '')
  if (!docTitle || !recipeTitle) return 0
  if (docTitle === recipeTitle) return 100
  if (recipeTitle.includes(docTitle) || docTitle.includes(recipeTitle)) return 80
  const docWords = tokenize(docTitle).filter((w) => w.length > 3)
  if (!docWords.length) return 0
  const overlap = docWords.filter((w) => recipeTitle.includes(w)).length
  return Math.round((overlap / docWords.length) * 50)
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`)
}

function normalizeCategory(value) {
  return String(value ?? '').trim()
}

function isDefaultCategory(value) {
  return normalizeCategory(value) === 'egytaletelek'
}

function loserMajorityCategory(matches, winner) {
  const counts = new Map()
  let loserVotes = 0

  for (const candidate of matches) {
    if (candidate.year === winner.year && candidate.id === winner.id) continue
    const category = normalizeCategory(candidate.category)
    if (!category) continue
    loserVotes += 1
    counts.set(category, (counts.get(category) || 0) + 1)
  }

  if (loserVotes === 0 || counts.size === 0) {
    return { accepted: false, reason: 'no-loser-votes', loserVotes, share: 0, category: null, votes: 0 }
  }

  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  const [topCategory, topVotes] = sorted[0]
  const secondVotes = sorted[1]?.[1] ?? 0
  const share = topVotes / loserVotes
  const tiedTop = secondVotes === topVotes
  const accepted = topVotes >= 2 && share >= 0.6 && !tiedTop

  return {
    accepted,
    reason: accepted ? 'loser-majority' : tiedTop ? 'tied-top-votes' : 'below-threshold',
    loserVotes,
    share,
    category: accepted ? topCategory : null,
    votes: topVotes,
  }
}

const docs = readJson(DATA_PATH)
const recipes = readJson(RECIPES_PATH)
const categoryReview = fs.existsSync(CATEGORY_REVIEW_PATH) ? readJson(CATEGORY_REVIEW_PATH) : { entries: [] }

if (!Array.isArray(docs)) throw new Error('data.json must be an array')
if (!Array.isArray(recipes)) throw new Error('recipes.json must be an array')
if (!Array.isArray(categoryReview?.entries)) {
  throw new Error('magazin-recipe-category-review.json must contain entries array')
}

const categoryByKey = new Map()
for (const entry of categoryReview.entries) {
  const year = Number(entry?.year)
  const id = String(entry?.id ?? '').trim()
  const category = String(entry?.category ?? '').trim()
  if (!Number.isFinite(year) || !id || !category) continue
  categoryByKey.set(`${year}/${id}`, category)
  categoryByKey.set(`${year}-${id}`, category)
}

function hasReceptTag(doc) {
  const tags = Array.isArray(doc?.tv?.tags) ? doc.tv.tags : []
  return tags.length === 1 && normalizeText(tags[0]) === 'recept'
}

const magazineCandidates = docs.filter((doc) => hasReceptTag(doc))

const redirects = []
const createRecipes = []
const uncategorizedRecipes = []
const audit = []
const recipeByKey = new Map(recipes.map((r) => [`${r.year}-${r.id}`, r]))
const losersToUnpublish = new Set()

function enforceFreeForMagazinOrigin(recipe) {
  if (Number.isFinite(recipe?.sourceModxId)) {
    recipe.free = true
  }
}

function hasRequiredRecipeBody(recipe) {
  const ingredientGroups = Array.isArray(recipe?.ingredientGroups) ? recipe.ingredientGroups : []
  const instructions = Array.isArray(recipe?.instructions) ? recipe.instructions : []
  const instructionsHtml = String(recipe?.instructionsHtml ?? '').trim()
  const nutritionTables = Array.isArray(recipe?.nutritionTables) ? recipe.nutritionTables : []
  return (
    ingredientGroups.length > 0 &&
    (instructions.length > 0 || instructionsHtml.length > 0) &&
    nutritionTables.length > 0
  )
}

for (const doc of magazineCandidates) {
  const aliasNorm = normalizeText(doc.alias)
  const docTitle = doc.longtitle || doc.title || ''
  const matches = recipes
    .filter((recipe) => recipe.published !== false)
    .filter((recipe) => isDescriptionAuthorCompatible(doc?.description, recipe?.author))
    .map((recipe) => {
      const score =
        titleMatchScore(doc, recipe) +
        (normalizeText(recipe.id) === aliasNorm && aliasNorm ? 40 : 0)
      return { recipe, score }
    })
    .filter((entry) => entry.score >= 60)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.recipe)

  if (matches.length > 0) {
    const { winner, reason } = chooseWinner(matches)
    if (!winner) continue
    // Keep winner subrecipe structure in sync with current MODX parser rules.
    // This prevents legacy false-positive subrecipes (e.g. "További receptek" link lists).
    const { recipe: reparsedWinner } = buildRecipeFromModxDoc(doc, {
      year: Number(winner.year),
      id: String(winner.id),
      categoryByKey,
      predictCategory: predictRecipeCategory,
    })
    winner.subRecipes = Array.isArray(reparsedWinner?.subRecipes) ? reparsedWinner.subRecipes : []
    winner.hasSubRecipes = winner.subRecipes.length > 0

    let categorySource = 'winner-original'
    let categoryDecision = {
      category: normalizeCategory(winner.category),
      confidence: 1,
      margin: 1,
      matchedFeatures: [],
      reason: 'winner-original',
    }

    const winnerCategory = normalizeCategory(winner.category)
    if (!winnerCategory || isDefaultCategory(winnerCategory)) {
      const loserMajority = loserMajorityCategory(matches, winner)
      if (loserMajority.accepted && loserMajority.category) {
        winner.category = loserMajority.category
        categorySource = 'loser-majority'
        categoryDecision = {
          category: loserMajority.category,
          confidence: loserMajority.share,
          margin: loserMajority.share - (1 - loserMajority.share),
          matchedFeatures: [],
          reason: loserMajority.reason,
        }
      } else {
        const prediction = predictRecipeCategory({
          title: winner.title,
          ingredientNames: Array.isArray(winner.ingredientNames) ? winner.ingredientNames : [],
          searchTerms: Array.isArray(winner.searchTerms) ? winner.searchTerms : [],
        })
        if (prediction?.resolved && prediction?.category) {
          winner.category = prediction.category
          categorySource = 'predicted'
          categoryDecision = {
            category: prediction.category,
            confidence: Number(prediction.confidence ?? 0),
            margin: Number(prediction.margin ?? 0),
            matchedFeatures: Array.isArray(prediction.matchedFeatures) ? prediction.matchedFeatures : [],
            reason: loserMajority.reason,
          }
        }
      }
    }

    // Business rule: every RS recipe in a magazine duplicate cluster is free,
    // regardless of winner/loser status.
    for (const candidate of matches) {
      candidate.free = true
    }
    for (const candidate of matches) {
      if (candidate.year === winner.year && candidate.id === winner.id) continue
      losersToUnpublish.add(`${candidate.year}-${candidate.id}`)
    }
    redirects.push({
      modxContentId: doc.id,
      path: doc.path,
      year: winner.year,
      id: winner.id,
    })
    audit.push({
      type: 'rs-winner',
      modxContentId: doc.id,
      modxPath: doc.path,
      winner: `${winner.year}-${winner.id}`,
      matched: matches.map((r) => `${r.year}-${r.id}`),
      reason,
      categorySource,
      categoryDecision,
    })
    continue
  }

  const year = parseYearFromMagazinPath(doc.path)
  const id = String(doc.alias || '').trim()
  if (!id) {
    audit.push({
      type: 'skip-no-alias',
      modxContentId: doc.id,
      modxPath: doc.path,
      title: docTitle,
    })
    continue
  }

  const key = `${year}-${id}`
  if (!recipeByKey.has(key)) {
    const { recipe: parsedRecipe, categoryDecision } = buildRecipeFromModxDoc(doc, {
      year,
      id,
      categoryByKey,
      predictCategory: predictRecipeCategory,
    })
    if (!categoryDecision.resolved || !categoryDecision.category) {
      const reviewRecipe = { ...parsedRecipe }
      delete reviewRecipe.category
      uncategorizedRecipes.push({
        key,
        sourcePath: doc.path,
        modxContentId: doc.id,
        reason: categoryDecision.reason || 'category-unresolved',
        categoryDecision,
        recipe: reviewRecipe,
      })
      audit.push({
        type: 'new-rs-category-unresolved',
        modxContentId: doc.id,
        modxPath: doc.path,
        target: key,
        categoryDecision,
      })
      continue
    }
    if (!hasRequiredRecipeBody(parsedRecipe)) {
      uncategorizedRecipes.push({
        key,
        sourcePath: doc.path,
        modxContentId: doc.id,
        reason: 'parse-incomplete',
        categoryDecision: {
          ...categoryDecision,
          reason: 'parse-incomplete',
        },
        recipe: parsedRecipe,
      })
      audit.push({
        type: 'new-rs-parse-incomplete',
        modxContentId: doc.id,
        modxPath: doc.path,
        target: key,
        categoryDecision: {
          ...categoryDecision,
          reason: 'parse-incomplete',
        },
      })
      continue
    }

    redirects.push({
      modxContentId: doc.id,
      path: doc.path,
      year,
      id,
    })
    createRecipes.push({
      key,
      sourcePath: doc.path,
      recipe: parsedRecipe,
      categoryDecision,
    })
  } else {
    redirects.push({
      modxContentId: doc.id,
      path: doc.path,
      year,
      id,
    })
  }
  audit.push({
    type: 'new-rs-required',
    modxContentId: doc.id,
    modxPath: doc.path,
    target: key,
    categorySource: recipeByKey.has(key) ? 'existing-rs' : 'predicted-or-manual',
  })
}

for (const key of losersToUnpublish) {
  const recipe = recipeByKey.get(key)
  if (!recipe) continue
  recipe.published = false
  enforceFreeForMagazinOrigin(recipe)
}

if (createLocal) {
  for (const entry of createRecipes) {
    const recipe = entry.recipe
    const key = `${recipe.year}-${recipe.id}`
    if (recipeByKey.has(key)) continue
    recipes.push(recipe)
    recipeByKey.set(key, recipe)
  }
}

for (const recipe of recipes) {
  enforceFreeForMagazinOrigin(recipe)
}

const redirectsPayload = {
  generatedAt: new Date().toISOString(),
  sourceDocs: 'src/lib/data/data.json',
  sourceRecipes: 'src/lib/data/recipes.json',
  entries: redirects
    .sort((a, b) => String(a.path).localeCompare(String(b.path)))
    .map((entry) => ({
      modxContentId: entry.modxContentId,
      path: entry.path,
      year: entry.year,
      id: entry.id,
    })),
}

// Hard guarantee: any RS recipe referenced by a magazine redirect target
// is marked free, regardless of winner/loser/publication state.
for (const entry of redirectsPayload.entries) {
  const key = `${entry.year}-${entry.id}`
  const recipe = recipeByKey.get(key)
  if (recipe) recipe.free = true
}

const auditPayload = {
  generatedAt: redirectsPayload.generatedAt,
  summary: {
    magazineCandidates: magazineCandidates.length,
    redirects: redirects.length,
    unpublishCount: losersToUnpublish.size,
    createDrafts: createRecipes.length,
    unresolvedCategoryDrafts: uncategorizedRecipes.length,
    applyLocal,
    createLocal,
  },
  entries: audit,
}

const createReviewPayload = {
  generatedAt: redirectsPayload.generatedAt,
  instructions: 'Review parsed MODX->RS recipes before import/write.',
  entries: createRecipes.map((entry) => ({
    key: entry.key,
    sourcePath: entry.sourcePath,
    recipe: entry.recipe,
    categoryDecision: entry.categoryDecision,
  })),
}

const uncategorizedReviewPayload = {
  generatedAt: redirectsPayload.generatedAt,
  instructions:
    'Set category for each entry (entry.category or entry.recipe.category), then run: npm run recipes:uncategorized:import',
  entries: uncategorizedRecipes.map((entry) => ({
    key: entry.key,
    sourcePath: entry.sourcePath,
    modxContentId: entry.modxContentId,
    reason: entry.reason,
    categoryDecision: entry.categoryDecision,
    recipe: entry.recipe,
  })),
}

writeJson(REDIRECTS_PATH, redirectsPayload)
writeJson(AUDIT_PATH, auditPayload)
writeJson(CREATE_REVIEW_PATH, createReviewPayload)
writeJson(UNCATEGORIZED_REVIEW_PATH, uncategorizedReviewPayload)

if (applyLocal || createLocal) {
  writeJson(RECIPES_PATH, recipes)
}

console.log(
  `dedupe complete: candidates=${magazineCandidates.length}, redirects=${redirects.length}, unpublish=${losersToUnpublish.size}, createDrafts=${createRecipes.length}, unresolved=${uncategorizedRecipes.length}, applyLocal=${applyLocal}, createLocal=${createLocal}`
)
