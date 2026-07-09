import { normalizeText } from './modxToRsParser.js'

/**
 * @typedef {object} CandidateLike
 * @property {string} id
 * @property {number} year
 * @property {string | null | undefined} [author]
 * @property {string | { src?: string | null } | null | undefined} [video]
 * @property {Array<{
 *   energy?: number | null
 *   protein?: number | null
 *   fat?: number | null
 *   saturatedFat?: number | null
 *   carbs?: number | null
 *   fiber?: number | null
 * }> | null | undefined} [nutritionTables]
 * @property {Array<{
 *   nutritionTables?: Array<{
 *     energy?: number | null
 *     protein?: number | null
 *     fat?: number | null
 *     saturatedFat?: number | null
 *     carbs?: number | null
 *     fiber?: number | null
 *   }> | null
 * }> | null | undefined} [subRecipes]
 */

const NUTRITION_KEYS = ['energy', 'protein', 'fat', 'saturatedFat', 'carbs', 'fiber']

function tokenizeTitle(value, normalizeTextFn) {
  return normalizeTextFn(value).split(/\s+/).filter(Boolean)
}

/**
 * True when `needle` appears as a contiguous run of whole words inside `haystack`.
 * Word-boundary aware — unlike a raw substring test, „sült csirke“ is NOT contained
 * in „sült csirkemellcsíkok…“ (`csirke` ≠ the whole word `csirkemellcsíkok`).
 *
 * @param {string[]} haystack
 * @param {string[]} needle
 * @returns {boolean}
 */
function containsWordRun(haystack, needle) {
  if (needle.length === 0 || needle.length > haystack.length) return false
  for (let start = 0; start + needle.length <= haystack.length; start += 1) {
    let match = true
    for (let i = 0; i < needle.length; i += 1) {
      if (haystack[start + i] !== needle[i]) {
        match = false
        break
      }
    }
    if (match) return true
  }
  return false
}

/**
 * Title similarity for magazine doc ↔ catalogue recipe matching.
 * Single-word doc titles only score on exact equality (avoids „Csokitorta“ → „Céklás… csokitorta“).
 *
 * @param {Record<string, unknown>} doc
 * @param {CandidateLike & { title?: string }} recipe
 * @param {(value: unknown) => string} [normalizeTextFn]
 * @returns {number}
 */
export function titleMatchScore(doc, recipe, normalizeTextFn = normalizeText) {
  const docTitle = normalizeTextFn(doc?.longtitle || doc?.title || '')
  const recipeTitle = normalizeTextFn(recipe?.title || '')
  if (!docTitle || !recipeTitle) return 0
  if (docTitle === recipeTitle) return 100
  const docWords = tokenizeTitle(docTitle, normalizeTextFn)
  const recipeWords = tokenizeTitle(recipeTitle, normalizeTextFn)
  // One title fully contains the other as a run of WHOLE words (not a mid-word
  // substring — see `containsWordRun`), so „Almás pite“ ↔ „Almás pite diétás“ still
  // scores 80, but „Sült csirke“ no longer spuriously matches „Sült csirkemellcsíkok…“.
  if (
    docWords.length >= 2 &&
    (containsWordRun(recipeWords, docWords) || containsWordRun(docWords, recipeWords))
  ) {
    return 80
  }
  const significantDocWords = docWords.filter((w) => w.length > 3)
  if (!significantDocWords.length) return 0
  if (docWords.length === 1) return 0
  const overlap = significantDocWords.filter((w) => recipeTitle.includes(w)).length
  return Math.round((overlap / significantDocWords.length) * 50)
}

/**
 * @param {CandidateLike[]} recipes
 * @param {string} id
 * @returns {CandidateLike[]}
 */
export function publishedRecipesByAliasId(recipes, id) {
  const alias = String(id ?? '').trim()
  if (!alias) return []
  return recipes.filter((recipe) => recipe.published !== false && String(recipe.id) === alias)
}

function countNutritionValuesFromTables(tables) {
  if (!Array.isArray(tables)) return 0
  let count = 0
  for (const table of tables) {
    if (!table || typeof table !== 'object') continue
    for (const key of NUTRITION_KEYS) {
      if (Number.isFinite(table[key])) count += 1
    }
  }
  return count
}

/**
 * Nutrition completeness score:
 * count of finite macro values across all main and sub-recipe nutrition tables.
 * @param {CandidateLike} recipe
 * @returns {number}
 */
export function countNutritionValues(recipe) {
  const mainValues = countNutritionValuesFromTables(recipe?.nutritionTables)
  const subValues = Array.isArray(recipe?.subRecipes)
    ? recipe.subRecipes.reduce(
        (sum, sub) => sum + countNutritionValuesFromTables(sub?.nutritionTables),
        0
      )
    : 0
  return mainValues + subValues
}

/**
 * Parsed magazine recipe has at least one nutrition table row.
 * @param {CandidateLike} recipe
 * @returns {boolean}
 */
export function hasRecipeNutrition(recipe) {
  const nutritionTables = Array.isArray(recipe?.nutritionTables) ? recipe.nutritionTables : []
  return nutritionTables.length > 0
}

/**
 * Parsed magazine recipe has at least one ingredient line.
 * @param {CandidateLike} recipe
 * @returns {boolean}
 */
export function hasRecipeIngredients(recipe) {
  const ingredientGroups = Array.isArray(recipe?.ingredientGroups) ? recipe.ingredientGroups : []
  return ingredientGroups.some(
    (group) =>
      Array.isArray(group?.items) &&
      group.items.some((item) => String(item?.name ?? item?.text ?? '').trim().length > 0)
  )
}

