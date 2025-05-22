<script context="module">
  import Cards from '$lib/components/Cards.svelte'
  import Search from '$lib/components/Search.svelte'
  import Nav2 from '$lib/components/Nav2.svelte'
  import BannerSide from '$lib/components/BannerSide.svelte'
  import BannerTop from '$lib/components/BannerTop.svelte'
  // import Card from '$lib/components/Card.svelte'
  // import { PUBLIC_BASE_URL } from '$env/static/public'

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
  $: if (doc.id == '124') console.log(doc)


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

  $: if (doc.path == 'keres') {
      copycats['keres'] = {}
      copycats['keres'][doc.pagetitle] = '/keres'
      // console.log(doc.path)
    }

  let matchingSubcat = null;

  $: Object.keys(copycats).forEach(cat => {
    Object.keys(copycats[cat]).forEach(subcat => {
      if (copycats[cat][subcat] === `/${doc.path}`) {
        matchingSubcat = subcat; // Store the matching subcategory name
      }
    });
  });

  $: docstitle = matchingSubcat || doc.pagetitle

</script>

<svelte:head><title>{docstitle} &bull; Diabetes</title></svelte:head>
<!-- <svelte:window bind:this={win}/> -->

{#if doc.id}
  <BannerTop banners={conf.top_banners}/>
  <main class="order-1 bg-base-300 md:flex flex-row justify-center gap-8 px-2">
    <!--{@const date = new Date(doc.publishedon * 1000).toLocaleDateString('hu-HU')}-->
    <!--{@const meta = [doc.tvs.sze, date, doc.tvs.cat].join(' | ')}-->
    <article class="prose py-12 flex-1">
      <h2 class="felcim uppercase text-sm">{@html doc.description}</h2>
      <h1 class="title">{@html doc.longtitle || doc.pagetitle}</h1>
      <h4 class="introtext">{@html doc.introtext}</h4>
      <p>
        {#if doc.tvs.sze.length}
          {#each doc.tvs.sze as sze, i}
            <a href="/#{sze.val}"><small class="uppercase">{sze.name}</small></a>{#if (i + 1) < doc.tvs.sze.length}, {/if}
          {/each}
          &nbsp;|
        {/if}
        <small>{`${pubdate}${editdate && editdate !== pubdate ?' (frissítve: '+editdate+')':''}`}</small><small class="uppercase">{`${doc.tvs.cat?' | '+doc.tvs.cat:''}`}</small></p>
      <aside class="flex flex-wrap gap-2 mb-12">
        {#each doc.tvs.tag as tag}
          <small class="badge badge-outline badge-sm">{tag}</small>
        {/each}
      </aside>
      <!--{#if doc.tvs.img}
      <figure class="pageimage text-center w-full">
        <img class="mx-auto" style={`object-fit: contain;`} src={doc.tvs.img} alt="">
        <figcaption>{@html doc.tvs.credit}</figcaption>
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
      {#if doc.tvs.sze.length}
        {#each doc.tvs.sze as sze}
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
    <article class="order-1 prose mt-16 mb-8 w-full mx-auto flex-none">
      <h2 class="text-center">Kapcsolódó cikkek</h2>
    </article>
    <Cards cards={doc.related} full={false}/>
  {/if}

{/if}

  <BannerTop banners={conf.top_banners}/>
  <Search/>
  <Nav2 actual={data.doc.path}/>

  {#if docs.length}
    <article class="order-2 prose mt-16 mb-8 mx-auto w-full">
      {#if !doc.id}
        <h1 class="text-center">{doc.id && '' || docstitle}</h1>
      {:else}
        <h2 class="text-center">Hasonló cikkek</h2>
      {/if}
    </article>
    <Cards cards={docs} banners={conf.side_banners}/>
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