<script context="module">
  import { PUBLIC_BASE_URL } from '$env/static/public'
  import { cats } from '$lib/cats.js'
</script>

<script>
// @ts-nocheck

  export let actual
  let _open_nav = false

  /* function _uncheck(event){
    const target = event.target//.parentElement.nextSibling
    target.firstElementChild.checked = false
  } */

  //$: _open_nav = actual && false

  const _close_nav = () => _open_nav = false

</script>

<nav class="sticky top-0 lg:-top-16 z-50 bg--neutral">
  <nav class="top-0 left-0 w-full navbar lg:justify-center py-0 bg-neutral max-lg:mb-8">
    <div class="max-lg:flex-1"><a class="p-2" href="/" on:click={_close_nav}><img class="h-12" src={'/assets/logo-diabetes2.svg'} alt="diabetes.hu"></a></div>
    <label for="mobile-nav" aria-label="open sidebar" class="f-ixed top-0 right-0 bg-neutral z-50 btn btn-lg btn-square btn-ghost lg:hidden text-neutral-content">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        class="h-6 w-6 stroke-current">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M4 6h16M4 12h16M4 18h16"></path>
      </svg>
    </label>
  </nav>
  <nav class="lg:navbar min--h-0 text-neutral-content bg-neutral">
    <input id="mobile-nav" type="checkbox" bind:checked={_open_nav}/>
    <ul class="mx-auto max-lg:max-w-xl max--lg:py-4">
      {#each Object.keys(cats) as cat}
        <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
        <li tabindex="0" class="grow max-lg:collapse collapse-arrow dropdown dropdown-hover last:dropdown-end w--min text-nowrap"><!-- lg:inline-block  on:blur={_uncheck} -->
          <input type="radio" name="collapse" class="lg:hidden"/>
          <div tabindex="0" role="button" class="max-lg:collapse-title lg:menu-title !text-neutral-content text-nowrap font-medium">{cat}</div>
          <ul tabindex="0" class="menu flex-nowrap max-lg:collapse-content lg:dropdown-content lg:rounded-box bg-neutral text-neutral-content lg:p-2">
            {#each Object.keys(cats[cat]) as subcat}
              <li class=""><a class="max-lg:p-4 lg:p-2 text-nowrap hover:bg-neutral-focus" class:active={`/${actual}` == cats[cat][subcat]} href={cats[cat][subcat]} on:click={_close_nav}>{subcat}</a></li>
            {/each}
          </ul>
        </li>
      {/each}
    </ul>
  </nav>
</nav>

<style>
  #mobile-nav {
    display: none!important;
  }
  /* FIX: last:dropdown-end */
  .last\:dropdown-end:last-of-type .lg\:dropdown-content {
    /*display: none;*/
    /*@apply dropdown-end;*/
    inset-inline-end: 0px!important;
  }
  a:hover {
    outline-offset: 0;
    outline-width: 0;
  }
  .active {
    cursor: default;
    pointer-events: none;
  }
  /* nav:has(#mobile-nav:checked) {
    min-height: 0;
  } */
  @media not all and (min-width: 1024px)  {
    /* nav > nav:has(~ nav #mobile-nav) {
      position: fixed;
    } */
    nav:has(nav > #mobile-nav:checked) {
      min-height: 100vh;
    }
    #mobile-nav ~ ul {
      transition: height 0.5s ease-in;
      overflow: hidden;
      height: 0;
    }
    #mobile-nav:checked ~ ul {
      height: auto;
      height: calc-size(auto, size);
    }
    /* #mobile-nav:checked ~ ul > li{
      margin-block: 1rem;
    } */
    li input:checked ~ ul {
      visibility: visible!important;
    }
  }

</style>