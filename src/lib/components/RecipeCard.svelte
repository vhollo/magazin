<script lang="ts">
  import NutritionTable from '$lib/components/NutritionTable.svelte'
  import { isRecipeFree, recipeSlug } from '$lib/receptsarok'
  import type { Recipe, RecipeTeaser } from '$lib/receptsarok'

  export let recipe: Recipe | RecipeTeaser
  export let locked = false

  $: free = isRecipeFree(recipe)
  $: slug = recipeSlug(recipe as Recipe)
  $: href = `/receptsarok/${recipe.category}/${slug}`
</script>

<a {href} class="card card-sm bg-base-200 rounded-sm hover:shadow-lg transition-shadow">
  {#if recipe.image}
    <figure class="rounded-t">
      <img
        loading="lazy"
        src={recipe.image.src}
        alt={recipe.image.alt}
        class="w-full object-cover"
        style="aspect-ratio: var(--imgratio);"
      />
    </figure>
  {/if}
  <div class="card-body gap-1 p-3">
    <div class="flex items-start justify-between gap-2">
      <h2 class="card-title text-base leading-tight">{recipe.title}</h2>
      {#if !free && locked}
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-5 shrink-0 opacity-50">
          <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
        </svg>
      {/if}
    </div>
    <p class="text-sm italic opacity-70">{recipe.author} receptje</p>
    <div class="mt-2">
      <NutritionTable compact table={{
        label: '',
        energy: recipe.energy,
        protein: recipe.protein,
        fat: recipe.fat,
        saturatedFat: recipe.saturatedFat,
        carbs: recipe.carbs,
        fiber: recipe.fiber
      }}/>
    </div>
    <div class="card-actions justify-between items-center mt-2">
      <small class="opacity-50">{recipe.servings.amount} {recipe.servings.unit}</small>
      <div class="flex gap-1">
        {#if free}
          <span class="badge badge-success badge-xs">ingyenes</span>
        {/if}
        {#if recipe.hasSubRecipes}
          <span class="badge badge-outline badge-xs">alreceptek</span>
        {/if}
        <span class="badge badge-outline badge-xs">{recipe.year}</span>
      </div>
    </div>
  </div>
</a>
