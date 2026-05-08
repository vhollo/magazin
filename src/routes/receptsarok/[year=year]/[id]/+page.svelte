<script lang="ts">
  import NutritionTable from '$lib/components/NutritionTable.svelte'
  import PaywallCTA from '$lib/components/PaywallCTA.svelte'
  import Search from '$lib/components/Search.svelte'
  import Nav2 from '$lib/components/Nav2.svelte'
  import { browser } from '$app/environment'
  import { firebaseAuth } from '$lib/firebase'
  import { hasReceptsarokAccess } from '$lib/authStore'
  import ReceptsarokLogo from '$lib/components/ReceptsarokLogo.svelte'
  import { recipeDetailSegments, recipeHeroToCardImg, type Recipe } from '$lib/receptsarok'
  import type { PageProps } from './$types'

  let { data }: PageProps = $props()

  const recipe = $derived(data.recipe as Recipe)
  const isFree = $derived(data.isFree)
  const category = $derived(data.categories.find((c: any) => c.id === data.categoryId))

  let canView = $derived(isFree || $hasReceptsarokAccess)

  let fullRecipe = $state<Recipe | null>(null)
  let fullLoading = $state(false)

  let displayRecipe = $derived((fullRecipe ?? recipe) as Recipe)

  let heroCardImg = $derived(
    recipeHeroToCardImg(displayRecipe.year, displayRecipe.image, displayRecipe.img)
  )

  $effect(() => {
    if (!browser) return
    const r = recipe
    if (isFree) {
      fullRecipe = null
      fullLoading = false
      return
    }
    if (!$hasReceptsarokAccess) {
      fullRecipe = null
      fullLoading = false
      return
    }

    const segs = recipeDetailSegments(r)
    let cancelled = false
    fullRecipe = null
    fullLoading = true

    ;(async () => {
      try {
        const user = firebaseAuth.currentUser
        if (!user) {
          if (!cancelled) fullLoading = false
          return
        }
        const token = await user.getIdToken()
        const res = await fetch(`/api/receptsarok/recipe/${segs}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (cancelled) return
        if (res.ok) {
          const j = await res.json()
          fullRecipe = j.recipe as Recipe
        }
      } finally {
        if (!cancelled) fullLoading = false
      }
    })()

    return () => {
      cancelled = true
    }
  })
</script>

<svelte:head>
  <title>{recipe.title} • Receptsarok</title>
  <meta name="description" content="{recipe.author} receptje — {recipe.energy} kcal, {recipe.protein}g fehérje, {recipe.carbs}g szénhidrát" />
  {#if heroCardImg}
    <meta property="og:image" content={heroCardImg.src} />
    <link rel="preload" href={heroCardImg.src} as="image" />
  {/if}
</svelte:head>

<article class="prose mt-8 mb-4 mx-auto w-full px-4">
  <nav class="breadcrumbs text-sm not-prose" aria-label="Elérési út">
    <ul>
      <li><a href="/receptsarok" class="opacity-70 hover:opacity-100"><ReceptsarokLogo class="text-sm" /></a></li>
      <li>
        <a href="/receptsarok/{recipe.category}" class="opacity-70 hover:opacity-100">{category?.name || recipe.category}</a>
      </li>
      <li class="max-w-[min(100%,40ch)] truncate" title={recipe.title}>{recipe.title}</li>
    </ul>
  </nav>
  <h1 class="text-center">{recipe.title}</h1>
  <p class="text-center italic">{recipe.author} receptje</p>
</article>

<article class="prose mx-auto w-full max-w-prose px-4 pb-12">
  {#if heroCardImg}
    <figure class="text-center not-prose">
      <img src={heroCardImg.src} alt={displayRecipe.image?.alt ?? displayRecipe.title} class="mx-auto" />
      {#if displayRecipe.image?.caption}
        <figcaption class="mt-2 text-sm text-base-content/70">{displayRecipe.image.caption}</figcaption>
      {/if}
    </figure>
  {/if}

  <div class="flex flex-wrap gap-2 my-4">
    <span class="badge badge-outline badge-sm">{recipe.servings.amount} {recipe.servings.unit}</span>
    <span class="badge badge-outline badge-sm">{recipe.year}</span>
    {#if isFree}
      <span class="badge badge-success">ingyenes</span>
    {/if}
  </div>

  {#each recipe.nutritionTables as table}
    <NutritionTable {table} />
  {/each}

  <!-- {#if recipe.nutritionTables.length === 0}
    <NutritionTable table={{
      label: '1 adag energia- és tápanyagtartalma:',
      energy: recipe.energy,
      protein: recipe.protein,
      fat: recipe.fat,
      saturatedFat: recipe.saturatedFat,
      carbs: recipe.carbs,
      fiber: recipe.fiber
    }} />
  {/if} -->

  {#if canView}
    {#if !isFree && $hasReceptsarokAccess && (fullLoading || !fullRecipe)}
      <p class="opacity-70 my-6" class:animate-pulse={fullLoading}>
        {fullLoading ? 'Recept betöltése…' : 'Nem sikerült betölteni a receptet. Frissítsd az oldalt.'}
      </p>
    {:else}
      {#each displayRecipe.ingredientGroups as group}
        {#if group.section}
          <h3>{group.section}</h3>
        {:else}
          <h2>Hozzávalók {displayRecipe.servings.amount} {displayRecipe.servings.unit}hoz</h2>
        {/if}
        <ul>
          {#each group.items as item, i}
            <li>{item.text}{i < group.items.length - 1 ? ',' : '.'}</li>
          {/each}
        </ul>
      {/each}

      <h2>A recept elkészítése</h2>
      {#each displayRecipe.instructions as paragraph}
        <p>{paragraph}</p>
      {/each}

      {#if displayRecipe.subRecipes?.length}
        <hr />
        {#each displayRecipe.subRecipes as sub}
          <h2>{sub.title}</h2>
          <p class="text-sm opacity-60">{sub.servings.amount} {sub.servings.unit}</p>

          {#each sub.nutritionTables as table}
            <NutritionTable {table} />
          {/each}

          {#each sub.ingredientGroups as group}
            {#if group.section}
              <h4>{group.section}</h4>
            {:else}
              <h3>Hozzávalók</h3>
            {/if}
            <ul>
              {#each group.items as item, i}
                <li>{item.text}{i < group.items.length - 1 ? ',' : '.'}</li>
              {/each}
            </ul>
          {/each}

          <h3>A recept elkészítése</h3>
          {#each sub.instructions as paragraph}
            <p>{paragraph}</p>
          {/each}

          {#if sub.image}
            <figure class="text-center not-prose">
              <img src="/rs/{recipe.year}/{sub.image.src}" alt={sub.image.alt} class="mx-auto" />
              {#if sub.image.caption}
                <figcaption class="mt-2 text-sm text-base-content/70">{sub.image.caption}</figcaption>
              {/if}
            </figure>
          {/if}
        {/each}
      {/if}
    {/if}
  {:else}
    <PaywallCTA context="recipe" />
  {/if}
</article>

<Search articles={data.articleCount} recipes={data.recipeCount} />
<Nav2 actual="/receptsarok" />
