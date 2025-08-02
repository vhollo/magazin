<script context="module">
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
  // import { afterNavigate, replaceState } from '$app/navigation';
  // import { page, navigating } from '$app/state';
  export let data

  import { ads } from '$lib/ads.js'
  const conf = data.conf
  const prominent = conf.side_banners.filter(sb => sb.prominent)
  // console.log('conf.side_banners',conf.side_banners)

  let docstitle
  // console.log('[path]', data.doc.related)

  $: doc = data.doc
  $: docs = data.docs
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

  /* $: if (doc.path == 'keres') {
      copycats['keres'] = {}
      copycats['keres'][doc.title] = '/keres'
      // console.log(doc.path)
    } */

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
  <title>{(docstitle ? docstitle + '&bull;' : '') + conf.sitename}</title>
  <meta name="description" content={doc.ellipsis || conf.description || 'www.diabetes.hu &bull; Az Alapítvány a Cukorbetegekért betegtájékoztató lapja. Kiadja a Tudomány Kiadó Kft.'}/>
  <meta name="keywords" content={doc.tv?.tags?.join(', ') || conf.tags.join(', ') || 'diabetes, diabétesz, cukorbetegség, vese, keton, Tudomány Kiadó Kft'}/>
  <meta name="author" content={doc.tv?.szerzo?.join(', ') || 'diabetes.hu'}/>
  <meta name="og:image" content={doc.tv?.ogi || conf.ogi || '/assets/logo-uj-diabetes-web.svg'}/>
  <meta name="og:title" content={doc.longtitle || doc.title || conf.sitename || 'Diabetes'}/>
  <meta name="og:description" content={doc.description || conf.description || 'www.diabetes.hu &bull; Az Alapítvány a Cukorbetegekért betegtájékoztató lapja. Kiadja a Tudomány Kiadó Kft.'}/>
  <meta name="og:url" content={doc.url || 'https://diabetes.hu'}/>
  <meta name="og:site_name" content="Diabetes"/>
  <meta name="og:type" content="article"/>
  <meta name="og:locale" content="hu_HU"/>
</svelte:head>
<!-- <svelte:window bind:this={win}/> -->

{#if doc.path == '/'}
  <Carousel/>
{/if}

{#if doc.id}
  {#if conf.top_banners.length}
    <BannerTop banners={conf.top_banners}/>
  {/if}
  <main class="bg-base-300 md:flex flex-row justify-center gap-8 px-2">
    <!--{@const date = new Date(doc.publishedon * 1000).toLocaleDateString('hu-HU')}-->
    <!--{@const meta = [doc.tv.szerzo, date, doc.tv.cat].join(' | ')}-->
    <article class="prose py-12 flex-1">
      {#if doc.description}
      <h2 class="felcim uppercase text-sm">{@html doc.description}</h2>
      {/if}
      <h1 class="title">{@html doc.longtitle || doc.title}</h1>
      <h4 class="introtext">{@html doc.introtext}</h4>
      <aside class="my-3">
        {#if doc.tv.szerzo?.length}
          {#each doc.tv.szerzo as sze, i}
            <a href={`/keres?q=${encodeURIComponent(sze.name)}`}><small class="uppercase">{sze.name}</small></a>{#if (i + 1) < doc.tv.szerzo.length},&nbsp;{/if}
          {/each}
          <!-- &nbsp; -->|
        {/if}
        <small title={`${editdate !== pubdate ? 'Szerkesztve: '+editdate : ''}`}>{pubdate}<sup>{editdate !== pubdate ? 'i' : ''}</sup></small>
        <small class="uppercase">{`${doc.tv.cat ? ' | ' + doc.tv.cat : ''}`}</small>
      </aside>
      <aside class="flex flex-wrap gap-2 mb-12">
        {#each doc.tv.tags as tag}
          <small class="badge badge-outline badge-sm">{tag}</small>
        {/each}
      </aside>
      <!--{#if doc.tv.img}
      <figure class="pageimage text-center w-full">
        <img class="mx-auto" style={`object-fit: contain;`} src={doc.tv.img} alt="">
        <figcaption>{@html doc.tv.credit}</figcaption>
      </figure>
      {/if}-->
      {#if doc.img}
      <figure class="pageimage text-center w-full">
        <img class="mx-auto" style={`object-fit: contain;`} src={doc.img.src} alt="">
        <figcaption>{@html doc.img.caption}</figcaption>
      </figure>
      {/if}
      <!--<p class="uppercase"><small></small></p>-->
      {@html doc.content}
      {#if doc.tv.szerzo?.length}
        {#each doc.tv.szerzo as sze}
          {#if sze.full}
            {@html sze.full}
          {:else}
            <p class="alairas">{sze.name}</p>
          {/if}
        {/each}
      {/if}
    </article>
    
    <!-- KIEMELT ADS -->
    <!-- {#if $authUser && browser && hirds.length} -->
    {#if prominent.length}
    <section class="max-md:hidden flex flex-col flex-0 gap-2 py-12 mx-auto md:mx-0">
      {#each prominent as item, i}
        <!-- {#if item.prominent} -->
          <aside class="">
            <!-- <h1 class="card-body">{item.name}</h1> -->
            <BannerSide banner={item}/>
          </aside>
        <!-- {/if} -->
      {/each}
    </section>
    {/if}
  </main>

  {#if doc.related?.length}
    <article class="prose mt-16 mb-8 w-full mx-auto flex-none">
      <h2 class="text-center">Kapcsolódó cikkek</h2>
    </article>
    <Cards cards={doc.related} full={false}/>
  {/if}

{/if}

{#if conf.top_banners.length}
  <BannerTop banners={conf.top_banners}/>
{/if}
<Search/>
<Nav2 actual={data.path}/>

{#if docs.length}
  <article class="prose mt-16 mb-8 mx-auto w-full">
    {#if !doc.id}
      <h1 class="text-center">{doc.id && '' || docstitle}</h1>
    {:else}
      <h2 class="text-center">Hasonló cikkek</h2>
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
  section {
    min-width: 24ch;
    width: calc((100% - 65ch) / 2);
  }
  section aside {
    position: unset;
    /* width: minmax(24ch, 1fr); */
    min-height: 20ch;
    /* grid-row-end: span 3; */
    margin-bottom: 3rem;
  }

</style>