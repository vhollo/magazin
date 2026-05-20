<script context="module">
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
  import { onMount } from 'svelte'
  import { page } from '$app/stores'
  import MiniSearch from 'minisearch'

  import { hasReceptsarokAccess } from '$lib/authStore'

  export let data

  const conf = data.conf
  const doc = data.doc

  let ms = null
  let ready = false
  let indexLoading = false
  let loadError = null

  onMount(async () => {
    indexLoading = true
    try {
      const meta = await fetch('/search-meta.json').then(r => {
        if (!r.ok) throw new Error(`search-meta.json: ${r.status}`)
        return r.json()
      })
      const resp = await fetch(meta.indexUrl)
      if (!resp.ok) throw new Error(`index fetch: ${resp.status}`)
      const ds = new DecompressionStream('gzip')
      const decompressed = resp.body.pipeThrough(ds)
      const text = await new Response(decompressed).text()
      ms = MiniSearch.loadJSON(text, {
        fields: ['szerzo', 'longtitle', 'description', 'ellipsis', 'content'],
        storeFields: ['id', 'path', 'title', 'longtitle', 'description', 'ellipsis', 'content', 'img', 'tv', 'szerzo', 'free', 'recipeTeaser'],
      })
      ready = true
    } catch (err) {
      loadError = err?.message ?? 'Hiba a keresési index betöltésekor.'
    } finally {
      indexLoading = false
    }
  })

  $: q = $page.url.searchParams.get('q') ?? ''

  $: hits = (ready && q && q.length >= 2)
    ? ms.search(q, { boost: { ellipsis: 2 }, fuzzy: 0.2 })
    : []

  $: docs = hits.map((c) => {
    if (typeof c.path === 'string' && c.path.startsWith('receptsarok/')) {
      return { ...c, locked: !c.free && !$hasReceptsarokAccess }
    }
    return c
  })

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
<Search articles={data.articleCount} recipes={data.recipeCount} />
<Nav2 actual='keres'/>

<article id="lista" class="prose mt-16 mb-8 mx-auto w-full">
  {#if indexLoading && !ready}
    <div class="flex justify-center py-8 not-prose">
      <span class="loading loading-spinner loading-lg"></span>
    </div>
  {:else if loadError}
    <p class="text-center text-error">{loadError}</p>
  {:else if docs.length}
    <h1 class="text-center">{docstitle}</h1>
  {/if}
</article>
{#if docs.length}
  <Cards cards={docs} banners={conf.side_banners} ads_distance={conf.ads_distance}/>
{/if}
