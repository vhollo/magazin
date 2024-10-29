<script>
  import Card from '$lib/components/Card.svelte'
// @ts-nocheck

  export let data
  //console.log('p.s',data.doc)

  $: doc = data.doc
  $: docs = data.docs
  const base = 'https://www.diabetes.hu/'

  $: pubdate = new Date(doc.publishedon * 1000).toLocaleDateString('hu-HU')
  $: editdate = new Date(doc.editedon * 1000).toLocaleDateString('hu-HU')
  //$: console.log(doc.tvs.sze.full)
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
      {#if doc.tvs.sze.val}
        <a href="/#{doc.tvs.sze.val}"><small class="uppercase">{doc.tvs.sze.name}</small></a>&nbsp;|
      {/if}
      <small>{`${pubdate}${editdate && editdate !== pubdate ?' (frissítve: '+editdate+')':''}`}</small><small class="uppercase">{`${doc.tvs.cat?' | '+doc.tvs.cat:''}`}</small></p>
    <p class="flex flex-wrap gap-2 collapse sm:visible">
      {#each doc.tvs.tag as tag}
        <small class="badge badge-outline badge-sm">{tag}</small>
      {/each}
    </p>
    <figure class="pageimage mt-16 text-center w-full">
      <img class="mx-auto" style={`object-fit: contain;`} src={`${base}${doc.tvs.img}`} alt="">
    </figure>
    <!--<p class="uppercase"><small></small></p>-->
    {@html doc.content}
    {#if doc.tvs.sze.name}
      {#if doc.tvs.sze.full}
        {@html doc.tvs.sze.full}
      {:else}
        <p class="alairas">{doc.tvs.sze.name}</p>
      {/if}
    {/if}
  </article>
  {/if}

  {#if docs}
  <section class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-12 px-4 py-12">
    {#each docs as doc}
      {@const card = {img: doc.tvs.img, pos: doc.tvs.pos, path: doc.path, title: doc.title, longtitle: doc.longtitle, introtext: doc.introtext, content: doc.content, tag: doc.tvs.tag}}
      <Card {card}/>
    {/each}
  </section>
  {/if}
</main>


<!--<style>
</style>-->