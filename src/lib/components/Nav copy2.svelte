<script context="module">
  import { PUBLIC_BASE_URL } from '$env/static/public'
  import { nav1 } from '$lib/nav1.js'
  import { signOut/* , onAuthStateChanged */ } from 'firebase/auth'
  import { firebaseAuth } from '$lib/firebase'
  import { authUser } from '$lib/authStore'
  import { goto } from '$app/navigation'
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

  const handleLogout = () => {
    signOut(firebaseAuth)
      .then(() => {
        $authUser = undefined
        // goto('/login');
      })
      .catch((error) => {
        console.log(error);
      })
    _open_nav = false
  }

  let el
  const _scrollIntoView = async (event) => {
    // console.log(event.target, event.target.checked)
    if (event.target.tagName == 'A') {
      event.preventDefault()
      el = document.querySelector(event.target.getAttribute('href'))
    } else {
      el = event.target.parentElement
    }
    await new Promise(resolve => setTimeout(resolve, 100))
    // console.log(el)
    el.scrollIntoView({ behavior: 'smooth' })
  }
</script>

<nav class="sticky top-0 md:-top-16 z-40 bg-neutral">
  <nav class="top-0 left-0 w-full navbar md justify-center py-0">
    <!-- <label for="mobile-nav" aria-label="open sidebar" class="top-0 left-0 bg-neutral z-50 btn btn-lg btn-square btn-ghost md:hidden text-neutral-content">
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
    </label> -->
    <div class="max-md-flex-1"><a class="block p-2" href="/" on:click={_close_nav}><img class="h-12" src={'/assets/logo-diabetes2.svg'} alt="diabetes.hu"></a></div>
    <label for="mobile-nav" aria-label="open sidebar" class="absolute top-0 right-0 bg-neutral z-50 btn btn-lg btn-square btn-ghost md:hidden text-neutral-content">
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
  <nav class="md:navbar">
    <input id="mobile-nav" type="checkbox" bind:checked={_open_nav}/>
    <ul class="mx-auto max-md:w-min">
      {#each Object.keys(nav1) as cat}
        <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
        <li tabindex="0" class="drop-col dropdown-hover grow text-nowrap"><!-- md:inline-block  on:blur={_uncheck} -->
          {#if typeof nav1[cat] === 'string'}
            <a href="{nav1[cat]}" class="max-md:p-4 md:p-2 rounded-sm hover:bg-neutral-focus md:menu-title !text-neutral-content text-nowrap font-medium">{cat}</a>
          {:else}
            <input type="radio" name="collapse" class="md:hidden" on:change={_scrollIntoView}/>
            <div tabindex="0" role="button" class="max-md:collapse-title md:menu-title !text-neutral-content text-nowrap font-medium cursor-default">{cat}</div>
            <ul tabindex="0" class="menu flex-nowrap max-md:collapse-content dropdown-content md:rounded-md bg-neutral text-neutral-content md:p-2">
              {#each Object.keys(nav1[cat]) as subcat}
                <li class=""><a class="max-md:p-4 md:p-2 text-nowrap rounded-sm hover:bg-neutral-focus" class:menu-active={`/${actual}` == nav1[cat][subcat]} href={nav1[cat][subcat]} on:click={_close_nav}>{subcat}</a></li>
              {/each}
            </ul>
          {/if}
        </li>
      {/each}
      <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
      <li tabindex="0" class="drop-col"><!-- md:inline-block  on:blur={_uncheck} -->
        <!-- <input type="radio" name="collapse" class="md:hidden" on:change={_scrollIntoView}/> -->
        <a href="#search" class="max-md:p-4 md:p-2 rounded-sm hover:bg-neutral-focus md:menu-title !text-neutral-content" on:click={_scrollIntoView || _close_nav}>Keresés</a>
      </li>
      <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
      <li tabindex="0" class="drop-col dropdown-hover grow dropdown-end text-nowrap"><!-- md:inline-block  on:blur={_uncheck} -->
        <input type="radio" name="collapse" class="md:hidden" on:change={_scrollIntoView}/>
        <div tabindex="0" role="button" class="max-md:collapse-title md:menu-title !text-neutral-content">⍜</div>
        <ul tabindex="0" class="menu flex-nowrap max-md:collapse-content dropdown-content md:rounded-md bg-neutral text-neutral-content md:p-2">
          {#if $authUser}
            <li class=""><a class="max-md:p-4 md:p-2 text-nowrap rounded-sm hover:bg-neutral-focus" href="/admin/ads">Ads</a></li>
            <li class=""><button class="max-md:p-4 md:p-2 text-nowrap rounded-sm hover:bg-neutral-focus" on:click={handleLogout} on:keydown={handleLogout}>Kijelentkezés</button></li>
          {:else}
            <li class=""><a class="max-md:p-4 md:p-2 text-nowrap rounded-sm hover:bg-neutral-focus" class:menu-active={`/${actual}` == 'login'} href="/login" on:click={_close_nav}>Bejelentkezés</a></li>
            <li class=""><a class="max-md:p-4 md:p-2 text-nowrap rounded-sm hover:bg-neutral-focus" class:menu-active={`/${actual}` == 'register'} href="/register" on:click={_close_nav}>Regisztráció</a></li>
          {/if}
        </ul>
      </li>
    </ul>
  </nav>
</nav>

<style>
  /* @reference "../../app.css"; */
  #mobile-nav {
    display: none!important;
  }
  /* FIX: last:dropdown-end */
  /* .last\:dropdown-end:last-of-type .lg\:dropdown-content {
    inset-inline-end: 0px!important;
  } */
  /* .dropdown:has(+ .dropdown-end:last-of-type) .lg\:dropdown-content {
    inset-inline-end: 0px!important;
  } */
  a:hover {
    outline-offset: 0;
    outline-width: 0;
  }
  .menu-active {
    cursor: default;
    pointer-events: none;
  }
  /* nav:has(#mobile-nav:checked) {
    min-height: 0;
  } */
  
  @media (width >= 48rem) {
    /* .drop-col {
      @apply dropdown;
    } */
  }
  @media (width < 48rem) {
    /* .drop-col {
      @apply collapse collapse-arrow;
    } */
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
      display: block!important;
    }
  }

  .collapse-arrow > .max-lg\:collapse-title::after {
    @media (width < 48rem) {
      content: "";
      transform-origin: 75% 75%;
      pointer-events: none;
      top: 1.9rem;
      width: .5rem;
      height: .5rem;
      transition-property: all;
      transition-duration: .2s;
      transition-timing-function: cubic-bezier(.4,0,.2,1);
      display: block;
      position: absolute;
      inset-inline-end: 1.4rem;
      transform: translateY(-100%) rotate(45deg);
      box-shadow: 2px 2px;
    }
  }

.collapse-arrow:not(.collapse-close) > input[type="radio"]:checked ~ .max-lg\:collapse-title::after {
  @media (width < 48rem) {
    transform: translateY(-50%) rotate(225deg);
  }
}

</style>