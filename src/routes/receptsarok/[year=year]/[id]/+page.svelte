<script lang="ts">
  import NutritionTable from '$lib/components/NutritionTable.svelte'
  import PaywallCTA from '$lib/components/PaywallCTA.svelte'
  import Search from '$lib/components/Search.svelte'
  import Nav2 from '$lib/components/Nav2.svelte'
  import { browser } from '$app/environment'
  import { firebaseAuth } from '$lib/firebase'
  import { hasReceptsarokAccess } from '$lib/authStore'
  import ReceptsarokLogo from '$lib/components/ReceptsarokLogo.svelte'
  import ReceptsarokWidget from '$lib/components/ReceptsarokWidget.svelte'
  import MealPlanner from '$lib/components/MealPlanner.svelte'
  import { plannerOpen } from '$lib/mealPlannerStore'
  import {
    recipeCardImg,
    recipeDetailSegments,
    type Recipe,
  } from '$lib/receptsarok'
  import type { PageProps } from './$types'

  let { data }: PageProps = $props()

  const recipe = $derived(data.recipe as Recipe)
  const isFree = $derived(data.isFree)
  const category = $derived(data.categories.find((c: any) => c.id === data.categoryId))

  const metaDescription = $derived.by(() => {
    const parts: string[] = []
    if (typeof recipe.energy === 'number') parts.push(`${recipe.energy} kcal`)
    if (typeof recipe.protein === 'number') parts.push(`${recipe.protein} g fehérje`)
    if (typeof recipe.fat === 'number') parts.push(`${recipe.fat} g zsír`)
    if (typeof recipe.carbs === 'number') parts.push(`${recipe.carbs} g szénhidrát`)
    return parts.length ? `${recipe.author} receptje – ${parts.join(', ')}` : `${recipe.author} receptje`
  })

  let canView = $derived(isFree || $hasReceptsarokAccess)

  let fullRecipe = $state<Recipe | null>(null)
  let fullLoading = $state(false)

  let displayRecipe = $derived((fullRecipe ?? recipe) as Recipe)

  // "Hozzávalók N <unit>hoz" – the suffix follows Hungarian vowel harmony, chosen
  // from the counted noun's last vowel (the head word, ignoring any "(…)" qualifier
  // like "szelet (24 cm-es tortaforma)"). Back-vowel units keep "-hoz" (adag→adaghoz,
  // darab→darabhoz); front-vowel ones get "-hez"/"-höz" (szelet→szelethez, fő→főhöz).
  function ingredientUnitTo(unit: string): string {
    const head = String(unit ?? '').trim().split(/\s+/)[0] ?? ''
    const vowels = head.toLowerCase().match(/[aáeéiíoóöőuúüű]/g)
    const last = vowels?.length ? vowels[vowels.length - 1] : ''
    const suffix = last && 'eéií'.includes(last) ? 'hez' : last && 'öőüű'.includes(last) ? 'höz' : 'hoz'
    return `${unit}${suffix}`
  }

  let heroCardImg = $derived(recipeCardImg(displayRecipe))
  let recipeVideo = $derived.by(() => {
    const video = displayRecipe.video

    if (video && typeof video === 'object') {
      const src = typeof video.src === 'string' ? video.src.trim() : ''
      if (!src || src.includes('<')) return null

      const poster =
        typeof video.poster === 'string' && video.poster.trim() ? video.poster.trim() : null

      return { src, poster }
    }

    if (typeof video === 'string') {
      const src = video.trim()
      if (!src || src.includes('<')) return null
      return { src, poster: null }
    }

    return null
  })

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
  <meta name="description" content="{metaDescription}" />
  {#if heroCardImg}
    <meta property="og:image" content={heroCardImg.src} />
    <link rel="preload" href={heroCardImg.src} as="image" />
  {/if}
</svelte:head>

<header class="mx-auto w-full max-w-4xl px-4 p-10 sm:pt-14">
  <nav class="breadcrumbs text-sm mb-6" aria-label="Elérési út">
    <ul>
      <li><a href="/receptsarok" class="opacity-70 hover:opacity-100"><ReceptsarokLogo class="text-sm" /></a></li>
      <li>
        <a href="/receptsarok/{recipe.category}" class="opacity-70 hover:opacity-100">{category?.name || recipe.category}</a>
      </li>
      <!-- <li class="max-w-[min(100%,40ch)] truncate" title={recipe.title}>{recipe.title}</li> -->
    </ul>
  </nav>
  <h1 class="display text-3xl leading-tight text-balance sm:text-4xl">{recipe.title}</h1>
  <p class="mt-2 italic opacity-80">{recipe.author}</p>
</header>

<!-- Reading column: `prose` keeps its 65ch measure, left-aligned on the page's
     max-w-7xl rail (the rail lives on the wrapper — putting max-w-7xl on the
     `.prose` element itself would blow the measure out to 1440px). -->
<div class="mx-auto w-full max-w-4xl px-4 pb-12">
<article class="prose max-w-4xl">
  {#if recipeVideo?.src}
    <figure class="not-prose my-6">
      <video
        class="w-full rounded-lg"
        controls
        playsinline
        preload="metadata"
        poster={recipeVideo.poster ?? undefined}
      >
        <source src={recipeVideo.src} type="video/mp4" />
      </video>
    </figure>
  {:else if heroCardImg}
    <figure class="text-center not-prose">
      <img src={heroCardImg.src} alt={heroCardImg.alt ?? displayRecipe.title} class="mx-auto" />
      {#if heroCardImg.caption}
        <figcaption class="mt-2 text-sm text-base-content/70">{heroCardImg.caption}</figcaption>
      {/if}
    </figure>
  {/if}

  <div class="flex flex-wrap gap-2 my-4">
    {#if recipe.servings.amount}
    <span class="badge badge-outline badge-sm">{recipe.servings.amount} {recipe.servings.unit}</span>
    {/if}
    <span class="badge badge-outline badge-sm">{recipe.year}</span>
    {#if isFree}
      <span class="badge badge-success badge-sm">ingyenes</span>
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
          <h2>Hozzávalók {displayRecipe.servings.amount} {ingredientUnitTo(displayRecipe.servings.unit)}</h2>
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

          {#if sub.img}
            <figure class="text-center not-prose">
              <img
                src={sub.img.src}
                alt={sub.img.alt ?? sub.title}
                class="mx-auto"
              />
              {#if sub.img.caption}
                <figcaption class="mt-2 text-sm text-base-content/70">{sub.img.caption}</figcaption>
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
</div>

<div class="mx-auto px-4 py-4">
  <button class="btn btn-outline" onclick={() => $plannerOpen = !$plannerOpen}>
    {$plannerOpen ? 'Étlaptervező bezárása' : 'Heti étlaptervező'}
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-5">
      <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
    </svg>
  </button>
</div>

{#if $plannerOpen}
  <div class="mx-auto w-full max-w-7xl px-4 py-6">
    <MealPlanner
      categories={data.categories}
      currentRecipe={{
        year: recipe.year,
        id: recipe.id,
        title: recipe.title,
        energy: recipe.energy,
        protein: recipe.protein,
        carbs: recipe.carbs,
      }}
    />
  </div>
{/if}

{#await data.similar}
  <!-- Streamed on a cold render: the recipe above paints immediately while the
       recommendations resolve. Skeleton mirrors ReceptsarokWidget's card grid so
       the fill-in doesn't shift the page. -->
  <section class="mx-auto w-full max-w-7xl px-4 pt-10 pb-8 sm:pt-14" aria-busy="true">
    <h2 class="display text-2xl sm:text-3xl">Kapcsolódó receptek</h2>
    <div
      class="grid gap-4 mt-6"
      style="grid-template-columns: repeat(auto-fill, minmax(24ch, 1fr));"
    >
      {#each Array.from({ length: 4 }) as _, i (i)}
        <div class="skeleton h-64 w-full rounded-lg"></div>
      {/each}
    </div>
  </section>
{:then similar}
  <ReceptsarokWidget
    recipes={similar.similarRecipes ?? []}
    title={similar.similarIsLinked ? '' : recipe.title}
    heading={similar.similarIsLinked ? 'Kapcsolódó receptek a Receptsarokban' : undefined}
  />
{:catch}
  <!-- Recommendations are non-critical; on a resolve failure show nothing. -->
{/await}

<Search articles={data.articleCount} recipes={data.recipeCount} />
<Nav2 actual="/receptsarok" />
