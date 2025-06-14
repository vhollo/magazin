<script context="module">
  import Cards from '$lib/components/Cards.svelte'
  import Carousel from '$lib/components/Carousel.svelte'
  import Search from '$lib/components/Search.svelte'
  import Nav2 from '$lib/components/Nav2.svelte'
  import BannerTop from '$lib/components/BannerTop.svelte'

</script>

<script>
  // @ts-nocheck
  // import { onMount, afterUpdate } from 'svelte'

  export let data
  // console.log('[/]',data.docs.length)
  // let pagenum = 1

  //$: (data) => { doc = data.doc stb…}
  //$: doc = data.doc
  let docs = data.docs.slice(0, 18 * 4)
  const conf = data.conf
  // console.log('conf.side_banners',conf.side_banners)

</script>

<svelte:head>
  <title>{conf?.sitename || 'Diabetes'}</title>
  <meta name="description" content={conf?.description || 'www.diabetes.hu &bull; Az Alapítvány a Cukorbetegekért betegtájékoztató lapja. Kiadja a Tudomány Kiadó Kft. Kiadványtervezés és web-fejlesztés: Portmed Kft.'} />
  <meta name="keywords" content={conf?.tags.join(', ')}/>
  <meta name="author" content="diabetes.hu"/>
  <meta name="og:image" content={conf?.ogi}/>
  <meta name="og:title" content={conf?.sitename || 'Diabetes'}/>
  <meta name="og:description" content={conf?.description || 'www.diabetes.hu &bull; Az Alapítvány a Cukorbetegekért betegtájékoztató lapja. Kiadja a Tudomány Kiadó Kft. Kiadványtervezés és web-fejlesztés: Portmed Kft.'} />
  <meta name="og:url" content="https://diabetes.hu"/>
  <meta name="og:site_name" content="Diabetes"/>
  <meta name="og:type" content="website"/>
  <meta name="og:locale" content="hu_HU"/>
</svelte:head>

<Carousel/>

{#if conf.top_banners.length}
<BannerTop banners={conf.top_banners}/>
{/if}
<Search/>
<Nav2 actual={data.doc.path}/>

{#if docs.length}
<article class="prose mt-16 mb-8 mx-auto w-full">
  <h1 class="text-center">A legfrissebb cikkek</h1>
</article>
  <Cards cards={docs} banners={conf.side_banners} ads_distance={conf.ads_distance}/>
{/if}
