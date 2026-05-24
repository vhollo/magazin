<script lang="ts">
  import NutritionTable from '$lib/components/NutritionTable.svelte'
  import { isRecipeFree, recipeDetailPath, recipeHeroToCardImg, normalizeRecipeAssetSrc } from '$lib/receptsarok'
  import type { Recipe, RecipeTeaser } from '$lib/receptsarok'

  export let recipe: Recipe | RecipeTeaser
  export let locked = false

  $: free = isRecipeFree(recipe)
  $: href = recipeDetailPath(recipe as Recipe)
  $: cardImg = recipeHeroToCardImg(
    recipe.year,
    recipe.image,
    (recipe as Recipe & { img?: { src: string; pos?: string; ext?: string } }).img
  )
  $: cardVideo = (() => {
    const video = (recipe as Recipe & { video?: unknown }).video

    if (video && typeof video === 'object') {
      const src = typeof (video as { src?: unknown }).src === 'string' ? (video as { src: string }).src.trim() : ''
      if (!src || src.includes('<')) return null

      const poster =
        typeof (video as { poster?: unknown }).poster === 'string' &&
        (video as { poster: string }).poster.trim()
          ? (video as { poster: string }).poster.trim()
          : null

      return {
        src: normalizeRecipeAssetSrc(recipe.year, src),
        poster: poster ? normalizeRecipeAssetSrc(recipe.year, poster) : null
      }
    }

    if (typeof video === 'string') {
      const src = video.trim()
      if (!src || src.includes('<')) return null
      return { src: normalizeRecipeAssetSrc(recipe.year, src), poster: null }
    }

    return null
  })()
</script>

<a {href} class="card card-sm bg-base-200 rounded-sm hover:shadow-lg transition-shadow max-h-fit" class:double={cardImg || cardVideo}>
  {#if cardVideo}
    <figure class="rounded-t">
      <!-- svelte-ignore a11y_media_has_caption -->
      <video
        preload="metadata"
        playsinline
        controls
        src={cardVideo.src}
        poster={cardVideo.poster ?? undefined}
        class="w-full object-cover"
        style="aspect-ratio: var(--imgratio);"
      ></video>
      {#if recipe.image?.caption}
        <figcaption class="px-2 pt-1 pb-0.5 text-xs leading-snug text-base-content/60 line-clamp-2">
          {recipe.image.caption}
        </figcaption>
      {/if}
    </figure>
  {:else if cardImg}
    <figure class="rounded-t">
      <img
        loading="lazy"
        src={cardImg.src}
        alt={recipe.image?.alt ?? recipe.title}
        class="w-full object-cover"
        style="aspect-ratio: var(--imgratio);"
      />
      {#if recipe.image?.caption}
        <figcaption class="px-2 pt-1 pb-0.5 text-xs leading-snug text-base-content/60 line-clamp-2">
          {recipe.image.caption}
        </figcaption>
      {/if}
    </figure>
  {/if}
  <div class="card-body gap-0 p-2">
    {#if recipe.author?.trim()}
      <h4 class="italic">{recipe.author.trim()}</h4>
    {/if}
    <div class="flex items-start justify-between gap-2 pb-2">
      <h2 class="card-title text-base leading-tight !mb-0 flex-1 min-w-0">{recipe.title}</h2>
      {#if !free && locked}
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-5 shrink-0 opacity-50">
          <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
        </svg>
      {/if}
    </div>
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
    <div class="card-actions justify-between items-center mt-4">
      {#if recipe.servings?.amount}
        <small class="opacity-50">{recipe.servings.amount} {recipe.servings.unit}</small>
      {/if}
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

<style>
  .double {
    grid-row-end: span 2;
  }
</style>