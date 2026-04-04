<script context="module">
  import RecipeCard from '$lib/components/RecipeCard.svelte'
  import RecipeFilters from '$lib/components/RecipeFilters.svelte'
  import Search from '$lib/components/Search.svelte'
  import Nav2 from '$lib/components/Nav2.svelte'
</script>

<script lang="ts">
  import { hasReceptsarokAccess } from '$lib/authStore'
  let { data } = $props()

  const categoryId = data.categoryId
  const category = data.categories.find((c: any) => c.id === categoryId)
  const allCategoryRecipes = data.recipes.filter((r: any) => r.category === categoryId)

  let filters = $state({
    maxEnergy: 0,
    maxCarbs: 0,
    minProtein: 0,
    ingredient: '',
    sortBy: 'title' as 'title' | 'energy' | 'protein' | 'carbs' | 'year'
  })

  let filtered = $derived.by(() => {
    let result = [...allCategoryRecipes]

    if (filters.maxEnergy > 0) {
      result = result.filter(r => r.energy <= filters.maxEnergy)
    }
    if (filters.maxCarbs > 0) {
      result = result.filter(r => r.carbs <= filters.maxCarbs)
    }
    if (filters.minProtein > 0) {
      result = result.filter(r => r.protein >= filters.minProtein)
    }
    if (filters.ingredient.trim()) {
      const term = filters.ingredient.toLowerCase().trim()
      result = result.filter(r =>
        r.ingredientNames?.some((name: string) => name.toLowerCase().includes(term))
      )
    }

    switch (filters.sortBy) {
      case 'energy': result.sort((a, b) => a.energy - b.energy); break
      case 'protein': result.sort((a, b) => b.protein - a.protein); break
      case 'carbs': result.sort((a, b) => a.carbs - b.carbs); break
      case 'year': result.sort((a, b) => b.year - a.year); break
      default: result.sort((a, b) => a.title.localeCompare(b.title, 'hu'))
    }

    return result
  })

  const isFiltering = $derived(
    filters.maxEnergy > 0 || filters.maxCarbs > 0 || filters.minProtein > 0 || filters.ingredient.trim() !== ''
  )
</script>

<svelte:head>
  <title>{category?.name || categoryId} • Receptsarok</title>
  <meta name="description" content="{category?.name}: {allCategoryRecipes.length} diabétesz-barát recept tápanyagtáblázattal." />
</svelte:head>

<Search count={data.recipes.length} />
<Nav2 actual="/receptsarok" />

<article class="prose mt-8 mb-4 mx-auto w-full px-4">
  <nav class="text-sm breadcrumbs">
    <ul class="flex gap-1 not-prose list-none p-0 m-0">
      <li><a href="/receptsarok" class="opacity-60 hover:opacity-100">Receptsarok</a></li>
      <li class="before:content-['›'] before:mx-1 before:opacity-40">{category?.name || categoryId}</li>
    </ul>
  </nav>
  <h1 class="text-center">{category?.name || categoryId}</h1>
  <p class="text-center">{allCategoryRecipes.length} recept</p>
</article>

<RecipeFilters bind:filters hasAccess={$hasReceptsarokAccess} />

{#if isFiltering}
  <p class="text-center text-sm opacity-60 mb-4">
    {filtered.length} recept a szűrési feltételeknek megfelelően
  </p>
{/if}

<section class="grid gap-6 px-4 py-6">
  {#each filtered as recipe (recipe.year + '-' + recipe.id)}
    <RecipeCard {recipe} locked={!$hasReceptsarokAccess} />
  {/each}
</section>

{#if filtered.length === 0}
  <p class="text-center py-12 opacity-50">Nincs a szűrési feltételeknek megfelelő recept.</p>
{/if}

<style>
  section {
    grid-template-columns: repeat(auto-fill, minmax(24ch, 1fr));
    grid-auto-flow: dense;
  }
</style>
