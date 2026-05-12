import type { Recipe, RecipeLayoutEntry } from '$lib/receptsarok'
import {
  isRecipeFree,
  recipeDetailSegments,
  recipeHeroToCardImg,
} from '$lib/receptsarok'
import categoriesJson from '$lib/data/categories.json'

type RecipeListExtra = (Recipe | RecipeLayoutEntry) & {
  ellipsis?: string
  video?: Recipe['video']
}

const RECIPE_CATEGORY_NAMES = new Map(
  (categoriesJson as Array<{ id: string; name: string }>).map((c) => [c.id, c.name])
)

function recipeCategoryBadgeLabel(categoryId: string | undefined): string {
  const id = String(categoryId ?? '').trim()
  if (!id) return ''
  return RECIPE_CATEGORY_NAMES.get(id) ?? id
}

function recipePreviewTags(r: Recipe | RecipeLayoutEntry): string[] {
  const tags: string[] = []
  if (Number.isFinite(r.year) && r.year >= 2000 && r.year <= 2099) {
    tags.push(String(r.year))
  }
  const cat = recipeCategoryBadgeLabel(r.category)
  if (cat) tags.push(cat)
  return tags
}

function escapeHtmlAttribute(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
}

function recipeVideoToCardHtml(video: Recipe['video'] | undefined): string | undefined {
  let src = ''
  let poster: string | null = null

  if (video && typeof video === 'object') {
    src = typeof video.src === 'string' ? video.src.trim() : ''
    poster = typeof video.poster === 'string' && video.poster.trim() ? video.poster.trim() : null
  } else if (typeof video === 'string') {
    const raw = video.trim()
    if (raw && !raw.includes('<')) {
      src = raw
    }
  }

  if (!src) return undefined

  const safeSrc = escapeHtmlAttribute(src)
  const posterAttr = poster ? ` poster="${escapeHtmlAttribute(poster)}"` : ''
  return `<video controls playsinline preload="metadata" class="w-full h-full object-cover" style="aspect-ratio: var(--imgratio);"${posterAttr}><source src="${safeSrc}" type="video/mp4" /></video>`
}

export function recipeNutritionEllipsisHtml(r: Recipe | RecipeLayoutEntry): string {
  const first = 'nutritionTables' in r && r.nutritionTables?.length ? r.nutritionTables[0] : undefined
  const energy = first?.energy ?? r.energy
  const protein = first?.protein ?? r.protein
  const fat = first?.fat ?? r.fat
  const saturatedFat = first?.saturatedFat ?? r.saturatedFat
  const carbs = first?.carbs ?? r.carbs
  const fiber = first?.fiber ?? r.fiber
  const label = first?.label?.trim() || '1 adag tápanyagtartalma:'

  type NutCol = { title: string; unit: string; value: number | null | undefined }
  const spec: NutCol[] = [
    { title: 'Energia', unit: 'kcal', value: energy },
    { title: 'Fehérje', unit: 'g', value: protein },
    { title: 'Zsír', unit: 'g', value: fat },
    { title: 'Tel. zsír', unit: 'g', value: saturatedFat },
    { title: 'Szénhidrát', unit: 'g', value: carbs },
    { title: 'Rost', unit: 'g', value: fiber },
  ]
  const visible = spec.filter((c) => c.value !== null && c.value !== undefined)

  if (visible.length === 0) {
    return `<p class="text-sm opacity-80">Receptsarok · ${r.category}${r.author?.trim() ? ` · ${r.author.trim()}` : ''}</p>`
  }

  const colspan = visible.length
  const ths = visible.map((c) => `<th>${c.title}</th>`).join('')
  const tds = visible.map((c) => `<td>${c.value} ${c.unit}</td>`).join('')

  return `<table border="0"><thead><tr><th colspan="${colspan}">${label}</th></tr></thead><tbody><tr>${ths}</tr><tr>${tds}</tr></tbody></table>`
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
    ? `${r.author.trim()}`
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
    video: recipeVideoToCardHtml(rr.video),
    img,
    free: isRecipeFree(r),
    tv: { tags: recipePreviewTags(r) },
  }
}
