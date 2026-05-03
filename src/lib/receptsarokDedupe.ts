import type { Recipe, SubRecipe, NutritionValues } from '$lib/receptsarok'

type CandidateLike = {
  id: string
  year: number
  video?: string | null
  nutritionTables?: NutritionValues[] | null
  subRecipes?: SubRecipe[] | null
}

function countNutritionTables(recipe: CandidateLike): number {
  const mainTables = Array.isArray(recipe.nutritionTables) ? recipe.nutritionTables.length : 0
  const subTables = Array.isArray(recipe.subRecipes)
    ? recipe.subRecipes.reduce((sum, sub) => sum + (Array.isArray(sub.nutritionTables) ? sub.nutritionTables.length : 0), 0)
    : 0
  return mainTables + subTables
}

function hasVideo(recipe: CandidateLike): boolean {
  return typeof recipe.video === 'string' && recipe.video.trim().length > 0
}

export type CompareRecipeScores = {
  nutritionScore: number
  hasVideo: boolean
}

export type CompareRecipeResult<T extends CandidateLike> = {
  winner: T
  loser: T
  reason: 'nutrition' | 'video' | 'id'
  winnerScores: CompareRecipeScores
  loserScores: CompareRecipeScores
}

function scoresFor(recipe: CandidateLike): CompareRecipeScores {
  return {
    nutritionScore: countNutritionTables(recipe),
    hasVideo: hasVideo(recipe),
  }
}

/**
 * Tie-break order:
 * 1) More nutrition tables (main + sub-recipes)
 * 2) Has video
 * 3) Deterministic lexical fallback (`{year}-{id}`)
 */
export function compareRecipeCandidates<T extends CandidateLike>(a: T, b: T): CompareRecipeResult<T> {
  const aScores = scoresFor(a)
  const bScores = scoresFor(b)

  if (aScores.nutritionScore !== bScores.nutritionScore) {
    return aScores.nutritionScore > bScores.nutritionScore
      ? { winner: a, loser: b, reason: 'nutrition', winnerScores: aScores, loserScores: bScores }
      : { winner: b, loser: a, reason: 'nutrition', winnerScores: bScores, loserScores: aScores }
  }

  if (aScores.hasVideo !== bScores.hasVideo) {
    return aScores.hasVideo
      ? { winner: a, loser: b, reason: 'video', winnerScores: aScores, loserScores: bScores }
      : { winner: b, loser: a, reason: 'video', winnerScores: bScores, loserScores: aScores }
  }

  const aKey = `${a.year}-${a.id}`
  const bKey = `${b.year}-${b.id}`
  return aKey.localeCompare(bKey) <= 0
    ? { winner: a, loser: b, reason: 'id', winnerScores: aScores, loserScores: bScores }
    : { winner: b, loser: a, reason: 'id', winnerScores: bScores, loserScores: aScores }
}

export function chooseWinner<T extends CandidateLike>(candidates: T[]): T | null {
  if (!Array.isArray(candidates) || candidates.length === 0) return null
  let winner = candidates[0]
  for (let i = 1; i < candidates.length; i += 1) {
    winner = compareRecipeCandidates(winner, candidates[i]).winner
  }
  return winner
}

export type { CandidateLike }
export type RecipeDedupeCandidate = Recipe
