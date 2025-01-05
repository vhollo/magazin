<script>
  import {
	//blur,
	//crossfade,
	//draw,
	fade,
	//fly,
	//scale,
	//slide
} from 'svelte/transition'
  import Card from '$lib/components/Card.svelte'
  import Title from '$lib/components/Title.svelte'
  export let docs, full = true
  //console.log({docs})
  
  $: for (let doc of docs) {
    /*if (doc.tvs.img) {
      doc.ext = doc.tvs.img.split('.').pop()
    }*/

    doc.ellipsis = ''
    if (!doc.introtext?.length && doc.content) {
      const regex = /(?:<h2\b.*?>(.*?)<\/h2>\s*)?<h4[^>]*class=["'][^"']*introtext[^"']*["'][^>]*>([\s\S]*?)<\/h4>/g;

      //doc.ellipsis = ''
      let match
      while ((match = regex.exec(doc.content)) !== null) {
        const h2 = match[1] ? match[1].trim() : null
        const introtext = match[2].trim()
        doc.ellipsis += h2 && `<p class="intro"><b>${h2}</b><br>${introtext}</p>` || ''//introtext || doc.content
      }

      if (!doc.ellipsis) doc.ellipsis = doc.content.match(/<(?!aside\b|figure\b|img\b|h2\b|h3\b|ul\b|li\b)(.*?)\b[^>]*>[\s\S]*?<\/\1>/g)?.slice(0, 2).join('')
    }
    //if (doc.id == '424') console.log(doc.ellipsis)
  }
</script>

{#if full}
  <section class="grid gap-x-4 gap-y-10 px-4 py-6">
    <aside class="card rounded gap-4 card--compact bg-base-100" style="order:0">
      <h1 class="card-body">HIRDETÉS</h1>
    </aside>
    {#each docs as doc, i}
    {@const card = {id: doc.id, img: doc.img,/* pos: doc.tvs.pos, ext: doc.ext,*/ path: doc.path, desc: doc.description, title: doc.title, longtitle: doc.longtitle, introtext: doc.introtext, ellipsis: doc.ellipsis, content: doc.content, tags: doc.tvs.tag, rank: doc.rank}}
      <aside in:fade={{ duration: 1000 }} class:double={doc.img || doc.ellipsis?.indexOf('<video') !== -1} class:triple={doc.ellipsis?.indexOf('<video') !== -1} class="card rounded gap-4 card--compact bg-base--100" style="order:{i}">
        <Card {card}/>
      </aside>
    {/each}
    <aside class="card rounded gap-4 card--compact bg-base-100" style="order:3">
      <h1 class="card-body">HIRDETÉS</h1>
    </aside>
    <aside class="card rounded gap-4 card--compact bg-base-100" style="order:7">
      <h1 class="card-body">HIRDETÉS</h1>
    </aside>
    <aside class="card rounded gap-4 card--compact bg-base-100" style="order:11">
      <h1 class="card-body">HIRDETÉS</h1>
    </aside>
    <aside class="card rounded gap-4 card--compact bg-base-100" style="order:15">
      <h1 class="card-body">HIRDETÉS</h1>
    </aside>
  </section>
{:else}
  {#each docs as doc}
    {@const card = {id: doc.id, img: doc.img,/* pos: doc.tvs.pos,*/ path: doc.path, desc: doc.description, title: doc.title, longtitle: doc.longtitle, introtext: doc.introtext, content: doc.content, tag: doc.tvs.tag}}
    <Title {card}/>
  {/each}
{/if}
<style>
  section {
    grid-template-columns: repeat(auto-fill, minmax(24ch, 1fr));
    grid-auto-rows: minmax(12rem, auto);
    grid-auto-flow: dense;
    /*transition: height 0.25s ease-in;
    overflow-y: clip;
    transition-behavior: allow-discrete;
    height: calc(auto);*/
  }
  aside {
    position: unset;
    min-height: 20ch;
  }
  aside.double {
    grid-row-end: span 2;
  }
  /*aside.triple {
    grid-row-end: span 3;
  }*/
  aside.triple :global(figure) {
    display: none;
  }
  aside.triple:has(figure) {
    grid-row-end: span 2;
  }
</style>
  