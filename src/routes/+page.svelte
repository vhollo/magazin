<script module>
  import { browser } from '$app/environment'

  import Cards from '$lib/components/Cards.svelte'
  import Carousel from '$lib/components/Carousel.svelte'
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

</script>

<script>
// @ts-nocheck
  import { afterNavigate } from '$app/navigation'
  import { tick } from 'svelte'
  export let data

  import { ads } from '$lib/ads.js'
  $: conf = data.conf
  $: prominent = conf.side_banners.filter(sb => sb.prominent)
  // console.log('conf.side_banners',conf.side_banners)

  // let docstitle
  // console.log('[path]', data.doc.related)

  $: doc = data.doc
  let docs = data.docs  // $: if (doc.id) console.log(doc.tv)
  let matchingSubcat = null;

  $: Object.keys(copycats).forEach(cat => {
    Object.keys(copycats[cat]).forEach(subcat => {
      if (copycats[cat][subcat] === `/${doc.path}`) {
        matchingSubcat = subcat; // Store the matching subcategory name
      }
    });
  });

  $: docstitle = doc.title || matchingSubcat
  // $: console.log(doc.title, matchingSubcat)

  // ── Scroll restoration ─────────────────────────────────────────────────────
  // app.html restores scroll before hydration; here we finish once the masonry
  // packs and any deeper page (#2, #5…) expands — retrying until we reach the
  // saved Y so it can "scroll further when ready". behavior:'instant' avoids the
  // global scroll-behavior:smooth animating each retry. (browser comes from the
  // module script above.) Mirrors [...path]/+page.svelte.
  let pendingScrollY = null

  async function restoreScrollWhenReady() {
    if (pendingScrollY == null || !browser) return
    const y = pendingScrollY
    await tick()
    await tick()
    let attempts = 0
    const tryScroll = () => {
      window.scrollTo({ top: y, left: 0, behavior: 'instant' })
      attempts++
      if (window.scrollY >= y - 2 || attempts >= 12) {
        pendingScrollY = null
        return
      }
      setTimeout(tryScroll, 50)
    }
    requestAnimationFrame(() => requestAnimationFrame(tryScroll))
  }

  export const snapshot = {
    capture: () => ({ scrollY: browser ? window.scrollY : 0 }),
    restore: (value) => {
      if (browser && typeof value?.scrollY === 'number') pendingScrollY = value.scrollY
    },
  }

  afterNavigate((navigation) => {
    if (!browser) return
    if (navigation.type !== 'enter' && navigation.type !== 'popstate') return
    if (pendingScrollY == null) {
      try {
        const idx = history.state?.['sveltekit:history']
        const map = JSON.parse(sessionStorage['sveltekit:scroll'] || '{}')
        const pos = idx != null ? map[idx] : null
        if (pos && typeof pos.y === 'number') pendingScrollY = pos.y
      } catch (e) { /* ignore */ }
    }
    if (pendingScrollY != null) restoreScrollWhenReady()
  })
</script>

<svelte:head>
  <title>{(docstitle ? docstitle + ' • ' : '') + conf.sitename}</title>
  <meta name="description" content={doc.ellipsis || conf.description || 'www.diabetes.hu • Az Alapítvány a Cukorbetegekért betegtájékoztató lapja. Kiadja a Tudomány Kiadó Kft.'}/>
  <meta name="keywords" content={doc.tv?.tags?.join(', ') || conf.tags.join(', ') || 'diabetes, diabétesz, cukorbetegség, vese, keton, Tudomány Kiadó Kft'}/>
  <meta name="author" content={doc.tv?.szerzo?.join(', ') || 'diabetes.hu'}/>
  <meta name="og:image" content={doc.tv?.ogi || conf.ogi || '/icon.svg'}/>
  <meta name="og:title" content={doc.longtitle || doc.title || conf.sitename || 'Diabetes'}/>
  <meta name="og:description" content={doc.description || conf.description || 'www.diabetes.hu • Az Alapítvány a Cukorbetegekért betegtájékoztató lapja. Kiadja a Tudomány Kiadó Kft.'}/>
  <meta name="og:url" content={doc.url || 'https://diabetes.hu'}/>
  <meta name="og:site_name" content="Diabetes"/>
  <meta name="og:type" content="article"/>
  <meta name="og:locale" content="hu_HU"/>
  {#if doc.img}
    <link rel="preload" href={doc.img.src} as="image"/>
  {/if}
</svelte:head>
<!-- <svelte:window bind:this={win}/> -->

<Carousel/>

{#if conf.top_banners.length}
  <BannerTop banners={conf.top_banners}/>
{/if}
<Search articles={data.articleCount} recipes={data.recipeCount} />
<Nav2 actual={data.path}/>

{#if docs.length}
  <article class="prose mt-16 mb-8 mx-auto w-full">
    {#if !doc.id}
      <h1 class="text-center">{doc.id && '' || docstitle}</h1>
    {:else}
      <h2 class="text-center">Kapcsolódó cikkek</h2>
    {/if}
  </article>
  <Cards cards={docs} banners={conf.side_banners} ads_distance={conf.ads_distance}/>
{/if}

<!-- {#if volume * pagenum < data.docs.length}
<footer class="footer footer-center bg-base-200 text-base-content pt-4">
  <button on:click={_pagenum} class="btn btn-outline">További cikkek</button>
</footer>
{/if} -->

<style>

</style>