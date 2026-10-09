<script lang="ts" module>
  import Cards from '$lib/components/Cards.svelte'
  import RecipeFilters from '$lib/components/RecipeFilters.svelte'
  import Search from '$lib/components/Search.svelte'
  import Nav2 from '$lib/components/Nav2.svelte'
  import ReceptsarokLogo from '$lib/components/ReceptsarokLogo.svelte'
</script>

<script lang="ts">
  import { hasReceptsarokAccess } from '$lib/authStore'
  import { recipeToReceptsarokListCard } from '$lib/recipeReceptsarokListCard'
  import { foldHungarian, isRecipeFree } from '$lib/receptsarok'
  let { data } = $props()

  const categoryId = $derived(data.categoryId)
  const category = $derived(data.categories.find((c: any) => c.id === categoryId))
  const allCategoryRecipes = $derived(data.cards)

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
      result = result.filter((r) => typeof r.energy === 'number' && r.energy <= filters.maxEnergy)
    }
    if (filters.maxCarbs > 0) {
      result = result.filter((r) => typeof r.carbs === 'number' && r.carbs <= filters.maxCarbs)
    }
    if (filters.minProtein > 0) {
      result = result.filter((r) => typeof r.protein === 'number' && r.protein >= filters.minProtein)
    }
    // Comma/semicolon-separated ingredients; a recipe must contain every one (AND).
    // Within one ingredient the words may appear in any order, but all of them in
    // the same ingredient name: `kiőrlésű liszt` matches `teljes kiőrlésű búzaliszt`,
    // `lila hagyma` does not match `lila káposzta` + `vöröshagyma`.
    // Accent-insensitive: `csirke` matches `csírke` and vice versa.
    const terms = foldHungarian(filters.ingredient)
      .split(/[,;]/)
      .map((t) => t.split(/\s+/).filter(Boolean))
      .filter((words) => words.length)
    if (terms.length) {
      result = result.filter((r) => {
        const names = (r.ingredientNames ?? []).map(foldHungarian)
        return terms.every((words) => names.some((name: string) => words.every((w) => name.includes(w))))
      })
    }

    switch (filters.sortBy) {
      case 'energy':
        result.sort(
          (a, b) => (typeof a.energy === 'number' ? a.energy : Infinity) - (typeof b.energy === 'number' ? b.energy : Infinity)
        )
        break
      case 'protein':
        result.sort(
          (a, b) => (typeof b.protein === 'number' ? b.protein : -Infinity) - (typeof a.protein === 'number' ? a.protein : -Infinity)
        )
        break
      case 'carbs':
        result.sort(
          (a, b) => (typeof a.carbs === 'number' ? a.carbs : Infinity) - (typeof b.carbs === 'number' ? b.carbs : Infinity)
        )
        break
      case 'year': result.sort((a, b) => b.year - a.year); break
      default: result.sort((a, b) => a.title.localeCompare(b.title, 'hu'))
    }

    return result
  })

  const isFiltering = $derived(
    filters.maxEnergy > 0 || filters.maxCarbs > 0 || filters.minProtein > 0 || filters.ingredient.trim() !== ''
  )

  // Map filtered recipes to Cards.svelte's CardV card shape (same rendering as
  // before; the dense masonry, dynamic spans, pagination and SSR-safe layout now
  // come from Cards instead of this page's own grid).
  const cards = $derived(
    filtered.map((recipe) => ({
      ...recipeToReceptsarokListCard(recipe),
      locked: !isRecipeFree(recipe) && !$hasReceptsarokAccess,
    }))
  )
</script>

<svelte:head>
  <title>{category?.name || categoryId} • Receptsarok</title>
  <meta name="description" content="{category?.name}: {allCategoryRecipes.length} diabétesz-barát recept tápanyagtáblázattal." />
</svelte:head>

<section class="band relative overflow-hidden bg-base-200">
  <div class="mx-auto max-w-4xl px-4 py-10 sm:py-14">
    <nav class="breadcrumbs text-sm mb-6" aria-label="Elérési út">
      <ul>
        <li><a href="/receptsarok" class="opacity-70 hover:opacity-100"><ReceptsarokLogo class="text-sm" /></a></li>
        <li>{category?.name || categoryId}</li>
      </ul>
    </nav>
    <h1 class="display text-3xl leading-tight text-balance sm:text-4xl">{category?.name || categoryId}</h1>
    <p class="mt-2 opacity-80">{allCategoryRecipes.length} recept</p>
  </div>
</section>

<RecipeFilters bind:filters hasAccess={$hasReceptsarokAccess} />

{#if isFiltering}
  <p class="mx-auto w-full max-w-4xl px-4 text-sm opacity-60 mb-4">
    {filtered.length} recept a szűrési feltételeknek megfelelően
  </p>
{/if}

<Cards {cards} moreLabel="További receptek" />

{#if filtered.length === 0}
  <p class="mx-auto w-full max-w-4xl px-4 py-12 opacity-50">Nincs a szűrési feltételeknek megfelelő recept.</p>
{/if}

<Nav2 actual="/receptsarok" />
<Search articles={data.articleCount} recipes={data.recipeCount} />
