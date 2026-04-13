export const FREE_SAMPLE_YEAR = 2025

export interface NutritionValues {
  label: string
  energy: number
  protein: number
  fat: number
  saturatedFat: number
  carbs: number
  fiber: number
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
  energy: number
  protein: number
  fat: number
  saturatedFat: number
  carbs: number
  fiber: number
  nutritionTables: NutritionValues[]
  ingredientGroups: IngredientGroup[]
  ingredientNames: string[]
  searchTerms: string[]
  instructions: string[]
  image: RecipeImage | null
  subRecipes: SubRecipe[]
  hasSubRecipes: boolean
  createdAt: string
  updatedAt: string
  free?: boolean
}

export interface RecipeTeaser {
  id: string
  year: number
  title: string
  author: string
  category: string
  energy: number
  protein: number
  fat: number
  saturatedFat: number
  carbs: number
  fiber: number
  image: RecipeImage | null
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

export function isRecipeFree(recipe: { year: number; free?: boolean }): boolean {
  return recipe.year === FREE_SAMPLE_YEAR || recipe.free === true
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
