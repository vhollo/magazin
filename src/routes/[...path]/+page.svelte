<script>
// @ts-nocheck

  export let data
  console.log('p.s',data.doc)

  $: doc = data.doc
  $: docs = data.docs
  const base = 'https://www.diabetes.hu/'

</script>

<main>
  {#if doc}
  {@const date = new Date(doc.pub_date * 1000).toLocaleDateString('hu-HU')}
  <!--{@const meta = [doc.tvs.sze, date, doc.tvs.cat].join(' | ')}-->
  <article class="prose mx-auto">
    <h2 class="felcim">{doc.description}</h2>
    <h1 class="title">{doc.longtitle || doc.pagetitle}</h1>
    <h4 class="introtext">{@html doc.introtext}</h4>
    <p class="uppercase"><small>{doc.tvs.sze} | {date} | {doc.tvs.cat}</small></p>
    <figure class="w-max max-w-full">
      <img src={`${base}${doc.tvs.img}`} alt="">
    </figure>
    <!--<p class="uppercase"><small></small></p>-->
    {@html doc.content}
  </article>
  {/if}

  {#if docs}
  <section class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
    {#each docs as doc}
    <div class="card bg-base-300 shadow-xl">
      {#if doc.tvs.img}
      <figure>
        <img style="aspect-ratio: 1.667;object-fit: cover;" src={`${base}${doc.tvs.img}`} alt="" width="928" height="548"/>
      </figure>
      {/if}
      <div class="card-body prose">
        <h2 class="card-title gap-0"><a href={`/${doc.path}`}>
          {@html doc.longtitle || doc.title}
          <!--<div class="badge badge-secondary">NEW</div>-->
        </a></h2>
        <p>{@html doc.introtext}</p>
        <div class="card-actions justify-end">
          {#each doc.tvs.tag as tag}
          <div class="badge badge-outline">{tag}</div>
          {/each}
        </div>
      </div>
    </div>
    {/each}
  </section>
  {/if}
</main>

<style>
  figure {
    max-height: 480px;
    margin-inline: auto;
  }
</style>