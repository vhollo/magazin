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

/** Absolute URL or `/rs/...` path suitable for `<img src>`. */
export function normalizeRecipeAssetSrc(year: number, raw: string): string {
  if (/^https?:\/\//i.test(raw)) return raw
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
  return {
    id: recipe.id,
    year: recipe.year,
    title: recipe.title,
    author: recipe.author,
    category: recipe.category,
    energy: recipe.energy,
    protein: recipe.protein,
    fat: recipe.fat,
    saturatedFat: recipe.saturatedFat,
    carbs: recipe.carbs,
    fiber: recipe.fiber,
    image: recipe.image,
    img: recipe.img ?? recipeHeroToCardImg(recipe.year, recipe.image, undefined),
    video: recipe.video,
    servings: recipe.servings,
    hasSubRecipes: recipe.hasSubRecipes,
    free: isRecipeFree(recipe),
  }
}

export function toLayoutRecipe(recipe: Recipe): RecipeLayoutEntry {
  return {
    ...toTeaser(recipe),
    ingredientNames: recipe.ingredientNames ?? [],
    searchTerms: recipe.searchTerms ?? [],
  }
}
