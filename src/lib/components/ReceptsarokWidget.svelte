<script lang="ts">
  import RecipeCard from '$lib/components/RecipeCard.svelte'
  import type { RecipeLayoutEntry, RecipeTeaser } from '$lib/receptsarok'
  import ReceptsarokLogo from './ReceptsarokLogo.svelte';

  export let recipes: (RecipeTeaser | RecipeLayoutEntry)[] = []
  export let title = ''

  $: shown = recipes.slice(0, 4)
</script>

{#if shown.length > 0}
  <section class="mt-16 mb-8 px-4">
    <article class="prose mx-auto w-full">
      <h2 class="text-center">Hasonló receptek a Receptsarokban</h2>
      {#if title}
        <p class="text-center text-sm opacity-60">
          Keresés: „{title}" — {recipes.length} találat
        </p>
      {/if}
    </article>

    <div class="grid gap-4 mt-6 max-w-5xl mx-auto">
      {#each shown as recipe}
        <RecipeCard {recipe} />
      {/each}
    </div>

    <div class="text-center mt-6">
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
  }
</style>
