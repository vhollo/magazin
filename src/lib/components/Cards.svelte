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
  import RecipeCard from '$lib/components/RecipeCard.svelte'
  import BannerSide from '$lib/components/BannerSide.svelte'
  export let ads_distance = 4
  // import { ads } from '$lib/ads.js'
  export let cards: any[], full = true

  // Dense masonry: derive grid-row span from each item's actual content height.
  // Reads grid-auto-rows + row-gap from the parent so CSS stays the source of truth.
  function masonryItem(node: HTMLElement) {
    let ROW = 4, GAP = 0
    const parent = node.parentElement
    if (parent) {
      const cs = getComputedStyle(parent)
      ROW = parseFloat(cs.gridAutoRows) || ROW
      GAP = parseFloat(cs.rowGap) || GAP
    }
    let lastSpan = 0
    const setSpan = () => {
      const h = node.getBoundingClientRect().height
      if (!h) return
      const span = Math.max(1, Math.ceil((h + GAP) / (ROW + GAP)))
      if (span !== lastSpan) {
        lastSpan = span
        node.style.gridRowEnd = `span ${span}`
      }
    }
    setSpan()
    const ro = new ResizeObserver(setSpan)
    ro.observe(node)
    const imgs = Array.from(node.querySelectorAll('img'))
    imgs.forEach((img) => {
      if (!img.complete) img.addEventListener('load', setSpan)
    })
    return {
      destroy() {
        ro.disconnect()
        imgs.forEach((img) => img.removeEventListener('load', setSpan))
      }
    }
  }
  
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
  <section class="grid gap-x-6 gap-y-12 px-4 py-6">
    {#each cards.slice(0, volume * pagenum) as card, i}
      {#if card.recipeTeaser}
        <aside
          in:fade={{ duration: 1000 }}
          use:masonryItem
          class:double={Boolean(card.recipeTeaser.img || card.recipeTeaser.video)}
          style="order:{i}"
        >
          <RecipeCard recipe={card.recipeTeaser} locked={Boolean(card.locked)} />
        </aside>
      {:else}
        <aside in:fade={{ duration: 1000 }} use:masonryItem class="card card-sm gap-2 rounded-sm bg-base-200" style="order:{i}">
          <CardV {card}/>
        </aside>
      {/if}
    {/each}
    {#key hirds}
    {#if !$authUser && browser && hirds.length}
      {#each hirds as item, i}
      <aside use:masonryItem style="order:{i * ads_distance + 1}">
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
    /* small unit so dynamic spans can hug each card's actual height */
    grid-auto-rows: 4px;
    grid-auto-flow: dense;
  }
  aside {
    position: unset;
    /* prevent stretch-to-track so ResizeObserver reports content height */
    align-self: start;
  }
</style>
  