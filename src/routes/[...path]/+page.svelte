<script context="module">
  import Cards from '$lib/components/Cards.svelte'
  import Search from '$lib/components/Search.svelte'
  // import Card from '$lib/components/Card.svelte'
  // import { PUBLIC_BASE_URL } from '$env/static/public'

  import { cats } from '$lib/cats.js'
  let copycats = JSON.parse(JSON.stringify(cats))
  copycats['carousel'] = {}
  copycats['carousel']['Segítség, cukorbeteg vagyok!'] = '/s-o-s'
  copycats['carousel']['Gesztációs diabétesz'] = '/gyermekvallalas'
  copycats['carousel']['Receptek'] = '/receptek'
  copycats['carousel']['Táplálkozás'] = '/taplalkozas'
  copycats['carousel']['Klubok, Egyesületek'] = '/hirek'
</script>

<script>
// @ts-nocheck

  export let data
  let docstitle
  // $: console.log('[path]', data.doc.path)

  $: doc = data.doc
  $: docs = data.docs.slice(0, 18)
  $: pagenum = data.docs.length > 18 ? 1 : 0


  //$: (data) => { doc = data.doc stb…}
  // if (18 * pagenum >= data.docs.length) pagenum = 0

  const _pagenum = () => {
    pagenum++
    docs = data.docs.slice(0, 18 * pagenum)
    if (18 * pagenum >= data.docs.length) pagenum = 0
  }
  // _pagenum()

  $: pubdate = doc && new Date(doc.publishedon * 1000).toLocaleDateString('hu-HU')
  $: editdate = doc && new Date(doc.editedon * 1000).toLocaleDateString('hu-HU')

  $: if (doc.path == 'keres') {
      copycats['keres'] = {}
      copycats['keres'][doc.pagetitle] = '/keres'
      console.log(doc.path)
    }
    // copycats['landing'] = {}
  // copycats['landing']['Legfrissebb cikkeink'] = '/'
  /* $: if (doc.path) {
    copycats['keres'][doc.pagetitle] = '/keres'
    docstitle = ''
    Object.keys(copycats).forEach(cat => {
      for (let subcat of Object.keys(copycats[cat])) {
        if (`/${doc.path}` == copycats[cat][subcat]) {
          console.log(doc.path,{subcat})
          docstitle = subcat
        }
      }
    })
  } */

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

<main class="bg-base-300">
  {#if doc.id}
    <!--{@const date = new Date(doc.publishedon * 1000).toLocaleDateString('hu-HU')}-->
    <!--{@const meta = [doc.tvs.sze, date, doc.tvs.cat].join(' | ')}-->
    <article class="prose mx-auto px-4 py-12">
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
      <aside class="flex flex-wrap gap-2 sm:visible mb-12">
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
  {/if}

  <!-- <article class="prose card w-128 my-2 mx-auto"> -->
  <aside class="mx-auto py-8 max-md:mx-4 bg-neutral">
    <Search />
  </aside>

  {#if docs?.length}
    <article class="prose card w-128 my-8 mx-auto">
      {#if !doc.id}
        <h1 class="text-center">{doc.id && '' || docstitle}</h1>
      {:else}
        <h1 class="text-center">Hasonló cikkek</h1>
      {/if}
    </article>
    <!--{#each Object.keys(docs) as key}-->
      <Cards {docs}/>
    <!--{/each}-->
  {:else}
    <h1 class="text-center">NO DOCS</h1>
  {/if}
</main>

{#if pagenum > 0}
<footer class="footer footer-center bg-base-200 text-base-content pt-4">
  <button on:click={_pagenum} class="btn btn-outline">További cikkek</button>
</footer>
{/if}
