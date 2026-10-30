<script module>
  import { nav2 } from '$lib/nav2.js'
</script>

<script>
// @ts-nocheck
  import { navLinkActive, navSubgroupActive } from '$lib/navActive.js'
  export let actual
  let el

  // Same rule as Nav.svelte: exactly one background class per link. Inactive:
  // the soft bar tint with a hover tint; active: the header blue with white text.
  function nav2ItemClass(active) {
    return active
      ? 'bg-nav !text-nav-content'
      : 'bg-nav-soft !text-base-content hover:bg-nav/10 focus-visible:bg-nav/10 focus-visible:outline-none'
  }
  const _scrollIntoView = async (event) => {
    // console.log(window.location.hash)
    event.preventDefault()
    let target = event.target.getAttribute('href') || event.target.parentElement.getAttribute('href') || null
    if (target) {
      el = document.querySelector(target)
      // console.log(event.target.getAttribute('href'), el)
      el.scrollIntoView({block: 'start', behavior: 'auto', offset: { top: 64 }  })
      // window.location.hash = ''
    }
  }
</script>

<nav class="sticky top-0 z-40 max-md:hidden navbar bg-nav-soft text-base-content min-h-12 h-12 border-t border-b border-nav/20">
  <!-- <input id="mobile--nav" type="checkbox" bind:checked={_open_nav}/> -->
  <ul class="mx-auto flex items-center">
    <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
    <li tabindex="0" class="drop-col text-nowrap py-.5">
      <a class="block menu-title !py-0 pl-0" href="/">
        <img class="h-10" src={'/icon.svg'} alt="diabetes.hu">
      </a>    
    </li>
    {#each Object.keys(nav2) as cat, i}
      <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
      <li tabindex="0" class="dropdown dropdown-hover relative text-nowrap" class:dropdown-end={Object.keys(nav2).length == i+1}>
        <input type="radio" name="collapse" class="hidden"/>
        <!-- svelte-ignore a11y_invalid_attribute – label-only control; # prevented in onclick -->
        <a href="#" tabindex="0" class="relative z-10 menu-title py-2 text-nowrap font-medium rounded-sm no-underline transition-[color,background-color] duration-200 ease-out {nav2ItemClass(navSubgroupActive(actual, nav2[cat]))}" onclick={(e) => e.preventDefault()}>{cat}</a>
        <ul tabindex="0" class="!z-0 menu flex-nowrap dropdown-content rounded-md bg-nav-soft text-base-content p-2 shadow-lg">
          {#each Object.keys(nav2[cat]) as subcat}
            <li class=""><a class="p-2 text-nowrap rounded-sm {nav2ItemClass(navLinkActive(actual, nav2[cat][subcat]))}" href={nav2[cat][subcat]}>{subcat}</a></li>
          {/each}
        </ul>
      </li>
    {/each}
  </ul>
</nav>

<style>
@media (prefers-color-scheme: light) {
}
@media (prefers-color-scheme: dark) {
}
</style>
