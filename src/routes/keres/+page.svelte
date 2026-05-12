<script context="module">
  import Cards from '$lib/components/Cards.svelte'
  // import Carousel from '$lib/components/Carousel.svelte'
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
  // import { afterNavigate, replaceState } from '$app/navigation';
  // import { page, navigating } from '$app/state';
  export let data

  import { hasReceptsarokAccess } from '$lib/authStore'
  import { ads } from '$lib/ads.js'
  const conf = data.conf
  const prominent = conf.side_banners.filter(sb => sb.prominent)
  // console.log('conf.side_banners',conf.side_banners)

  let docstitle
  // console.log('[path]', data.doc.related)

  $: doc = data.doc
  /** Receptsarok hits: subscription-aware lock (see CardBody). */
  $: docs = data.docs.map((c) => {
    if (typeof c.path === 'string' && c.path.startsWith('receptsarok/')) {
      return { ...c, locked: !c.free && !$hasReceptsarokAccess }
    }
    return c
  })
  // $: if (doc.id) console.log(doc.tv)



  /* let win, pagenum = 1, volume = 18, docs = []
  afterNavigate(() => {
    pagenum = win?.location.hash.replace('#', '') || 1
    docs = data.docs.slice(0, volume * pagenum)
  })
  const _pagenum = () => {
    pagenum++
    docs = data.docs.slice(0, volume * pagenum)
    // if (volume * pagenum >= data.docs.length) pagenum = 0
    replaceState('#'+pagenum);
    // console.log(pagenum)
  } */

  $: pubdate = doc && new Date(doc.publishedon * 1000).toLocaleDateString('hu-HU')
  $: editdate = doc && new Date(doc.editedon * 1000).toLocaleDateString('hu-HU')
  // $: console.log('editedon',doc.editedon)
  // $: console.log('publishedon',doc.publishedon)

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
</svelte:head>
<!-- <svelte:window bind:this={win}/> -->

{#if conf.top_banners.length}
  <BannerTop banners={conf.top_banners}/>
{/if}
<Search articles={data.articleCount} recipes={data.recipeCount} />
<Nav2 actual='keres'/>

{#if docs.length}
  <article id="lista" class="prose mt-16 mb-8 mx-auto w-full">
    {#if !doc.id}
      <h1 class="text-center">{doc.id && '' || docstitle}</h1>
    {:else}
      <h2 class="text-center">Hasonló cikkek</h2>
    {/if}
  </article>
  <Cards cards={docs} banners={conf.side_banners} ads_distance={conf.ads_distance}/>
{/if}
