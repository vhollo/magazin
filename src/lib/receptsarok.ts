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

/**
 * Canonical recipe image — magazine card shape (same as MODX `doc.img` for
 * `CardV`) plus optional hero metadata for the detail page: `alt` only when it
 * differs from the recipe title, `caption` from booklet line „Fotó: …”.
 */
export type RecipeCardImage = {
  src: string
  pos: string
  ext: string
  alt?: string
  caption?: string | null
}

/** Pre-consolidation hero field (`image`); still folded in by {@link recipeCardImg}. */
type LegacyHeroImage = { src: string; alt?: string; caption?: string | null }

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
  hero: LegacyHeroImage | null | undefined,
  sloppyImg?: Partial<RecipeCardImage> | null
): RecipeCardImage | null {
  const raw = sloppyImg?.src ?? hero?.src
  if (!raw) return null
  const alt = sloppyImg?.alt ?? hero?.alt
  const caption = sloppyImg?.caption ?? hero?.caption
  return {
    src: normalizeRecipeAssetSrc(year, raw),
    pos: sloppyImg?.pos || '50% 40%',
    ext:
      (typeof sloppyImg?.ext === 'string' && sloppyImg.ext) ||
      raw.split('.').pop()?.split('?')[0] ||
      'jpg',
    ...(alt ? { alt } : {}),
    ...(caption ? { caption } : {}),
  }
}

/** Canonical image accessor; folds the legacy `image` hero field from un-migrated data. */
export function recipeCardImg(
  recipe: Pick<Recipe, 'year'> & { img?: RecipeCardImage | null; image?: LegacyHeroImage | null }
): RecipeCardImage | null {
  return recipe.img ?? recipeHeroToCardImg(recipe.year, recipe.image, undefined)
}

export interface SubRecipe {
  title: string
  servings: { amount: number; unit: string }
  nutritionTables: NutritionValues[]
  ingredientGroups: IngredientGroup[]
  instructions: string[]
  img: RecipeCardImage | null
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
  /** Canonical card/hero image (CardV shape + optional `alt`/`caption`). */
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

/** Minimal fields for `/keres` + `collections/rs-teasers-{year}` (low Firestore index footprint). */
export type KeresRecipeTeaser = Pick<
  RecipeTeaser,
  | 'id'
  | 'year'
  | 'title'
  | 'author'
  | 'category'
  | 'energy'
  | 'protein'
  | 'fat'
  | 'carbs'
  | 'fiber'
  | 'img'
  | 'free'
>

export function toKeresTeaser(recipe: Recipe | RecipeTeaser): KeresRecipeTeaser {
  const macros = recipeMacroFields(recipe)
  const img = recipeCardImg(recipe) ?? undefined
  return {
    id: recipe.id,
    year: recipe.year,
    title: recipe.title,
    author: recipe.author ?? '',
    category: recipe.category ?? '',
    energy: macros.energy,
    protein: macros.protein,
    fat: macros.fat,
    carbs: macros.carbs,
    fiber: macros.fiber,
    img,
    free: isRecipeFree(recipe),
  }
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
    img: recipeCardImg(raw) ?? undefined,
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

/** Title-keyword matches for the Receptsarok cross-link widget (magazine + recipe detail). */
export function similarRecipesForTitle(
  title: string,
  entries: RecipeLayoutEntry[],
  exclude?: Pick<Recipe, 'year' | 'id'>,
  limit = 4
): RecipeLayoutEntry[] {
  const titleWords = (title || '').toLowerCase().split(/\s+/)
  return entries
    .filter((r) => {
      if (exclude && r.year === exclude.year && r.id === exclude.id) return false
      return (
        r.searchTerms?.some((t) => titleWords.some((w) => w.length > 3 && t.includes(w))) ||
        r.ingredientNames?.some((n) => titleWords.some((w) => w.length > 3 && n.includes(w)))
      )
    })
    .slice(0, limit)
}
