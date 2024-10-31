<script>
  import Card from '$lib/components/Card.svelte'
// @ts-nocheck

  export let data
  //console.log('p.s',data.doc)

  //$: (data) => { doc = data.doc stb…}
  $: doc = data.doc
  $: docs = data.docs
  const base = 'https://www.diabetes.hu/'

  $: pubdate = doc && new Date(doc.publishedon * 1000).toLocaleDateString('hu-HU')
  $: editdate = doc && new Date(doc.editedon * 1000).toLocaleDateString('hu-HU')
  $: console.log(doc.tvs.sze)
</script>

<main>
  {#if doc}
  <!--{@const date = new Date(doc.publishedon * 1000).toLocaleDateString('hu-HU')}-->
  <!--{@const meta = [doc.tvs.sze, date, doc.tvs.cat].join(' | ')}-->
  <article class="prose mx-auto px-4 py-12">
    <h2 class="felcim uppercase text-sm">{doc.description}</h2>
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
    <aside class="flex flex-wrap gap-2 collapse sm:visible mb-12">
      {#each doc.tvs.tag as tag}
        <small class="badge badge-outline badge-sm">{tag}</small>
      {/each}
    </aside>
    {#if doc.tvs.img}
    <figure class="pageimage text-center w-full">
      <img class="mx-auto" style={`object-fit: contain;`} src={`${base}${doc.tvs.img}`} alt="">
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

  {#if docs}
  <section class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-12 px-6 py-12">
    {#each docs as doc}
      {@const card = {img: doc.tvs.img, pos: doc.tvs.pos, path: doc.path, title: doc.title, longtitle: doc.longtitle, introtext: doc.introtext, content: doc.content, tag: doc.tvs.tag}}
      <Card {card}/>
    {/each}
  </section>
  {/if}
</main>


<style>
  section.grid {
    grid-template-rows: masonry;
  }
</style>