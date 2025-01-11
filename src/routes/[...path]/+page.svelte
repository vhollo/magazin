<script context="module">
  import Cards from '$lib/components/Cards.svelte'
  // import Card from '$lib/components/Card.svelte'
  // import { PUBLIC_BASE_URL } from '$env/static/public'

  import { cats } from '$lib/cats.js'
  cats['carousel'] = {}
  cats['carousel']['Segítség, cukorbeteg vagyok!'] = '/s-o-s'
  cats['carousel']['Gesztációs diabétesz'] = '/gyermekvallalas'
  cats['carousel']['Receptek'] = '/receptek'
  cats['carousel']['Táplálkozás'] = '/taplalkozas'
  cats['carousel']['Klubok, Egyesületek'] = '/hirek'
</script>

<script>
// @ts-nocheck

  export let data
  let docstitle
  // $: console.log('[path]', data.doc.path)

  $: doc = data.doc
  $: docs = data.docs.slice(0, 18)
  $: pagenum = data.docs.length > 0 ? 1 : 0


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

  $: {
    docstitle = ''
    Object.keys(cats).forEach(cat => {
      for (let subcat of Object.keys(cats[cat])) {
        if (`/${data.doc.path}` == cats[cat][subcat]) {
          console.log({subcat})
          docstitle = subcat
        }
      }
    })
  }

</script>

<svelte:head><title>{doc.pagetitle || docstitle} &bull; Diabetes</title></svelte:head>

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



  {#if docs?.length}
    <article class="prose mx-auto px-4 py-12">
      <h1 class="text-center">{docstitle}</h1>
    </article>
    <!--{#each Object.keys(docs) as key}-->
      <Cards {docs}/>
    <!--{/each}-->
  {:else}
    <h3 class="text-center">NO DOCS</h3>
  {/if}
</main>

{#if pagenum > 0}
<footer class="footer footer-center bg-base-200 text-base-content pt-4">
  <button on:click={_pagenum} class="btn btn-outline">További cikkek</button>
</footer>
{/if}
