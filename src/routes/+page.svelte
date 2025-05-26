<script context="module">
  import Cards from '$lib/components/Cards.svelte'
  import Carousel from '$lib/components/Carousel.svelte'
  import Search from '$lib/components/Search.svelte'
  import Nav2 from '$lib/components/Nav2.svelte'
  import { PUBLIC_BASE_URL } from '$env/static/public'
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
</svelte:head>

<Carousel/>

<BannerTop banners={conf.top_banners}/>
<Search/>
<Nav2 actual={data.doc.path}/>

{#if docs.length}
<article class="prose mt-16 mb-8 mx-auto w-full">
  <h1 class="text-center">A legfrissebb cikkek</h1>
</article>
  <Cards cards={docs} banners={conf.side_banners} ads_distance={conf.ads_distance}/>
{/if}