/**
 * Minimum body for a magazine `recept` dedupe candidate (nutrition + ingredients).
 * @param {CandidateLike} recipe
 * @returns {boolean}
 */
export function hasNutritionAndIngredients(recipe) {
  return hasRecipeNutrition(recipe) && hasRecipeIngredients(recipe)
}

/**
 * @param {CandidateLike} recipe
 * @returns {boolean}
 */
export function hasVideo(recipe) {
  if (typeof recipe?.video === 'string') {
    return recipe.video.trim().length > 0
  }
  if (recipe?.video && typeof recipe.video === 'object') {
    return String(recipe.video.src ?? '').trim().length > 0
  }
  return false
}

/**
 * Recipe credited to a real person, not the generic "Receptsarok" placeholder
 * (MODX imports carry author "Receptsarok"; RS booklet copies name the actual author).
 * @param {CandidateLike} recipe
 * @returns {boolean}
 */
export function hasRealAuthor(recipe) {
  const author = String(recipe?.author ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
  return author.length > 0 && author !== 'receptsarok'
}

/**
 * @param {CandidateLike} recipe
 * @returns {{ nutritionScore: number; hasVideo: boolean; year: number; realAuthor: boolean }}
 */
export function scoresFor(recipe) {
  return {
    nutritionScore: countNutritionValues(recipe),
    hasVideo: hasVideo(recipe),
    year: Number.isFinite(recipe?.year) ? recipe.year : 0,
    realAuthor: hasRealAuthor(recipe),
  }
}

/**
 * Tie-break order:
 * 1) Real author (author ≠ "Receptsarok" placeholder)
 * 2) Has video
 * 3) More nutrition values
 * 4) More recent year
 * 5) Deterministic lexical fallback (`{year}-{id}`)
 *
 * @template {CandidateLike} T
 * @param {T} a
 * @param {T} b
 */
export function compareRecipeCandidates(a, b) {
  const aScores = scoresFor(a)
  const bScores = scoresFor(b)

  if (aScores.realAuthor !== bScores.realAuthor) {
    return aScores.realAuthor
      ? { winner: a, loser: b, reason: 'author', winnerScores: aScores, loserScores: bScores }
      : { winner: b, loser: a, reason: 'author', winnerScores: bScores, loserScores: aScores }
  }

  if (aScores.hasVideo !== bScores.hasVideo) {
    return aScores.hasVideo
      ? { winner: a, loser: b, reason: 'video', winnerScores: aScores, loserScores: bScores }
      : { winner: b, loser: a, reason: 'video', winnerScores: bScores, loserScores: aScores }
  }

  if (aScores.nutritionScore !== bScores.nutritionScore) {
    return aScores.nutritionScore > bScores.nutritionScore
      ? { winner: a, loser: b, reason: 'nutrition', winnerScores: aScores, loserScores: bScores }
      : { winner: b, loser: a, reason: 'nutrition', winnerScores: bScores, loserScores: aScores }
  }

  if (aScores.year !== bScores.year) {
    return aScores.year > bScores.year
      ? { winner: a, loser: b, reason: 'year', winnerScores: aScores, loserScores: bScores }
      : { winner: b, loser: a, reason: 'year', winnerScores: bScores, loserScores: aScores }
  }

  const aKey = `${a.year}-${a.id}`
  const bKey = `${b.year}-${b.id}`
  return aKey.localeCompare(bKey) <= 0
    ? { winner: a, loser: b, reason: 'id', winnerScores: aScores, loserScores: bScores }
    : { winner: b, loser: a, reason: 'id', winnerScores: bScores, loserScores: aScores }
}

/**
 * @param {CandidateLike} recipe
 * @returns {boolean}
 */
export function isModxImportRecipe(recipe) {
  return Number.isFinite(recipe?.sourceModxId)
}

/**
 * RS booklet recipe (not created from a MODX import).
 * @param {CandidateLike} recipe
 * @returns {boolean}
 */
export function isRsBookletRecipe(recipe) {
  return !isModxImportRecipe(recipe)
}

/**
 * Redirect / write target when dedupe matches overlap RS booklet and MODX imports.
 * RS booklet `{year}-{id}` wins over MODX path year or newer MODX-import clone.
 *
 * @template {CandidateLike} T
 * @param {T[]} matches
 * @param {T | null | undefined} contentWinner from {@link chooseWinner}
 * @returns {T | null}
 */
export function pickRedirectTarget(matches, contentWinner) {
  if (!Array.isArray(matches) || matches.length === 0) return contentWinner ?? null

  const rsMatches = matches.filter(isRsBookletRecipe)
  if (rsMatches.length === 0) return contentWinner ?? matches[0] ?? null

  const sameId =
    contentWinner?.id != null
      ? rsMatches.filter((recipe) => String(recipe.id) === String(contentWinner.id))
      : []
  const pool = sameId.length > 0 ? sameId : rsMatches
  return chooseWinner(pool).winner ?? rsMatches[0] ?? contentWinner ?? null
}

/**
 * @template {CandidateLike} T
 * @param {T[]} candidates
 * @returns {{ winner: T | null; reason: 'author' | 'video' | 'nutrition' | 'year' | 'id' | null }}
 */
export function chooseWinner(candidates) {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return { winner: null, reason: null }
  }
  let winner = candidates[0]
  /** @type {'author' | 'video' | 'nutrition' | 'year' | 'id'} */
  let reason = 'id'
  for (let i = 1; i < candidates.length; i += 1) {
    const result = compareRecipeCandidates(winner, candidates[i])
    winner = result.winner
    reason = result.reason
  }
  return { winner, reason }
}
