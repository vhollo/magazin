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
  //console.log(date)
</script>

<main>
  {#if doc}
  <!--{@const date = new Date(doc.publishedon * 1000).toLocaleDateString('hu-HU')}-->
  <!--{@const meta = [doc.tvs.sze, date, doc.tvs.cat].join(' | ')}-->
  <article class="prose mx-auto">
    <h2 class="felcim">{doc.description}</h2>
    <h1 class="title">{@html doc.longtitle || doc.pagetitle}</h1>
    <h4 class="introtext">{@html doc.introtext}</h4>
    <p>
      <small class="uppercase">{`${doc.tvs.sze?doc.tvs.sze+' | ':''}${pubdate}${doc.tvs.cat?' | '+doc.tvs.cat:''}`}</small>
      <small>{`${editdate?' (frissítve: '+editdate+')':''}`}</small></p>
    {#each doc.tvs.tag as tag}
    <div class="badge badge-outline mx-1">{tag}</div>
    {/each}
    <figure class="pageimage">
      <img style={`object-fit: contain;`} src={`${base}${doc.tvs.img}`} alt="">
    </figure>
    <!--<p class="uppercase"><small></small></p>-->
    {@html doc.content}
  </article>
  {/if}

  {#if docs}
  <section class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-12 p-4">
    {#each docs as doc}
    <Card {doc}/>
    {/each}
  </section>
  {/if}
</main>

<!--<style>
  figure {
    max-height: 480px;
    margin-inline: auto;
  }
</style>-->