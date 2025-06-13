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
      el.scrollIntoView({block: 'start', behavior: 'smooth', offset: { top: 64 }  })
      // window.location.hash = ''
    }
  }
</script>

  <nav class="max-md:hidden navbar text-neutral-content bg-base-100 sticky top-0 z-50">
    <!-- <input id="mobile--nav" type="checkbox" bind:checked={_open_nav}/> -->
    <ul class="mx-auto">
      {#each Object.keys(nav2) as cat}
        <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
        <li tabindex="0" class="dropdown dropdown-hover last:dropdown-end text-nowrap"><!-- md:inline-block  on:blur={_uncheck} -->
          <input type="radio" name="collapse" class="hidden"/>
          <div tabindex="0" role="button" class="menu-title !text-neutral-content text-nowrap font-medium cursor-default">{cat}</div>
          <ul tabindex="0" class="menu flex-nowrap dropdown-content rounded-md text-neutral-content p-2">
            {#each Object.keys(nav2[cat]) as subcat}
              <li class=""><a class="p-2 text-nowrap rounded-sm" class:menu-active={`/${actual}` == nav2[cat][subcat]} href={nav2[cat][subcat]}>{subcat}</a></li>
            {/each}
          </ul>
        </li>
      {/each}
    <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
    <li tabindex="0" class="drop-col text-nowrap"><!-- md:inline-block  on:blur={_uncheck} -->
        <a href="#search" aria-label="Keresés" on:click={_scrollIntoView} class="p-2 rounded-sm menu-title !text-neutral-content font-medium"><svg class="inline h-[1em] opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
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
        </svg></a>
      </li>
      </ul>
  </nav>
