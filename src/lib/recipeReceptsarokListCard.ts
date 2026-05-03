import type { Recipe, RecipeLayoutEntry } from '$lib/receptsarok'
import {
  isRecipeFree,
  recipeDetailSegments,
  recipeHeroToCardImg,
} from '$lib/receptsarok'

type RecipeListExtra = (Recipe | RecipeLayoutEntry) & {
  ellipsis?: string
}

export function recipeNutritionEllipsisHtml(r: Recipe | RecipeLayoutEntry): string {
  const first = 'nutritionTables' in r && r.nutritionTables?.length ? r.nutritionTables[0] : undefined
  const energy = first?.energy ?? r.energy
  const protein = first?.protein ?? r.protein
  const fat = first?.fat ?? r.fat
  const carbs = first?.carbs ?? r.carbs
  const label = first?.label?.trim() || '1 adag tápanyagtartalma:'

  if (
    typeof energy !== 'number' &&
    typeof protein !== 'number' &&
    typeof fat !== 'number' &&
    typeof carbs !== 'number'
  ) {
    return `<p class="text-sm opacity-80">Receptsarok · ${r.category}${r.author?.trim() ? ` · ${r.author.trim()}` : ''}</p>`
  }

  const value = (n: number | null | undefined, unit: string) =>
    typeof n === 'number' ? `${n} ${unit}` : '—'

  return `<table border="0"><thead><tr><th colspan="4">${label}</th></tr></thead><tbody><tr><th>Energia</th><th>Fehérje</th><th>Zsír</th><th>Szénhidrát</th></tr><tr><td>${value(energy, 'kcal')}</td><td>${value(protein, 'g')}</td><td>${value(fat, 'g')}</td><td>${value(carbs, 'g')}</td></tr></tbody></table>`
}

export function recipeListDescriptionLine(r: Recipe | RecipeLayoutEntry): string {
  const bits: string[] = []
  if (typeof r.energy === 'number') bits.push(`${r.energy} kcal`)
  if (typeof r.protein === 'number') bits.push(`${r.protein} g fehérje`)
  if (typeof r.carbs === 'number') bits.push(`${r.carbs} g szénhidrát`)
  if (typeof r.fiber === 'number') bits.push(`${r.fiber} g rost`)
  return bits.join(' · ')
}

/**
 * Fields shared by `/keres` MiniSearch docs and Receptsarok category `CardV` rows.
 */
export function recipeToReceptsarokListCard(r: Recipe | RecipeLayoutEntry) {
  const rr = r as RecipeListExtra
  const path = `receptsarok/${recipeDetailSegments(r)}`
  /** CardBody `desc` slot — same as magazine cards: author line only (then title, then ellipsis). */
  const description = r.author?.trim()
    ? `${r.author.trim()} receptje`
    : 'Receptsarok recept'
  const ellipsis =
    typeof rr.ellipsis === 'string' && rr.ellipsis.trim()
      ? rr.ellipsis
      : recipeNutritionEllipsisHtml(r)
  const sloppyImg =
    'img' in r && r.img && typeof r.img === 'object' && 'src' in r.img
      ? (r.img as { src: string; pos?: string; ext?: string })
      : undefined
  const img = recipeHeroToCardImg(r.year, r.image, sloppyImg)

  return {
    path,
    longtitle: r.title,
    description,
    ellipsis,
    img,
    free: isRecipeFree(r),
    tv: { tags: ['receptsarok', 'recept'] },
  }
}
