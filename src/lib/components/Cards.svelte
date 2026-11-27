<script lang="ts">
  import { browser } from '$app/environment'
  import { onMount } from 'svelte'
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
  import { masonryItem } from '$lib/masonry.js'
  import { bannerSlotCount, placeEachOnce } from '$lib/bannerSlots.js'
  export let ads_distance = 4
  // import { ads } from '$lib/ads.js'
  export let cards: any[], full = true
  export let moreLabel = 'További cikkek'

  // Masonry spans are JS-only; switch to the fine-grained grid once mounted so the
  // SSR/pre-hydration paint uses content-sized rows and never overlaps before JS loads.
  let ready = false
  onMount(() => {
    ready = true
  })

  let /* win: { location: { hash: string; }; }, */ pagenum = 1, volume = 18
  afterNavigate(() => {
    // pagenum = +win?.location.hash.replace('#', '') || 1
    pagenum = +location.hash.replace('#', '') || 1
  })
  const _pageplus = () => {
    pagenum++
    goto('#'+pagenum, { replaceState: true, noScroll: true })
  }

  /** Logged-out visitors: these banners every `ads_distance` cards, repeated to the end. */
  export let banners: any[] = [];
  /** Phones only (< md): index in `banners` the logged-out rotation starts at. An article
      passes the one after the last banner a phone has already shown above (after the
      article / in „Kapcsolódó receptek” — both are phone-only), so no banner repeats
      right away. ≥ md those are not shown, so the rotation starts at the first banner. */
  export let rotationStart = 0;
  /** Logged-in visitors, phones only (`md:hidden`): these banners each ONCE — in the
      slots, then (short list) after the last card. An article passes the `prominent`
      ones its „Kapcsolódó receptek” grid had no slot for. */
  export let memberBanners: any[] = [];
  $: shownCount = Math.min(cards.length, volume * pagenum)
  $: memberPlaced = placeEachOnce(memberBanners, shownCount, ads_distance)
  // Logged-out rotation: one banner per slot of the cards shown so far, cycling through
  // the list, so it repeats to the end of the card list and never past it. (It used to
  // start with a copy of ALL banners, so a short list — e.g. one related article — got
  // all of them stacked after its last card.) Recomputed on „További cikkek” paging.
  // With a phone offset there are two copies: from the first banner (≥ md) and from
  // `rotationStart` (< md); `lazyVideo` loads only the copy on screen.
  type Rotated = { banner: any; order: number; only: string }
  let hirds: Rotated[] = []
  $: hirds = (() => {
    if (!full || !banners.length) return []
    const slots = bannerSlotCount(shownCount, ads_distance)
    const rotate = (start: number, only: string) =>
      Array.from({ length: slots }, (_, k) => ({
        banner: banners[(start + k) % banners.length],
        order: k * ads_distance + 1,
        only,
      }))
    const offset = ((rotationStart % banners.length) + banners.length) % banners.length
    return offset === 0 ? rotate(0, '') : [...rotate(0, 'max-md:hidden'), ...rotate(offset, 'md:hidden')]
  })()

</script>

<!-- <svelte:window bind:this={win}/> -->

{#if full}
  <!-- `w-full` is load-bearing: this grid is a flex item of `body`, and `mx-auto`
       turns off cross-axis stretch, so without it the width shrink-to-fits to the
       grid's min-content. `auto-fill` resolves its repeat count against the
       definite `max-w-7xl` (80rem = 1600px at the fluid root size), so min-content
       is 4 × 24ch of tracks — wider than a 1280px viewport, and the row overflowed
       horizontally. With `w-full` the width is the line's, and auto-fill refits. -->
  <section class="grid gap-x-6 gap-y-12 w-full max-w-7xl mx-auto px-4 py-6" class:ready>
    {#each cards.slice(0, volume * pagenum) as card, i}
      {#if card.recipeTeaser}
        <aside
          in:fade={{ duration: 1000 }}
          use:masonryItem
          style="order:{i}"
        >
          <RecipeCard recipe={card.recipeTeaser} locked={Boolean(card.locked)} />
        </aside>
      {:else}
        <!-- CardV carries the card surface itself (shared with ExpertSection). -->
        <aside in:fade={{ duration: 1000 }} use:masonryItem style="order:{i}">
          <CardV {card}/>
        </aside>
      {/if}
    {/each}
    {#key hirds}
    {#if !$authUser && browser && hirds.length}
      {#each hirds as { banner, order, only }}
      <aside class={only} use:masonryItem style="order:{order}">
        <BannerSide {banner}/>
      </aside>
      {/each}
    {/if}
    {/key}
    {#if $authUser && browser}
      {#each memberPlaced as { banner, order }, k (k)}
        <aside class="md:hidden" use:masonryItem style="order:{order}">
          <BannerSide {banner}/>
        </aside>
      {/each}
    {/if}
  </section>
  {#if volume * pagenum < cards.length}
    <footer class="footer footer-center text-base-content pb-4">
      <button on:click={_pageplus} class="btn btn-outline">{moreLabel}</button>
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
    /* Pre-hydration / no-JS fallback: rows hug content so cards never overlap. */
    grid-auto-rows: max-content;
  }
  section.ready {
    /* JS active: tiny unit so dynamic spans can hug each card's actual height. */
    grid-auto-rows: 4px;
    grid-auto-flow: dense;
    /* Safety net: a too-short span can never spill content past the grid. */
    overflow: clip;
  }
  aside {
    position: unset;
    /* prevent stretch-to-track so ResizeObserver reports content height */
    align-self: start;
  }
</style>
  