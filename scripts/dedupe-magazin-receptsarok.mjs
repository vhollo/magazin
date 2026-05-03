import fs from 'node:fs'
import path from 'node:path'

const DATA_PATH = path.resolve(process.cwd(), 'src/lib/data/data.json')
const RECIPES_PATH = path.resolve(process.cwd(), 'src/lib/data/recipes.json')
const REDIRECTS_PATH = path.resolve(process.cwd(), 'src/lib/data/receptsarok-redirects.json')
const AUDIT_PATH = path.resolve(process.cwd(), 'src/lib/data/receptsarok-dedupe-audit.json')
const CREATE_REVIEW_PATH = path.resolve(process.cwd(), 'src/lib/data/receptsarok-create-review.json')

const applyLocal = process.argv.includes('--apply-local')
const createLocal = process.argv.includes('--create-local')

function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
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

function parseYearFromMagazinPath(pathValue) {
  const tokens = String(pathValue ?? '').split(/[^0-9]+/).filter(Boolean)
  for (const token of tokens) {
    if (/^20\d{2}$/.test(token)) return Number(token)
  }
  for (const token of tokens) {
    if (/^\d{4}$/.test(token)) {
      const year = Number(`20${token.slice(0, 2)}`)
      if (year >= 2000 && year <= 2099) return year
    }
  }
  return new Date().getFullYear()
}

function countNutritionTables(recipe) {
  const main = Array.isArray(recipe?.nutritionTables) ? recipe.nutritionTables.length : 0
  const subs = Array.isArray(recipe?.subRecipes)
    ? recipe.subRecipes.reduce(
        (sum, sub) => sum + (Array.isArray(sub?.nutritionTables) ? sub.nutritionTables.length : 0),
        0
      )
    : 0
  return main + subs
}

function hasVideo(recipe) {
  return typeof recipe?.video === 'string' && recipe.video.trim().length > 0
}

function toEpoch(value) {
  const epoch = Date.parse(String(value ?? ''))
  return Number.isFinite(epoch) ? epoch : 0
}

function compareRecipeCandidates(a, b) {
  const aNutrition = countNutritionTables(a)
  const bNutrition = countNutritionTables(b)
  if (aNutrition !== bNutrition) {
    return aNutrition > bNutrition ? { winner: a, loser: b, reason: 'nutrition' } : { winner: b, loser: a, reason: 'nutrition' }
  }

  const aVideo = hasVideo(a)
  const bVideo = hasVideo(b)
  if (aVideo !== bVideo) {
    return aVideo ? { winner: a, loser: b, reason: 'video' } : { winner: b, loser: a, reason: 'video' }
  }

  const aUpdated = toEpoch(a?.updatedAt)
  const bUpdated = toEpoch(b?.updatedAt)
  if (aUpdated !== bUpdated) {
    return aUpdated > bUpdated ? { winner: a, loser: b, reason: 'updatedAt' } : { winner: b, loser: a, reason: 'updatedAt' }
  }

  const aKey = `${a.year}-${a.id}`
  const bKey = `${b.year}-${b.id}`
  return aKey.localeCompare(bKey) <= 0
    ? { winner: a, loser: b, reason: 'id' }
    : { winner: b, loser: a, reason: 'id' }
}

function chooseWinner(candidates) {
  let winner = candidates[0]
  let reason = 'id'
  for (let i = 1; i < candidates.length; i += 1) {
    const result = compareRecipeCandidates(winner, candidates[i])
    winner = result.winner
    reason = result.reason
  }
  return { winner, reason }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`)
}

const docs = readJson(DATA_PATH)
const recipes = readJson(RECIPES_PATH)

if (!Array.isArray(docs)) throw new Error('data.json must be an array')
if (!Array.isArray(recipes)) throw new Error('recipes.json must be an array')

const magazineCandidates = docs.filter((doc) => {
  const tags = Array.isArray(doc?.tv?.tags) ? doc.tv.tags : []
  return tags.length === 1 && tags[0] === 'recept'
})

const redirects = []
const createDrafts = []
const audit = []
const recipeByKey = new Map(recipes.map((r) => [`${r.year}-${r.id}`, r]))
const losersToUnpublish = new Set()

function enforceFreeForMagazinOrigin(recipe) {
  if (Number.isFinite(recipe?.sourceModxId)) {
    recipe.free = true
  }
}

for (const doc of magazineCandidates) {
  const aliasNorm = normalizeText(doc.alias)
  const docTitle = doc.longtitle || doc.title || ''
  const matches = recipes
    .filter((recipe) => recipe.published !== false)
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

  redirects.push({
    modxContentId: doc.id,
    path: doc.path,
    year,
    id,
  })

  const key = `${year}-${id}`
  if (!recipeByKey.has(key)) {
    createDrafts.push({
      key,
      year,
      id,
      title: doc.longtitle || doc.title || '',
      sourceModxId: doc.id,
      sourcePath: doc.path,
      author:
        Array.isArray(doc?.tv?.szerzo) && doc.tv.szerzo.length > 0
          ? String(doc.tv.szerzo[0]?.name ?? '')
          : '',
      free: true,
      note: 'Fill ingredientGroups, nutritionTables, instructions manually before publish.',
    })
  }
  audit.push({
    type: 'new-rs-required',
    modxContentId: doc.id,
    modxPath: doc.path,
    target: key,
  })
}

for (const key of losersToUnpublish) {
  const recipe = recipeByKey.get(key)
  if (!recipe) continue
  recipe.published = false
  enforceFreeForMagazinOrigin(recipe)
}

if (createLocal) {
  for (const draft of createDrafts) {
    const key = `${draft.year}-${draft.id}`
    if (recipeByKey.has(key)) continue
    recipes.push({
      id: draft.id,
      year: draft.year,
      title: draft.title,
      author: draft.author,
      category: '',
      servings: { amount: 0, unit: '' },
      energy: 0,
      protein: 0,
      fat: 0,
      saturatedFat: 0,
      carbs: 0,
      fiber: 0,
      nutritionTables: [],
      ingredientGroups: [],
      ingredientNames: [],
      searchTerms: tokenize(draft.title),
      instructions: [],
      image: null,
      subRecipes: [],
      hasSubRecipes: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      free: true,
      sourceModxId: draft.sourceModxId,
    })
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
    createDrafts: createDrafts.length,
    applyLocal,
    createLocal,
  },
  entries: audit,
}

const createReviewPayload = {
  generatedAt: redirectsPayload.generatedAt,
  instructions: 'Review and fill required recipe body fields, then import to Firestore/recipes.json.',
  entries: createDrafts,
}

writeJson(REDIRECTS_PATH, redirectsPayload)
writeJson(AUDIT_PATH, auditPayload)
writeJson(CREATE_REVIEW_PATH, createReviewPayload)

if (applyLocal || createLocal) {
  writeJson(RECIPES_PATH, recipes)
}

console.log(
  `dedupe complete: candidates=${magazineCandidates.length}, redirects=${redirects.length}, unpublish=${losersToUnpublish.size}, createDrafts=${createDrafts.length}, applyLocal=${applyLocal}, createLocal=${createLocal}`
)
