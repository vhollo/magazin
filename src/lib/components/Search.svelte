<script>
  import { afterNavigate } from '$app/navigation';
  let { count } = $props()
  let submitted = $state(false) // should be reset on navigation

  afterNavigate(() => {
    submitted = false
  })

</script>

<div id="search">
<aside class="w-full px-1">
<form action="/keres#lista" method="get" class="join flex mx-auto justify-center py-8 max-lg:max-w-xl" onsubmit={() => submitted = true}>
  <label class="input join-item border border-primary border-e-0 rounded-e-none h-8 px-0">
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
    <input type="search" name="q" placeholder={`Keresés ${count} cikkben`} class="border-none max-lg:flex-1 text-sm px-0"/>
  </label>
  <button class="btn btn-neutral join-item border-s-0 !rounded-s-none h-8 w-10" aria-label="Keresés">
    {#if submitted}
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="rotate size-6">
        <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
      </svg>  
    {:else}
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
    {/if}
  </button>
</form>
</aside>
</div>

<style>
  #search {
    scroll-margin-top: 4rem;
    scroll-snap-align: center;
  }
  .rotate {
    /* rotate continously */
    animation: rotate 2s linear infinite;
  }
  @keyframes rotate {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
</style>