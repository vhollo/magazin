<script context="module">
  import { nav2 } from '$lib/nav2.js'
</script>

<script>
// @ts-nocheck
  export let actual
  let el
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

<nav class="sticky top-0 z-40 max-md:hidden navbar bg-base-300 text-base-content min-h-12 h-12">
  <!-- <input id="mobile--nav" type="checkbox" bind:checked={_open_nav}/> -->
  <ul class="mx-auto flex items-center">
    <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
    <li tabindex="0" class="drop-col text-nowrap">
      <a class="block menu-title !py-0 pl-0" href="/">
        <img class="h-10" src={'/icon.svg'} alt="diabetes.hu">
      </a>    
    </li>
    {#each Object.keys(nav2) as cat, i}
      <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
      <li tabindex="0" class="dropdown dropdown-hover text-nowrap" class:dropdown-end={Object.keys(nav2).length == i+1}>
        <input type="radio" name="collapse" class="hidden"/>
        <div tabindex="0" role="button" class="menu-title text-nowrap font-medium cursor-default !text-base-content">{cat}</div>
        <ul tabindex="0" class="menu flex-nowrap dropdown-content rounded-md bg-base-300 text-base-content p-2">
          {#each Object.keys(nav2[cat]) as subcat}
            <li class=""><a class="p-2 text-nowrap rounded-sm" class:bg-primary={`${actual}` == nav2[cat][subcat]} href={nav2[cat][subcat]}>{subcat}</a></li>
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
  .bg-secondary {
      /* background-color: var(--color-primary); */
    }
}
</style>
