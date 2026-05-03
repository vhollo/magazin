<script lang="ts" module>
  import CardV from '$lib/components/CardV.svelte'
  import RecipeFilters from '$lib/components/RecipeFilters.svelte'
  import Search from '$lib/components/Search.svelte'
  import Nav2 from '$lib/components/Nav2.svelte'
  import ReceptsarokLogo from '$lib/components/ReceptsarokLogo.svelte'
</script>

<script lang="ts">
  import { hasReceptsarokAccess } from '$lib/authStore'
  import { recipeToReceptsarokListCard } from '$lib/recipeReceptsarokListCard'
  import { isRecipeFree } from '$lib/receptsarok'
  let { data } = $props()

  const categoryId = $derived(data.categoryId)
  const category = $derived(data.categories.find((c: any) => c.id === categoryId))
  const allCategoryRecipes = $derived(data.recipes.filter((r: any) => r.category === categoryId))

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

<article class="prose mt-8 mb-4 mx-auto w-full px-4">
  <nav class="breadcrumbs text-sm not-prose" aria-label="Elérési út">
    <ul>
      <li><a href="/receptsarok" class="opacity-70 hover:opacity-100"><ReceptsarokLogo class="text-sm" /></a></li>
      <li>{category?.name || categoryId}</li>
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

<section class="grid gap-x-6 gap-y-0 px-4 py-6">
  {#each filtered as recipe (recipe.year + '-' + recipe.id)}
    {@const base = recipeToReceptsarokListCard(recipe)}
    {@const card = {
      ...base,
      locked: !isRecipeFree(recipe) && !$hasReceptsarokAccess,
    }}
    <aside
      class="card gap-2 rounded-sm bg-base-200"
      class:double={card.img}
      class:triple={card.description && card.img}
    >
      <CardV {card} />
    </aside>
  {/each}
</section>

{#if filtered.length === 0}
  <p class="text-center py-12 opacity-50">Nincs a szűrési feltételeknek megfelelő recept.</p>
{/if}

<Search articles={data.articleCount} recipes={data.recipeCount} />
<Nav2 actual="/receptsarok" />

<style>
  section {
    grid-template-columns: repeat(auto-fill, minmax(24ch, 1fr));
    grid-auto-flow: dense;
    grid-auto-rows: auto;
  }
  aside {
    position: unset;
    min-height: 20ch;
    max-height: fit-content;
    margin-bottom: 3rem;
  }
  aside.double {
    grid-row-end: span 2;
  }
  aside.triple {
    grid-row-end: span 2;
  }
</style>
