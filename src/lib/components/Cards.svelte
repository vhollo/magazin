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
  import BannerSide from '$lib/components/BannerSide.svelte'
  export let ads_distance = 4
  // import { ads } from '$lib/ads.js'
  export let cards: any[], full = true
  
  let /* win: { location: { hash: string; }; }, */ pagenum = 1, volume = 18
  afterNavigate(() => {
    // pagenum = +win?.location.hash.replace('#', '') || 1
    pagenum = +location.hash.replace('#', '') || 1
  })
  const _pageplus = () => {
    pagenum++
    goto('#'+pagenum, { replaceState: true, noScroll: true })
  }

  export let banners: any[] = [];
  let h, hirds: { name: string; img: string; link: string; video: string; }[] = []
  $: if (full) { // #3 után mem frissül, de #5 után újra
    h = 0
    hirds = JSON.parse(JSON.stringify(banners))
    for (let i = banners.length * ads_distance; i < volume * pagenum + ads_distance; i = i + ads_distance) {
      hirds.push(JSON.parse(JSON.stringify(banners[h])))
      h++
      if (h >= banners.length) h = 0
      // console.log(i, h)
    }
    // console.log(h, (hirds.length - 1) * ads_distance, volume * pagenum)
  }

</script>

<!-- <svelte:window bind:this={win}/> -->

{#if full}
  <section class="grid gap-x-6 gap-y-0 px-4 py-6">
    {#each cards.slice(0, volume * pagenum) as card, i}
      <aside in:fade={{ duration: 1000 }} class:double={card.img || card.video} class:triple={card.description && (card.img || card.video)} class="card gap-2 rounded-sm bg-base-200" style="order:{i}">
        <CardV {card}/>
      </aside>
    {/each}
    {#key hirds}
    {#if !$authUser && browser && hirds.length}
      {#each hirds as item, i}
      <aside class="" style="order:{i * ads_distance + 1}">
        <BannerSide banner={item}/>
      </aside>
      {/each}
    {/if}
    {/key}
  </section>
  {#if volume * pagenum < cards.length}
    <footer class="footer footer-center bg--base-200 text-base-content pb-4">
      <button on:click={_pageplus} class="btn btn-outline">További cikkek</button>
    </footer>
  {/if}
{:else}
  <section class="flex flex-col gap-x-6 gap-y-16 px-4 py-6 w-full">
    {#each cards as card}
      <CardH {card}/>
    {/each}
  </section>
{/if}

<style>
  section {
    scroll-behavior: auto;
    grid-template-columns: repeat(auto-fill, minmax(24ch, 1fr));
    grid-auto-rows: auto;
    grid-auto-flow: dense;
    grid-template-rows: masonry; /* future spec */
  }
  aside {
    position: unset;
    min-height: 20ch;
    max-height: fit-content;
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
  