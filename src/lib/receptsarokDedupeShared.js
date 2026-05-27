/**
 * @typedef {object} CandidateLike
 * @property {string} id
 * @property {number} year
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
 * @param {CandidateLike} recipe
 * @returns {{ nutritionScore: number; hasVideo: boolean; year: number }}
 */
export function scoresFor(recipe) {
  return {
    nutritionScore: countNutritionValues(recipe),
    hasVideo: hasVideo(recipe),
    year: Number.isFinite(recipe?.year) ? recipe.year : 0,
  }
}

/**
 * Tie-break order:
 * 1) Has video
 * 2) More nutrition values
 * 3) More recent year
 * 4) Deterministic lexical fallback (`{year}-{id}`)
 *
 * @template {CandidateLike} T
 * @param {T} a
 * @param {T} b
 */
export function compareRecipeCandidates(a, b) {
  const aScores = scoresFor(a)
  const bScores = scoresFor(b)

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
 * @returns {{ winner: T | null; reason: 'video' | 'nutrition' | 'year' | 'id' | null }}
 */
export function chooseWinner(candidates) {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return { winner: null, reason: null }
  }
  let winner = candidates[0]
  /** @type {'video' | 'nutrition' | 'year' | 'id'} */
  let reason = 'id'
  for (let i = 1; i < candidates.length; i += 1) {
    const result = compareRecipeCandidates(winner, candidates[i])
    winner = result.winner
    reason = result.reason
  }
  return { winner, reason }
}
