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

export interface SubRecipe {
  title: string
  servings: { amount: number; unit: string }
  nutritionTables: NutritionValues[]
  ingredientGroups: IngredientGroup[]
  instructions: string[]
  image: { src: string; alt: string } | null
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
  image: { src: string; alt: string } | null
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
  image: { src: string; alt: string } | null
  servings: { amount: number; unit: string }
  hasSubRecipes: boolean
  free: boolean
}

export interface Category {
  id: string
  name: string
  image: string
  order: number
  recipeCount: number
}

export function recipeSlug(recipe: Recipe): string {
  return `${recipe.year}-${recipe.id}`
}

export function isRecipeFree(recipe: { year: number; free?: boolean }): boolean {
  return recipe.year === FREE_SAMPLE_YEAR || recipe.free === true
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
