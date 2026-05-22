<script module>
  import Search from '$lib/components/Search.svelte'
  import Nav2 from '$lib/components/Nav2.svelte'
  import MealPlanner from '$lib/components/MealPlanner.svelte'
  import ReceptsarokLogo from '$lib/components/ReceptsarokLogo.svelte'
</script>

<script lang="ts">
  let { data } = $props()

  const categories = $derived(data.categories)
  const totalRecipes = $derived(data.recipes.length)
  const freeCount = $derived(data.recipes.filter((r: { free?: boolean }) => r.free).length)
  const freeCountsByCategory = $derived(
    data.recipes.reduce((acc: Record<string, number>, recipe: { free?: boolean; category?: string }) => {
      if (recipe.free) {
        acc[recipe.category ?? ''] = (acc[recipe.category ?? ''] ?? 0) + 1
      }
      return acc
    }, {})
  )

  let showPlanner = $state(false)
</script>

<svelte:head>
  <title>Receptsarok • Receptek cukorbetegeknek</title>
  <meta name="description" content="Több mint {totalRecipes} diabétesz-barát recept tápanyagtáblázattal, összetevőkkel és elkészítési útmutatóval." />
</svelte:head>

<article class="prose mt-8 mb-4 w-full px-[clamp(1rem,4vw,2.75rem)] text-center mx-auto">
  <h1><ReceptsarokLogo class="text-3xl sm:text-4xl" /></h1>
  <p>
    {totalRecipes} diabétesz-barát recept, tápanyagtáblázattal.</p>
  <p class="text-success font-medium">A Diabetes és Hypertonia lapokban megjelent {freeCount} recept ingyenesen elérhető.</p>
  
</article>

<section
  class="grid grid-cols-1 gap-[clamp(1rem,2.5vw,1.75rem)] w-full px-[clamp(1rem,4vw,2.75rem)] py-6 md:grid-cols-4 2xl:grid-cols-6"
>
  {#each categories as cat}
    <a
      href="/receptsarok/{cat.id}"
      class="group grid min-h-[clamp(6.5rem,22vw,10rem)] w-full overflow-hidden rounded-2xl bg-base-300 shadow-md ring-1 ring-black/20 transition-shadow hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary {cat.image ? 'grid-cols-2' : 'grid-cols-1'} md:col-span-2 md:last:col-start-2 2xl:last:col-start-3"
    >
      {#if cat.image}
        <figure
          class="relative min-h-[clamp(6.5rem,22vw,10rem)] min-w-0 overflow-hidden self-stretch"
        >
          <img
            loading="lazy"
            src="/rs/{cat.image}"
            alt={cat.name}
            class="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        </figure>
      {/if}
      <div
        class="grid min-h-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 px-4 py-4 sm:gap-x-4 sm:px-5"
      >
        <div class="min-w-0">
          <h2 class="break-words text-base font-semibold leading-snug hyphens-auto">
            {cat.name}
          </h2>
          <p class="mt-1 text-sm text-[#9CA3AF]">{cat.recipeCount} recept</p>
          <p class="mt-0.5 text-xs text-success/90">{freeCountsByCategory[cat.id] ?? 0} ingyenes recept</p>
        </div>
        <div class="flex shrink-0 items-center self-stretch pr-0.5">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            class="size-6 shrink-0 text-[#9CA3AF] transition-colors group-hover:text-[#D1D5DB]"
            aria-hidden="true"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </div>
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
  <div class="w-full px-[clamp(1rem,4vw,2.75rem)] py-6">
    <MealPlanner recipes={data.recipes} categories={data.categories} />
  </div>
{/if}

<Search articles={data.articleCount} recipes={data.recipeCount} />
<Nav2 actual="/receptsarok" />

