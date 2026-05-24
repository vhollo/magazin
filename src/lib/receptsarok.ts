export interface NutritionValues {
  label: string
  energy: number | null
  protein: number | null
  fat: number | null
  saturatedFat: number | null
  carbs: number | null
  fiber: number | null
}

export interface IngredientItem {
  text: string
  amount: number | null
  unit: string | null
  name: string
}

export interface IngredientGroup {
  section: string | null
  items: IngredientItem[]
}

/** Hero / step image; optional `caption` from booklet line „Fotó: …”. */
export type RecipeImage = {
  src: string
  alt: string
  caption?: string | null
}

/** Magazine-style card image (same shape as MODX `doc.img` for `CardV`). */
export type RecipeCardImage = {
  src: string
  pos: string
  ext: string
}

export type RecipeVideo = {
  src: string
  poster: string | null
}

import { resolveAssetUrl } from '$lib/assetUrl'

/** Absolute URL or `/rs/...` path suitable for `<img src>`. */
export function normalizeRecipeAssetSrc(year: number, raw: string): string {
  if (/^https?:\/\//i.test(raw)) return resolveAssetUrl(raw)
  if (raw.startsWith('/')) return raw
  return `/rs/${year}/${raw}`
}

/**
 * Build `img` for `CardV` from hero `image`, an existing sloppy `img`, or both.
 */
export function recipeHeroToCardImg(
  year: number,
  hero: { src: string; alt?: string; caption?: string | null } | null | undefined,
  sloppyImg?: { src?: string; pos?: string; ext?: string } | null
): RecipeCardImage | null {
  const raw = sloppyImg?.src ?? hero?.src
  if (!raw) return null
  return {
    src: normalizeRecipeAssetSrc(year, raw),
    pos: sloppyImg?.pos || '50% 40%',
    ext:
      (typeof sloppyImg?.ext === 'string' && sloppyImg.ext) ||
      raw.split('.').pop()?.split('?')[0] ||
      'jpg',
  }
}

export interface SubRecipe {
  title: string
  servings: { amount: number; unit: string }
  nutritionTables: NutritionValues[]
  ingredientGroups: IngredientGroup[]
  instructions: string[]
  image: RecipeImage | null
}

export interface Recipe {
  id: string
  year: number
  title: string
  author: string
  category: string
  servings: { amount: number; unit: string }
  energy: number | null
  protein: number | null
  fat: number | null
  saturatedFat: number | null
  carbs: number | null
  fiber: number | null
  nutritionTables: NutritionValues[]
  ingredientGroups: IngredientGroup[]
  ingredientNames: string[]
  searchTerms: string[]
  instructions: string[]
  image: RecipeImage | null
  /** CardV / search: normalized `{ src, pos, ext }`; derived from `image` when missing. */
  img?: RecipeCardImage | null
  subRecipes: SubRecipe[]
  hasSubRecipes: boolean
  createdAt: string
  updatedAt: string
  published?: boolean
  free?: boolean
  video?: RecipeVideo | string
  sourceModxId?: number
}

export interface RecipeTeaser {
  id: string
  year: number
  title: string
  author: string
  category: string
  energy: number | null
  protein: number | null
  fat: number | null
  saturatedFat: number | null
  carbs: number | null
  fiber: number | null
  image: RecipeImage | null
  img?: RecipeCardImage | null
  video?: RecipeVideo | string
  servings: { amount: number; unit: string }
  hasSubRecipes: boolean
  free: boolean
}

/** Serialized on /receptsarok layout — no ingredients, instructions, or sub-recipes. */
export type RecipeLayoutEntry = RecipeTeaser & {
  ingredientNames: string[]
  searchTerms: string[]
}

export interface Category {
  id: string
  name: string
  image: string
  order: number
  recipeCount: number
}

/** Firestore document id convention: `{year}-{id}` */
export function recipeSlug(recipe: Pick<Recipe, 'year' | 'id'>): string {
  return `${recipe.year}-${recipe.id}`
}

/** Public recipe URL path under `/receptsarok` (no leading slash): `{year}/{id}` */
export function recipeDetailSegments(recipe: Pick<Recipe, 'year' | 'id'>): string {
  return `${recipe.year}/${encodeURIComponent(recipe.id)}`
}

export function recipeDetailPath(recipe: Pick<Recipe, 'year' | 'id'>): string {
  return `/receptsarok/${recipeDetailSegments(recipe)}`
}

export function isRecipeFree(recipe: { free?: boolean | string }): boolean {
  return (
    recipe.free === true ||
    (typeof recipe.free === 'string' && recipe.free.trim().toLowerCase() === 'true')
  )
}

/** True for `/receptsarok/{year}/{id}` recipe detail paths, not magazine paths like `/receptsarok/levesek/...`. */
export function isReceptsarokRecipePath(path: string | undefined | null): boolean {
  return typeof path === 'string' && /^receptsarok\/\d{4}\//.test(path)
}

/** Top-level macros with fallback to the first nutrition table row. */
export function recipeMacroFields(recipe: {
  energy?: number | null
  protein?: number | null
  fat?: number | null
  saturatedFat?: number | null
  carbs?: number | null
  fiber?: number | null
  nutritionTables?: NutritionValues[]
}): Pick<RecipeTeaser, 'energy' | 'protein' | 'fat' | 'saturatedFat' | 'carbs' | 'fiber'> {
  const t = recipe.nutritionTables?.[0]
  return {
    energy: recipe.energy ?? t?.energy ?? null,
    protein: recipe.protein ?? t?.protein ?? null,
    fat: recipe.fat ?? t?.fat ?? null,
    saturatedFat: recipe.saturatedFat ?? t?.saturatedFat ?? null,
    carbs: recipe.carbs ?? t?.carbs ?? null,
    fiber: recipe.fiber ?? t?.fiber ?? null,
  }
}

/** Remove body fields from serialized recipe data (ingredients, instructions, search helpers). */
export function stripRecipeGatedFields(recipe: Recipe): Recipe {
  return {
    ...recipe,
    ingredientGroups: [],
    instructions: [],
    subRecipes: [],
    ingredientNames: [],
    searchTerms: [],
  }
}

export function toTeaser(recipe: Recipe): RecipeTeaser {
  return normalizeRecipeTeaser(recipe)
}

/** Fill gaps in search-index / legacy stored teasers so RecipeCard always has required fields. */
export function normalizeRecipeTeaser(
  raw: Partial<RecipeTeaser> & Pick<RecipeTeaser, 'year' | 'id' | 'title'>
): RecipeTeaser {
  const servings =
    raw.servings &&
    typeof raw.servings === 'object' &&
    typeof raw.servings.amount === 'number'
      ? raw.servings
      : { amount: 0, unit: '' }

  const macros = recipeMacroFields(raw)

  return {
    id: raw.id,
    year: raw.year,
    title: raw.title,
    author: raw.author ?? '',
    category: raw.category ?? '',
    ...macros,
    image: raw.image ?? null,
    img: raw.img ?? recipeHeroToCardImg(raw.year, raw.image, undefined) ?? undefined,
    video: raw.video,
    servings,
    hasSubRecipes: Boolean(raw.hasSubRecipes),
    free: isRecipeFree(raw),
  }
}

export function toLayoutRecipe(recipe: Recipe): RecipeLayoutEntry {
  return {
    ...toTeaser(recipe),
    ingredientNames: recipe.ingredientNames ?? [],
    searchTerms: recipe.searchTerms ?? [],
  }
}
