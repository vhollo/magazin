<script lang="ts">
  import { browser } from '$app/environment'
  import { authUser } from '$lib/authStore';
  import { goto, afterNavigate } from '$app/navigation';
  import {
	//blur,
	//crossfade,
	//draw,
	fade,
	//fly,
	//scale,
	//slide
} from 'svelte/transition'
  import CardV from '$lib/components/CardV.svelte'
  import CardH from '$lib/components/CardH.svelte'
  import { ads } from '$lib/ads.js'
  export let cards, full = true
  //console.log({cards})
  
  $: for (let doc of cards) { // ELLIPSIS
    if (!doc.introtext?.length && !doc.ellipsis) {
      doc.ellipsis = doc.content.match(/<(?!aside\b|figure\b|video\b|div\b|img\b|h2\b|h3\b|ul\b|li\b)(.*?)\b[^>]*>[\s\S]*?<\/\1>/g)?.slice(0, 1).join('')
      doc.table = doc.ellipsis?.indexOf('<table') > -1
      doc.video = doc.content.match(/<video\b(.*?)\b[^>]*>[\s\S]*?<\/video>/g)?.join('')
      // console.log(doc)
    }
    //if (doc.id == '424') console.log(doc.ellipsis)
  }

  let win, pagenum = 1, volume = 18
  afterNavigate(() => {
    pagenum = +win?.location.hash.replace('#', '') || 1
    // cards = data.cards.slice(0, volume * pagenum)
  })
  const _pageplus = () => {
    pagenum++
    // replaceState('#'+pagenum);
    goto('#'+pagenum, { replaceState: true, noScroll: true })
  }

  let h, hirds: { title: string; img: string; link: string; width: number; height: number; video: string; }[] = []
  $: { // #3 után mem frissül, de #5 után újra
    h = 0
    hirds = JSON.parse(JSON.stringify(ads.banners))
    for (let i = ads.banners.length * ads.distance; i < volume * pagenum + ads.distance; i = i + ads.distance) {
      hirds.push(JSON.parse(JSON.stringify(ads.banners[h])))
      h++
      if (h >= ads.banners.length) h = 0
      // console.log(i, h)
    }
    // console.log(h, (hirds.length - 1) * ads.distance, volume * pagenum)
  }


</script>

<svelte:window bind:this={win}/>

{#if full}
  <section class="grid gap-x-6 gap-y-0 px-4 py-6">
    {#each cards.slice(0, volume * pagenum) as doc, i}
      <aside in:fade={{ duration: 1000 }} class:double={doc.img || doc.video} class:triple={doc.description && (doc.img || doc.video)} class="card gap-2 rounded" style="order:{i+1}">
        <CardV card={doc}/>
      </aside>
    {/each}
    {#key hirds}
    {#if $authUser && browser && hirds.length}
      {#each hirds as item, i}
      <aside class="card gap-4 bg-base-100" style="order:{i * ads.distance}">
        <h1 class="card-body">{item.title}</h1>
      </aside>
      {/each}
    {/if}
    {/key}
  </section>
  {#if volume * pagenum < cards.length}
    <footer class="footer footer-center bg-base-200 text-base-content pt-4">
      <button on:click={_pageplus} class="btn btn-outline">További cikkek</button>
    </footer>
  {/if}
{:else}
  <section class="flex flex-col gap-x-6 gap-y-8 px-4 py-6 w-full">
    {#each cards as card}
      <CardH {card}/>
    {/each}
  </section>
{/if}

<style>
  section {
    grid-template-columns: repeat(auto-fill, minmax(24ch, 1fr));
    grid-auto-rows: auto;
    grid-auto-flow: dense;
    grid-template-rows: masonry; /* future spec */
  }
  aside {
    position: unset;
    min-height: 20ch;
    /* grid-row-end: span 3; */
    margin-bottom: 3rem;
  }
  aside.double {
    grid-row-end: span 2;
  }
  aside.triple {
    grid-row-end: span 2;
  }
  /* aside.triple :global(figure) {
    display: none;
  } */
  /* :global(aside.triple:has(figure)) {
    grid-row-end: span 2;
  } */
</style>
  