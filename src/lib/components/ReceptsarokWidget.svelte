<script lang="ts">
  import { onMount } from 'svelte'
  import { hasReceptsarokAccess } from '$lib/authStore'
  import RecipeCard from '$lib/components/RecipeCard.svelte'
  import { isRecipeFree, type RecipeLayoutEntry, type RecipeTeaser } from '$lib/receptsarok'
  import { masonryItem } from '$lib/masonry.js'
  import ReceptsarokLogo from './ReceptsarokLogo.svelte';

  export let recipes: (RecipeTeaser | RecipeLayoutEntry)[] = []
  export let title = ''
  /** Section heading – overridden for curated "További receptek" lists. */
  export let heading = 'Kapcsolódó receptek a Receptsarokban'

  // Masonry spans are JS-only; pre-hydration the grid uses content-sized rows
  // (no overlap), then switches to the fine-grained dense grid once mounted.
  let ready = false
  onMount(() => {
    ready = true
  })
</script>

{#if recipes.length > 0}
  <section class="mx-auto w-full max-w-7xl px-4 pt-10 pb-8 sm:pt-14">
    <header class="mb-6">
      <h2 class="display text-2xl sm:text-3xl">{heading}</h2>
      {#if title}
        <p class="mt-2 text-sm opacity-60">
          Keresés: „{title}" – {recipes.length} találat
        </p>
      {/if}
    </header>

    <div class="grid gap-4 mt-6" class:ready>
      {#each recipes as recipe}
        <aside use:masonryItem>
          <RecipeCard {recipe} locked={!isRecipeFree(recipe) && !$hasReceptsarokAccess} />
        </aside>
      {/each}
    </div>

    <div class="mt-6">
      <a href="/receptsarok" class="btn btn-outline btn-sm">
        <ReceptsarokLogo/>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-4">
          <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>
      </a>
    </div>
  </section>
{/if}

<style>
  div.grid {
    grid-template-columns: repeat(auto-fill, minmax(24ch, 1fr));
    /* Pre-hydration / no-JS fallback: rows hug content so cards never overlap. */
    grid-auto-rows: max-content;
  }
  div.grid.ready {
    /* JS active: tiny unit so dynamic spans hug each card's actual height. */
    grid-auto-rows: 4px;
    grid-auto-flow: dense;
    /* Safety net: a too-short span can never spill content past the grid. */
    overflow: clip;
  }
  aside {
    /* prevent stretch-to-track so ResizeObserver reports content height */
    align-self: start;
  }
</style>
