<script>
  // import BannerTop from '$lib/components/BannerTop.svelte'
  // export let actual
  // export let banners
</script>

<div id="search" class="order-1"></div>
<aside class="order-1 w-full mt-[4rem] px-1 bg-base-100">
<form action="/keres" method="get" class="join p-rose flex mx-auto justify-center py-8 max-lg:max-w-xl">
  <label class="input join-item border border-primary border-e-0 bg-base-200">
    <!-- <svg class="h-[1em] opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <g
        stroke-linejoin="round"
        stroke-linecap="round"
        stroke-width="2.5"
        fill="none"
        stroke="currentColor"
      >
        <circle cx="11" cy="11" r="8"></circle>
        <path d="m21 21-4.3-4.3"></path>
      </g>
    </svg> -->
    <input type="search" name="q" placeholder="Keresés" class="max-lg:flex-1 text-sm text-neutral-content"/>
  </label>
  <button class="btn btn-neutral join-item border border-primary border-s-0" aria-label="Keresés">
    <svg class="h-[1em] opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <g
        stroke-linejoin="round"
        stroke-linecap="round"
        stroke-width="2.5"
        fill="none"
        stroke="currentColor"
      >
        <circle cx="11" cy="11" r="8"></circle>
        <path d="m21 21-4.3-4.3"></path>
      </g>
    </svg>
</button>
</form>
</aside>

<style>
  div {
    scroll-margin-top: 4rem;
  }
</style>