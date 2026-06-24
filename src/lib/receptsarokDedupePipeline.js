// @ts-nocheck
import fs from 'node:fs'
import path from 'node:path'
import {
  chooseWinner,
  hasNutritionAndIngredients,
  pickRedirectTarget,
  publishedRecipesByAliasId,
  titleMatchScore,
} from './receptsarokDedupeShared.js'
import {
  buildRecipeFromModxDoc,
  buildRecipesFromModxDoc,
  isDescriptionAuthorCompatible,
  normalizeText,
} from './modxToRsParser.js'
import { predictRecipeCategory } from './receptsarokCategoryPredictor.js'
import { stringifyRecipesJson } from './recipesJsonFormat.js'

const DATA_PATH = path.resolve(process.cwd(), 'scripts/data/data.json')
const RECIPES_PATH = path.resolve(process.cwd(), 'src/lib/data/recipes.json')
const REDIRECTS_PATH = path.resolve(process.cwd(), 'src/lib/data/receptsarok-redirects.json')
const AUDIT_PATH = path.resolve(process.cwd(), 'scripts/data/receptsarok-dedupe-audit.json')
const CREATE_REVIEW_PATH = path.resolve(process.cwd(), 'scripts/data/receptsarok-create-review.json')
const UNCATEGORIZED_REVIEW_PATH = path.resolve(
  process.cwd(),
  'scripts/data/receptsarok-uncategorized-review.json'
)
const CATEGORY_REVIEW_PATH = path.resolve(
  process.cwd(),
  'scripts/data/magazin-recipe-category-review.json'
)

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
  const instructions = Array.isArray(recipe?.instructions) ? recipe.instructions : []
  return hasNutritionAndIngredients(recipe) && instructions.length > 0
}

