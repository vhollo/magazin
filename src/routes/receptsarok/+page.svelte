<script context="module">
  import Search from '$lib/components/Search.svelte'
  import Nav2 from '$lib/components/Nav2.svelte'
  import MealPlanner from '$lib/components/MealPlanner.svelte'
</script>

<script lang="ts">
  let { data } = $props()

  const categories = data.categories
  const totalRecipes = data.recipes.length
  const freeCount = data.recipes.filter((r: any) => r.free).length

  let showPlanner = $state(false)
</script>

<svelte:head>
  <title>Receptsarok • Receptek cukorbetegeknek</title>
  <meta name="description" content="Több mint {totalRecipes} diabétesz-barát recept tápanyagtáblázattal, összetevőkkel és elkészítési útmutatóval." />
</svelte:head>

<Search count={totalRecipes} />
<Nav2 actual="/receptsarok" />

<article class="prose mt-8 mb-4 mx-auto w-full px-4">
  <h1 class="text-center">Receptsarok</h1>
  <p class="text-center max-w-prose mx-auto">
    {totalRecipes} diabétesz-barát recept, tápanyagtáblázattal.
    <span class="text-success font-medium">{freeCount} recept ingyenesen elérhető.</span>
  </p>
</article>

<section class="grid gap-6 px-4 py-6 max-w-5xl mx-auto">
  {#each categories as cat}
    <a href="/receptsarok/{cat.id}" class="card card-side bg-base-200 rounded-sm hover:shadow-lg transition-shadow">
      {#if cat.image}
        <figure class="w-32 shrink-0">
          <img loading="lazy" src={cat.image} alt={cat.name} class="w-full h-full object-cover" />
        </figure>
      {/if}
      <div class="card-body p-4">
        <h2 class="card-title">{cat.name}</h2>
        <p class="text-sm opacity-60">{cat.recipeCount} recept</p>
      </div>
      <div class="flex items-center pr-4">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6 opacity-30">
          <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>
      </div>
    </a>
  {/each}
</section>

<div class="text-center py-4">
  <button class="btn btn-outline" onclick={() => showPlanner = !showPlanner}>
    {showPlanner ? 'Étlaptervező bezárása' : 'Heti étlaptervező'}
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-5">
      <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
    </svg>
  </button>
</div>

{#if showPlanner}
  <div class="px-4 py-6">
    <MealPlanner recipes={data.recipes} />
  </div>
{/if}

<style>
  section {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  }
</style>
