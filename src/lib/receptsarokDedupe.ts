import type { Recipe, SubRecipe, NutritionValues } from '$lib/receptsarok'
import {
  compareRecipeCandidates as compareRecipeCandidatesShared,
  chooseWinner as chooseWinnerShared,
  pickRedirectTarget as pickRedirectTargetShared,
} from './receptsarokDedupeShared.js'

type CandidateLike = {
  id: string
  year: number
  video?: string | { src?: string | null } | null
  nutritionTables?: NutritionValues[] | null
  subRecipes?: SubRecipe[] | null
}

export type CompareRecipeScores = {
  nutritionScore: number
  hasVideo: boolean
  year: number
}

export type CompareRecipeResult<T extends CandidateLike> = {
  winner: T
  loser: T
  reason: 'video' | 'nutrition' | 'year' | 'id'
  winnerScores: CompareRecipeScores
  loserScores: CompareRecipeScores
}

/**
 * Tie-break order:
 * 1) Has video
 * 2) More nutrition values (main + sub-recipes)
 * 3) More recent year
 * 4) Deterministic lexical fallback (`{year}-{id}`)
 */
export function compareRecipeCandidates<T extends CandidateLike>(a: T, b: T): CompareRecipeResult<T> {
  return compareRecipeCandidatesShared(a, b) as CompareRecipeResult<T>
}

export function chooseWinner<T extends CandidateLike>(candidates: T[]): T | null {
  return chooseWinnerShared(candidates).winner as T | null
}

export function pickRedirectTarget<T extends CandidateLike>(
  matches: T[],
  contentWinner: T | null | undefined
): T | null {
  return pickRedirectTargetShared(matches, contentWinner) as T | null
}

export type { CandidateLike }
export type RecipeDedupeCandidate = Recipe
