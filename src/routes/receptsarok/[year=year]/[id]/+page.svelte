<script lang="ts">
  import NutritionTable from '$lib/components/NutritionTable.svelte'
  import PaywallCTA from '$lib/components/PaywallCTA.svelte'
  import Search from '$lib/components/Search.svelte'
  import Nav2 from '$lib/components/Nav2.svelte'
  import { browser } from '$app/environment'
  import { firebaseAuth } from '$lib/firebase'
  import { hasReceptsarokAccess } from '$lib/authStore'
  import ReceptsarokLogo from '$lib/components/ReceptsarokLogo.svelte'
  import ReadingLayout from '$lib/components/ReadingLayout.svelte'
  import BannerTop from '$lib/components/BannerTop.svelte'
  import BannerSide from '$lib/components/BannerSide.svelte'
  import { gridCellWidth } from '$lib/bannerSlots.js'
  import ContentHeader from '$lib/components/ContentHeader.svelte'
  import AuthorSignature from '$lib/components/AuthorSignature.svelte'
  import { decodeHtmlEntities } from '$lib/htmlEntities.js'
  import ReceptsarokWidget from '$lib/components/ReceptsarokWidget.svelte'
  import MealPlanner from '$lib/components/MealPlanner.svelte'
  import { plannerOpen } from '$lib/mealPlannerStore'
  import {
    recipeCardImg,
    recipeImageAlt,
    recipeDetailSegments,
    type Recipe,
  } from '$lib/receptsarok'
  import type { PageProps } from './$types'

  let { data }: PageProps = $props()

  const recipe = $derived(data.recipe as Recipe)
  const isFree = $derived(data.isFree)
  const category = $derived(data.categories.find((c: any) => c.id === data.categoryId))

  // Banners exactly as on a magazine article: the rotating top banner above the
  // header, the `prominent` side banners in the reading layout's rail (on phones the
  // first one after the column). Shown to subscribers too (editorial decision).
  const topBanners = $derived(data.conf?.top_banners ?? [])
  const sideBanners = $derived((data.conf?.side_banners ?? []).filter((b: any) => b.prominent))

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

<!-- Same reading column + header as a magazine article (ReadingLayout / ContentHeader):
     `.prose` at its 65ch measure; the felcím slot holds the Receptsarok breadcrumb. -->
{#if topBanners.length}
  <BannerTop banners={topBanners} />
{/if}

<ReadingLayout banners={sideBanners} mobileBanner={false}>
  <ContentHeader
    title={recipe.title}
    lead={recipe.introtext ?? ''}
    authors={recipe.author
      ? [
          {
            // Same rules as an article byline: the record's display name and profile
            // when the sync matched one, else the recipe's own name and a search for it.
            name: data.authors?.[0]?.displayName
              ? decodeHtmlEntities(data.authors[0].displayName)
              : recipe.author,
            href: recipe.authorSlug
              ? `/szerzok/${recipe.authorSlug}`
              : `/keres?q=${encodeURIComponent(recipe.author)}`,
          },
        ]
      : []}
    meta={[{ text: String(recipe.year) }]}
    badges={[
      ...(recipe.servings.amount
        ? [{ label: `${recipe.servings.amount} ${recipe.servings.unit}` }]
        : []),
      ...(isFree ? [{ label: 'ingyenes', tone: 'success' as const }] : []),
    ]}
  >
    {#snippet kicker()}
      <nav aria-label="Elérési út">
        <a href="/receptsarok"><ReceptsarokLogo class="text-sm" /></a>
        <span aria-hidden="true"> › </span>
        <a href="/receptsarok/{recipe.category}">{category?.name || recipe.category}</a>
      </nav>
    {/snippet}
  </ContentHeader>

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
      <img src={heroCardImg.src} alt={recipeImageAlt(heroCardImg, displayRecipe.title)} class="mx-auto" />
      {#if heroCardImg.caption}
        <figcaption class="mt-2 text-sm text-base-content/70">{heroCardImg.caption}</figcaption>
      {/if}
    </figure>
  {/if}

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
                alt={recipeImageAlt(sub.img, sub.title)}
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

  {#each data.authors ?? [] as author, i (author.slug)}
    <AuthorSignature {author} first={i === 0} />
  {/each}
</ReadingLayout>

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

<!-- Phones: the first side banner comes after the meal planner (button, and the
     planner itself when open) — not right under the recipe, where it would sit next to
     the paywall prompt. ≥ md it is in the reading layout's rail instead. -->
{#if sideBanners.length}
  <div class="md:hidden px-4 pt-6 pb-12">
    <!-- One cell of the „Kapcsolódó receptek” grid wide (gap-4), centred. -->
    <aside class="mx-auto w-full" aria-label="Hirdetés" use:gridCellWidth={{ gap: '1rem' }}>
      <BannerSide banner={sideBanners[0]} />
    </aside>
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
  <!-- Phones: prominent banners 2…n among these cards, each once — the ones without
       a slot after the last card (the 1st one sits after the meal planner). -->
  <ReceptsarokWidget
    banners={sideBanners.slice(1)}
    appendRest
    adsDistance={data.conf?.ads_distance ?? 4}
    recipes={similar.similarRecipes ?? []}
    title={similar.similarIsLinked ? '' : recipe.title}
    heading={similar.similarIsLinked ? 'Kapcsolódó receptek a Receptsarokban' : undefined}
  />
{:catch}
  <!-- Recommendations are non-critical; on a resolve failure show nothing. -->
{/await}

<Nav2 actual="/receptsarok" />
<Search articles={data.articleCount} recipes={data.recipeCount} />