function auditSkipNoRecipeBody(audit, { modxContentId, modxPath, title, target }) {
  audit.push({
    type: 'skip-no-recipe-body',
    modxContentId,
    modxPath,
    title,
    target,
  })
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
      img: sub.img ?? (parentRecipe?.img && typeof parentRecipe.img === 'object' ? parentRecipe.img : undefined),
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

function republishModxRedirectTarget(recipe, modxContentId) {
  if (!recipe || recipe.published !== false) return
  if (Number(recipe.sourceModxId) === Number(modxContentId)) {
    delete recipe.published
  }
}

function redirectTargetForAliasPool(aliasMatches, contentWinner) {
  return pickRedirectTarget(aliasMatches, contentWinner) ?? contentWinner ?? aliasMatches[0] ?? null
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

/** MODX content ids that resolve to a published Receptsarok recipe. */
function buildRecipeModxIdSet(recipes, redirectEntries = []) {
  const set = new Set()
  for (const r of recipes) {
    if (r?.published === false) continue
    const src = Number(r?.sourceModxId)
    if (Number.isFinite(src)) set.add(src)
  }
  for (const e of redirectEntries) {
    const id = Number(e?.modxContentId)
    if (Number.isFinite(id)) set.add(id)
  }
  return set
}

export async function runMagazinRecipeDedupe({ docs, applyLocal = false, createLocal = false } = {}) {
  if (!Array.isArray(docs)) throw new Error('docs must be an array')
  if (!fs.existsSync(RECIPES_PATH)) throw new Error(`Missing required input file: ${RECIPES_PATH}`)

  const recipes = readJson(RECIPES_PATH)
  if (!Array.isArray(recipes)) throw new Error('recipes.json must be an array')

  const existingRedirects = fs.existsSync(REDIRECTS_PATH) ? readJson(REDIRECTS_PATH) : { entries: [] }
  const redirectEntries = Array.isArray(existingRedirects?.entries) ? existingRedirects.entries : []
  const recipeModxIds = buildRecipeModxIdSet(recipes, redirectEntries)

  const categoryByKey = loadCategoryReviewMap()
  const magazineCandidates = docs.filter((doc) => hasReceptTag(doc, normalizeText))
  // Recipe-collection articles ("gyűjtőcikk"): multi-tag docs that carry `recept`
  // (so `hasReceptTag` — exactly one tag — skips them) but whose body splits into
  // ≥2 standalone recipes (e.g. `recept-sarok`, `kozeleg-az-eperszezon`). They are
  // not single recipes to redirect, so they go straight to the create/split path.
  const collectionDocIds = new Set()
  const collectionCandidates = []
  for (const doc of docs) {
    if (hasReceptTag(doc, normalizeText)) continue
    const tags = Array.isArray(doc?.tv?.tags) ? doc.tv.tags : []
    if (!tags.some((t) => normalizeText(t) === 'recept')) continue
    const parsed = buildRecipesFromModxDoc(doc, {
      categoryByKey,
      predictCategory: predictRecipeCategory,
      recipeModxIds,
    })
    if (Array.isArray(parsed) && parsed.length >= 2) {
      collectionCandidates.push(doc)
      collectionDocIds.add(doc.id)
    }
  }
  const redirects = []
  const createRecipes = []
  const uncategorizedRecipes = []
  const audit = []
  const recipeByKey = new Map(recipes.map((r) => [`${r.year}-${r.id}`, r]))
  const losersToUnpublish = new Set()
  const plannedCreateKeys = new Set()

  for (const doc of [...magazineCandidates, ...collectionCandidates]) {
    const aliasNorm = normalizeText(doc.alias)
    const docTitle = doc.longtitle || doc.title || ''
    const isCollectionDoc = collectionDocIds.has(doc.id)
    // Collection articles never redirect to a single recipe — skip title matching.
    const matches = isCollectionDoc
      ? []
      : recipes
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
        recipeModxIds,
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

    const aliasMatches = publishedRecipesByAliasId(recipes, id)
    if (aliasMatches.length > 0) {
      const { winner: contentWinner, reason } = chooseWinner(aliasMatches)
      const redirectTarget = redirectTargetForAliasPool(aliasMatches, contentWinner)
      if (!redirectTarget) continue

      republishModxRedirectTarget(
        recipeByKey.get(`${redirectTarget.year}-${redirectTarget.id}`),
        doc.id
      )
      redirects.push({
        modxContentId: doc.id,
        path: doc.path,
        year: redirectTarget.year,
        id: redirectTarget.id,
      })
      audit.push({
        type: 'rs-alias-match',
        modxContentId: doc.id,
        modxPath: doc.path,
        winner: `${redirectTarget.year}-${redirectTarget.id}`,
        matched: aliasMatches.map((r) => `${r.year}-${r.id}`),
        reason,
      })
      continue
    }

    const parsedList = buildRecipesFromModxDoc(doc, {
      id,
      categoryByKey,
      predictCategory: predictRecipeCategory,
      recipeModxIds,
    })
    const shouldRedirectToRecipe = parsedList.length === 1
    let redirectPushed = false
    let collectionSplitAudit = false
    let createdForDoc = false

    for (const { recipe: parsedRecipe, categoryDecision } of parsedList) {
      const recipeKey = `${parsedRecipe.year}-${parsedRecipe.id}`

      if (recipeByKey.has(recipeKey)) {
        republishModxRedirectTarget(recipeByKey.get(recipeKey), doc.id)
        if (shouldRedirectToRecipe && !redirectPushed) {
          const existing = recipeByKey.get(recipeKey)
          const pool = publishedRecipesByAliasId(recipes, parsedRecipe.id)
          const redirectTarget =
            pool.length > 0
              ? redirectTargetForAliasPool(pool, chooseWinner(pool).winner)
              : existing
          if (redirectTarget) {
            redirects.push({
              modxContentId: doc.id,
              path: doc.path,
              year: redirectTarget.year,
              id: redirectTarget.id,
            })
            redirectPushed = true
          }
        }
        audit.push({
          type: 'existing-rs-key',
          modxContentId: doc.id,
          modxPath: doc.path,
          target: recipeKey,
        })
        continue
      }

      if (!hasNutritionAndIngredients(parsedRecipe)) {
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
          auditSkipNoRecipeBody(audit, {
            modxContentId: doc.id,
            modxPath: doc.path,
            title: docTitle,
            target: recipeKey,
          })
          continue
        }

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
          auditSkipNoRecipeBody(audit, {
            modxContentId: doc.id,
            modxPath: doc.path,
            title: docTitle,
            target: recipeKey,
          })
          continue
        }

        if (shouldRedirectToRecipe && !redirectPushed) {
          const rsByAlias = publishedRecipesByAliasId(recipes, parsedRecipe.id)
          const redirectTarget =
            rsByAlias.length > 0
              ? redirectTargetForAliasPool(rsByAlias, chooseWinner(rsByAlias).winner)
              : parsedRecipe
          redirects.push({
            modxContentId: doc.id,
            path: doc.path,
            year: redirectTarget.year,
            id: redirectTarget.id,
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
        createdForDoc = true
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

    if (createdForDoc) {
      audit.push({
        type: 'new-rs-required',
        modxContentId: doc.id,
        modxPath: doc.path,
        target: parsedList.map((e) => `${e.recipe.year}-${e.recipe.id}`).join(','),
        categorySource: 'predicted-or-manual',
      })
    }
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
    sourceDocs: 'scripts/data/data.json',
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
    entries: createRecipes
      .filter((entry) => !recipeByKey.has(entry.key))
      .map((entry) => ({
        key: entry.key,
        sourcePath: entry.sourcePath,
        recipe: entry.recipe,
        categoryDecision: entry.categoryDecision,
      })),
  }

  const uncategorizedReviewPayload = {
    generatedAt,
    instructions:
      'Only parsed magazine recipes with nutrition tables and ingredients appear here. Set entry.category (or entry.recipe.category), then run: npm run recipes:uncategorized:import',
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
    fs.writeFileSync(RECIPES_PATH, stringifyRecipesJson(recipes))
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
