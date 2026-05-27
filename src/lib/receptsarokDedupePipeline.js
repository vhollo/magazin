// @ts-nocheck
import fs from 'node:fs'
import path from 'node:path'
import { chooseWinner, pickRedirectTarget } from './receptsarokDedupeShared.js'
import {
  buildRecipeFromModxDoc,
  buildRecipesFromModxDoc,
  isDescriptionAuthorCompatible,
  parseYearFromMagazinPath,
  normalizeText,
} from './modxToRsParser.js'
import { predictRecipeCategory } from './receptsarokCategoryPredictor.js'

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

function tokenize(value, normalizeText) {
  return normalizeText(value).split(/\s+/).filter(Boolean)
}

function titleMatchScore(doc, recipe, normalizeText) {
  const docTitle = normalizeText(doc.longtitle || doc.title || '')
  const recipeTitle = normalizeText(recipe.title || '')
  if (!docTitle || !recipeTitle) return 0
  if (docTitle === recipeTitle) return 100
  if (recipeTitle.includes(docTitle) || docTitle.includes(recipeTitle)) return 80
  const docWords = tokenize(docTitle, normalizeText).filter((w) => w.length > 3)
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

function hasReceptTag(doc, normalizeText) {
  const tags = Array.isArray(doc?.tv?.tags) ? doc.tv.tags : []
  return tags.length === 1 && normalizeText(tags[0]) === 'recept'
}

function hasRequiredRecipeBody(recipe) {
  const ingredientGroups = Array.isArray(recipe?.ingredientGroups) ? recipe.ingredientGroups : []
  const instructions = Array.isArray(recipe?.instructions) ? recipe.instructions : []
  const nutritionTables = Array.isArray(recipe?.nutritionTables) ? recipe.nutritionTables : []
  return (
    ingredientGroups.length > 0 &&
    instructions.length > 0 &&
    nutritionTables.length > 0
  )
}

function slugFromTitle(title) {
  const normalized = normalizeText(title)
  return normalized
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function uniqueByNormalized(values) {
  const out = []
  const seen = new Set()
  for (const value of values) {
    const clean = String(value ?? '').trim()
    if (!clean) continue
    const key = normalizeText(clean)
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(clean)
  }
  return out
}

function deriveSearchTerms(title, ingredientNames) {
  const words = [
    ...normalizeText(title).split(/\s+/),
    ...ingredientNames.flatMap((name) => normalizeText(name).split(/\s+/)),
  ].filter((token) => token.length >= 3)
  return uniqueByNormalized(words)
}

function nextUniqueRecipeId({ baseId, year, recipeByKey, plannedKeys }) {
  const normalizedBase = String(baseId ?? '').trim() || 'recept'
  let candidate = normalizedBase
  let suffix = 2
  while (recipeByKey.has(`${year}-${candidate}`) || plannedKeys.has(`${year}-${candidate}`)) {
    candidate = `${normalizedBase}-${suffix}`
    suffix += 1
  }
  return candidate
}

function convertSubRecipesToParsedList({ doc, parentRecipe, parentCategoryDecision, categoryByKey, predictCategory, recipeByKey, plannedKeys }) {
  const subRecipes = Array.isArray(parentRecipe?.subRecipes) ? parentRecipe.subRecipes : []
  if (subRecipes.length === 0) return []

  const year = Number(parentRecipe?.year)
  if (!Number.isFinite(year)) return []
  const converted = []
  for (const sub of subRecipes) {
    const title = String(sub?.title ?? '').trim()
    if (!title) continue
    const ingredientGroups = Array.isArray(sub?.ingredientGroups) ? sub.ingredientGroups : []
    const instructions = Array.isArray(sub?.instructions) ? sub.instructions : []
    const nutritionTables = Array.isArray(sub?.nutritionTables) ? sub.nutritionTables : []
    const candidateBody = { ingredientGroups, instructions, nutritionTables }
    if (!hasRequiredRecipeBody(candidateBody)) continue

    const baseId = slugFromTitle(title)
    if (!baseId) continue
    const id = nextUniqueRecipeId({ baseId, year, recipeByKey, plannedKeys })
    const key = `${year}-${id}`
    plannedKeys.add(key)

    const ingredientNames = uniqueByNormalized(
      ingredientGroups.flatMap((group) =>
        Array.isArray(group?.items) ? group.items.map((item) => item?.name) : []
      )
    )
    const categoryDecision = (() => {
      const manual = categoryByKey.get(`${year}/${id}`) || categoryByKey.get(`${year}-${id}`)
      if (manual) {
        return {
          resolved: true,
          category: manual,
          categorySource: 'manual',
          confidence: 1,
          margin: 1,
          matchedFeatures: [],
          reason: 'manual-map',
        }
      }
      const prediction = predictCategory({
        title,
        ingredientNames,
        instructions,
        sourcePath: doc?.path,
      })
      if (prediction?.resolved && prediction?.category) {
        return {
          resolved: true,
          category: prediction.category,
          categorySource: 'predicted',
          confidence: Number(prediction.confidence ?? 0),
          margin: Number(prediction.margin ?? 0),
          matchedFeatures: Array.isArray(prediction.matchedFeatures) ? prediction.matchedFeatures : [],
          reason: prediction.reason || 'predicted',
        }
      }
      return {
        resolved: false,
        category: parentCategoryDecision?.category || null,
        categorySource: parentCategoryDecision?.category ? 'parent-fallback' : 'unresolved',
        confidence: Number(parentCategoryDecision?.confidence ?? 0),
        margin: Number(parentCategoryDecision?.margin ?? 0),
        matchedFeatures: Array.isArray(parentCategoryDecision?.matchedFeatures)
          ? parentCategoryDecision.matchedFeatures
          : [],
        reason: parentCategoryDecision?.category ? 'parent-category-fallback' : 'prediction-unresolved',
      }
    })()

    const firstNutrition = nutritionTables[0] || {
      energy: null,
      protein: null,
      fat: null,
      saturatedFat: null,
      carbs: null,
      fiber: null,
    }
    const recipe = {
      id,
      year,
      title,
      author: String(parentRecipe?.author ?? '').trim(),
      category: categoryDecision.category || '',
      servings:
        sub?.servings && typeof sub.servings === 'object'
          ? {
              amount: Number(sub.servings.amount ?? 0),
              unit: String(sub.servings.unit ?? ''),
            }
          : parentRecipe?.servings || { amount: 0, unit: '' },
      energy: firstNutrition.energy ?? null,
      protein: firstNutrition.protein ?? null,
      fat: firstNutrition.fat ?? null,
      saturatedFat: firstNutrition.saturatedFat ?? null,
      carbs: firstNutrition.carbs ?? null,
      fiber: firstNutrition.fiber ?? null,
      nutritionTables,
      ingredientGroups,
      ingredientNames,
      searchTerms: deriveSearchTerms(title, ingredientNames),
      instructions,
      image: parentRecipe?.image ?? null,
      img: parentRecipe?.img && typeof parentRecipe.img === 'object' ? parentRecipe.img : undefined,
      subRecipes: [],
      hasSubRecipes: false,
      createdAt: parentRecipe?.createdAt || new Date().toISOString(),
      updatedAt: parentRecipe?.updatedAt || new Date().toISOString(),
      free: true,
      video: parentRecipe?.video,
      sourceModxId: Number.isFinite(parentRecipe?.sourceModxId) ? parentRecipe.sourceModxId : undefined,
    }
    converted.push({ recipe, categoryDecision })
  }
  return converted
}

function enforceFreeForMagazinOrigin(recipe) {
  if (Number.isFinite(recipe?.sourceModxId)) {
    recipe.free = true
  }
}

function loadCategoryReviewMap() {
  const categoryReview = fs.existsSync(CATEGORY_REVIEW_PATH) ? readJson(CATEGORY_REVIEW_PATH) : { entries: [] }
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
  return categoryByKey
}

export async function runMagazinRecipeDedupe({ docs, applyLocal = false, createLocal = false } = {}) {
  if (!Array.isArray(docs)) throw new Error('docs must be an array')
  if (!fs.existsSync(RECIPES_PATH)) throw new Error(`Missing required input file: ${RECIPES_PATH}`)

  const recipes = readJson(RECIPES_PATH)
  if (!Array.isArray(recipes)) throw new Error('recipes.json must be an array')

  const categoryByKey = loadCategoryReviewMap()
  const magazineCandidates = docs.filter((doc) => hasReceptTag(doc, normalizeText))
  const redirects = []
  const createRecipes = []
  const uncategorizedRecipes = []
  const audit = []
  const recipeByKey = new Map(recipes.map((r) => [`${r.year}-${r.id}`, r]))
  const losersToUnpublish = new Set()
  const plannedCreateKeys = new Set()

  for (const doc of magazineCandidates) {
    const aliasNorm = normalizeText(doc.alias)
    const docTitle = doc.longtitle || doc.title || ''
    const matches = recipes
      .filter((recipe) => recipe.published !== false)
      .filter((recipe) => isDescriptionAuthorCompatible(doc?.description, recipe?.author))
      .map((recipe) => {
        const score =
          titleMatchScore(doc, recipe, normalizeText) +
          (normalizeText(recipe.id) === aliasNorm && aliasNorm ? 40 : 0)
        return { recipe, score }
      })
      .filter((entry) => entry.score >= 60)
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.recipe)

    if (matches.length > 0) {
      const { winner: contentWinner, reason } = chooseWinner(matches)
      const winner = pickRedirectTarget(matches, contentWinner)
      if (!winner) continue

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
            instructions: Array.isArray(winner.instructions) ? winner.instructions : [],
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
      const parsedList = buildRecipesFromModxDoc(doc, {
        id,
        categoryByKey,
        predictCategory: predictRecipeCategory,
      })
      const shouldRedirectToRecipe = parsedList.length === 1
      let redirectPushed = false
      let collectionSplitAudit = false

      for (const { recipe: parsedRecipe, categoryDecision } of parsedList) {
        const recipeKey = `${parsedRecipe.year}-${parsedRecipe.id}`

        if (!categoryDecision.resolved || !categoryDecision.category) {
          const reviewRecipe = { ...parsedRecipe }
          delete reviewRecipe.category
          uncategorizedRecipes.push({
            key: recipeKey,
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
            target: recipeKey,
            categoryDecision,
          })
          continue
        }
        if (!hasRequiredRecipeBody(parsedRecipe)) {
          const subRecipeParsedList = convertSubRecipesToParsedList({
            doc,
            parentRecipe: parsedRecipe,
            parentCategoryDecision: categoryDecision,
            categoryByKey,
            predictCategory: predictRecipeCategory,
            recipeByKey,
            plannedKeys: plannedCreateKeys,
          })
          if (subRecipeParsedList.length > 0) {
            let extractedCount = 0
            for (const { recipe: subRecipe, categoryDecision: subCategoryDecision } of subRecipeParsedList) {
              const subRecipeKey = `${subRecipe.year}-${subRecipe.id}`
              if (!subCategoryDecision.resolved || !subCategoryDecision.category) {
                const reviewRecipe = { ...subRecipe }
                delete reviewRecipe.category
                uncategorizedRecipes.push({
                  key: subRecipeKey,
                  sourcePath: doc.path,
                  modxContentId: doc.id,
                  reason: subCategoryDecision.reason || 'subrecipe-category-unresolved',
                  categoryDecision: subCategoryDecision,
                  recipe: reviewRecipe,
                })
                audit.push({
                  type: 'new-rs-subrecipe-category-unresolved',
                  modxContentId: doc.id,
                  modxPath: doc.path,
                  target: subRecipeKey,
                  categoryDecision: subCategoryDecision,
                })
                continue
              }
              createRecipes.push({
                key: subRecipeKey,
                sourcePath: doc.path,
                recipe: subRecipe,
                categoryDecision: subCategoryDecision,
              })
              extractedCount += 1
            }
            audit.push({
              type: 'new-rs-subrecipes-extracted',
              modxContentId: doc.id,
              modxPath: doc.path,
              source: recipeKey,
              extractedTargets: subRecipeParsedList.map((entry) => `${entry.recipe.year}-${entry.recipe.id}`),
              extractedCount,
              note: 'parent-remains-magazine',
            })
            continue
          }
          uncategorizedRecipes.push({
            key: recipeKey,
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
            target: recipeKey,
            categoryDecision: {
              ...categoryDecision,
              reason: 'parse-incomplete',
            },
          })
          continue
        }

        if (shouldRedirectToRecipe && !redirectPushed) {
          redirects.push({
            modxContentId: doc.id,
            path: doc.path,
            year: parsedRecipe.year,
            id: parsedRecipe.id,
          })
          redirectPushed = true
        }
        createRecipes.push({
          key: recipeKey,
          sourcePath: doc.path,
          recipe: parsedRecipe,
          categoryDecision,
        })
        plannedCreateKeys.add(recipeKey)
        if (parsedList.length > 1 && !collectionSplitAudit) {
          collectionSplitAudit = true
          audit.push({
            type: 'new-rs-collection-split',
            modxContentId: doc.id,
            modxPath: doc.path,
            sourceAlias: id,
            targets: parsedList.map((e) => `${e.recipe.year}-${e.recipe.id}`),
          })
        }
      }
    } else {
      const existing = recipeByKey.get(key)
      redirects.push({
        modxContentId: doc.id,
        path: doc.path,
        year: existing?.year ?? year,
        id: existing?.id ?? id,
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

  const generatedAt = new Date().toISOString()
  const redirectsPayload = {
    generatedAt,
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

  for (const entry of redirectsPayload.entries) {
    const key = `${entry.year}-${entry.id}`
    const recipe = recipeByKey.get(key)
    if (recipe) recipe.free = true
  }

  const auditPayload = {
    generatedAt,
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
    generatedAt,
    instructions: 'Review parsed MODX->RS recipes before import/write.',
    entries: createRecipes.map((entry) => ({
      key: entry.key,
      sourcePath: entry.sourcePath,
      recipe: entry.recipe,
      categoryDecision: entry.categoryDecision,
    })),
  }

  const uncategorizedReviewPayload = {
    generatedAt,
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

  return {
    summary: auditPayload.summary,
    redirectsPayload,
    auditPayload,
    createReviewPayload,
    uncategorizedReviewPayload,
  }
}

export async function runMagazinRecipeDedupeFromDataFile({ applyLocal = false, createLocal = false, allowMissingData = false } = {}) {
  if (!fs.existsSync(DATA_PATH)) {
    if (allowMissingData) {
      return null
    }
    throw new Error(
      `Missing ${DATA_PATH} — magazine articles now live in Firestore; run npm run sync:modx:full or pass docs to runMagazinRecipeDedupe()`
    )
  }
  const docs = readJson(DATA_PATH)
  if (!Array.isArray(docs)) throw new Error('data.json must be an array')
  return runMagazinRecipeDedupe({ docs, applyLocal, createLocal })
}
