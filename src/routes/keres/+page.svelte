<script module>
  import Cards from '$lib/components/Cards.svelte'
  import Search from '$lib/components/Search.svelte'
  import Nav2 from '$lib/components/Nav2.svelte'
  import BannerSide from '$lib/components/BannerSide.svelte'
  import BannerTop from '$lib/components/BannerTop.svelte'

  import { nav2 } from '$lib/nav2.js'
  let copycats = JSON.parse(JSON.stringify(nav2))
  copycats['carousel'] = {}
  copycats['carousel']['Segítség, cukorbeteg vagyok!'] = '/s-o-s'
  copycats['carousel']['Gesztációs diabétesz'] = '/gyermekvallalas'
  copycats['carousel']['Receptek'] = '/receptek'
  copycats['carousel']['Táplálkozás'] = '/taplalkozas'
  copycats['carousel']['Klubok, Egyesületek'] = '/hirek'
  copycats['nav1'] = {}
  copycats['nav1']['Hírek'] = '/hirek'
  copycats['keres'] = {}
  copycats['keres']['Keresés'] = '/keres'

</script>

<script>
// @ts-nocheck
  import { browser } from '$app/environment'
  import { afterNavigate } from '$app/navigation'
  import { onMount, tick } from 'svelte'
  import { page } from '$app/stores'

  import { hasReceptsarokAccess } from '$lib/authStore'
  import { getCachedSearchIndex, getSearchIndex } from '$lib/magazine/searchIndexCache'
  import { isReceptsarokRecipePath, normalizeRecipeTeaser } from '$lib/receptsarok'

  export let data

  $: conf = data.conf
  $: doc = data.doc
  $: recipeTeasersByKey = data.recipeTeasersByKey ?? {}

  const cachedOnInit = browser ? getCachedSearchIndex() : null
  let ms = cachedOnInit
  let ready = !!cachedOnInit
  let indexLoading = !cachedOnInit
  let loadError = null
  /** Cards restored from snapshot on browser Back (instant paint). */
  let restoredDocs = null
  /** Scroll to apply after result cards have rendered (SvelteKit scroll runs too early). */
  let pendingScrollY = null

  async function restoreScrollWhenReady() {
    if (pendingScrollY == null || !browser) return
    const y = pendingScrollY
    await tick()
    await tick()

    let attempts = 0
    const tryScroll = () => {
      window.scrollTo({ top: y, left: 0, behavior: 'auto' })
      attempts++
      const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
      const target = Math.min(y, maxScroll)
      if (Math.abs(window.scrollY - target) <= 2 || attempts >= 12) {
        pendingScrollY = null
        return
      }
      setTimeout(tryScroll, 50)
    }

    requestAnimationFrame(() => requestAnimationFrame(tryScroll))
  }

  /** @type {import('./$types').Snapshot<{ docs: unknown[]; scrollY: number }>} */
  export const snapshot = {
    capture: () => ({
      docs: displayDocs,
      scrollY: browser ? window.scrollY : 0,
    }),
    restore: (value) => {
      if (value?.docs?.length) restoredDocs = value.docs
      if (browser && typeof value?.scrollY === 'number') {
        pendingScrollY = value.scrollY
      }
    },
  }

  afterNavigate((navigation) => {
    if (navigation.type !== 'popstate') return
    if (navigation.to?.url?.pathname !== '/keres') return
    if (displayDocs.length && pendingScrollY != null) restoreScrollWhenReady()
  })

  onMount(async () => {
    if (ready) return
    indexLoading = true
    try {
      ms = await getSearchIndex()
      ready = true
    } catch (err) {
      loadError =
        'A keresési index még nem érhető el. Próbálja újra később, vagy böngésszen a rovatok között.'
      if (import.meta.env.DEV || (typeof window !== 'undefined' && /localhost|127\.0\.0\.1/.test(window.location.hostname))) {
        console.warn('search index load failed:', err)
      }
    } finally {
      indexLoading = false
    }
  })

  $: q = browser ? ($page.url.searchParams.get('q') ?? '') : ''

  $: hits = (ready && q && q.length >= 2)
    ? ms.search(q, { boost: { ellipsis: 2 }, fuzzy: 0.2 })
    : []

  function recipeTeaserFromHit(c, teasersByKey) {
    const partial = c.recipeTeaser ?? {}
    let year = partial.year
    let id = partial.id
    const m = /^receptsarok\/(\d+)\/([^/]+)/.exec(c.path ?? '')
    if (m) {
      year = Number(m[1])
      id = decodeURIComponent(m[2])
    }
    const key = year && id ? `${year}/${id}` : ''
    const fromRecipes = key ? teasersByKey?.[key] : null
    return normalizeRecipeTeaser({
      ...(fromRecipes ?? partial),
      year: year ?? partial.year,
      id: id ?? partial.id,
      title: (fromRecipes ?? partial).title ?? c.title ?? '',
    })
  }

  $: docs = hits.map((c) => {
    if (isReceptsarokRecipePath(c.path)) {
      return {
        ...c,
        recipeTeaser: recipeTeaserFromHit(c, recipeTeasersByKey),
        locked: !c.free && !$hasReceptsarokAccess,
      }
    }
    return c
  })

  $: if (docs.length) restoredDocs = null

  $: displayDocs = docs.length ? docs : (restoredDocs ?? [])

  $: if (browser && displayDocs.length && pendingScrollY != null) {
    restoreScrollWhenReady()
  }

  $: docstitle = q ? `Keresés: "${q}"` : 'Keresés'
</script>

<svelte:head>
  <title>{(docstitle ? docstitle + ' • ' : '') + conf.sitename}</title>
  <meta name="description" content={conf.description || 'www.diabetes.hu • Az Alapítvány a Cukorbetegekért betegtájékoztató lapja. Kiadja a Tudomány Kiadó Kft.'}/>
  <meta name="keywords" content={conf.tags?.join(', ') || 'diabetes, diabétesz, cukorbetegség, vese, keton, Tudomány Kiadó Kft'}/>
  <meta name="author" content="diabetes.hu"/>
  <meta name="og:image" content={conf.ogi || '/icon.svg'}/>
  <meta name="og:title" content={docstitle || conf.sitename || 'Diabetes'}/>
  <meta name="og:description" content={conf.description || 'www.diabetes.hu • Az Alapítvány a Cukorbetegekért betegtájékoztató lapja. Kiadja a Tudomány Kiadó Kft.'}/>
  <meta name="og:url" content="https://diabetes.hu/keres"/>
  <meta name="og:site_name" content="Diabetes"/>
  <meta name="og:type" content="article"/>
  <meta name="og:locale" content="hu_HU"/>
</svelte:head>

{#if conf.top_banners.length}
  <BannerTop banners={conf.top_banners}/>
{/if}
<Search articles={data.articleCount} recipes={data.recipeCount} {q} />
<Nav2 actual='keres'/>

<article id="lista" class="prose mt-16 mb-8 mx-auto w-full">
  {#if indexLoading && !ready && !displayDocs.length}
    <div class="flex justify-center py-8 not-prose">
      <span class="loading loading-spinner loading-lg"></span>
    </div>
  {:else if loadError}
    <p class="text-center text-error">{loadError}</p>
  {:else if displayDocs.length}
    <h1 class="text-center">{docstitle}</h1>
  {/if}
</article>
{#if displayDocs.length}
  <Cards cards={displayDocs} banners={conf.side_banners} ads_distance={conf.ads_distance}/>
{/if}
