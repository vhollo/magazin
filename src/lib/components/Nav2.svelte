<script context="module">
  import { PUBLIC_BASE_URL } from '$env/static/public'
  import { nav2 } from '$lib/nav2.js'
  import { signOut/* , onAuthStateChanged */ } from 'firebase/auth'
  import { firebaseAuth } from '$lib/firebase'
  // import { authUser } from '$lib/authStore'
</script>

<script>
// @ts-nocheck

  export let actual
  // let _open_nav = false

  /* function _uncheck(event){
    const target = event.target//.parentElement.nextSibling
    target.firstElementChild.checked = false
  } */

  //$: _open_nav = actual && false

  // const _close_nav = () => _open_nav = false

  /* const handleLogout = () => {
    signOut(firebaseAuth)
      .then(() => {
        $authUser = undefined
        // goto('/login');
      })
      .catch((error) => {
        console.log(error);
      })
    _open_nav = false
  } */

  /* const _scrollIntoView = async (event) => {
    // console.log(event.target, event.target.checked)
    const el = event.target.parentElement
    await new Promise(resolve => setTimeout(resolve, 250))
    // console.log(el)
    el.scrollIntoView({ behavior: 'smooth' })
  } */
</script>

  <nav class="max-md:hidden navbar text-neutral-content bg-base-100 sticky top-0 z-50">
    <!-- <input id="mobile--nav" type="checkbox" bind:checked={_open_nav}/> -->
    <ul class="mx-auto">
      {#each Object.keys(nav2) as cat}
        <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
        <li tabindex="0" class="dropdown dropdown-hover last:dropdown-end text-nowrap"><!-- md:inline-block  on:blur={_uncheck} -->
          <input type="radio" name="collapse" class="hidden"/>
          <div tabindex="0" role="button" class="menu-title !text-neutral-content text-nowrap font-medium cursor-default">{cat}</div>
          <ul tabindex="0" class="menu flex-nowrap dropdown-content rounded-md bg-base-100 text-neutral-content p-2">
            {#each Object.keys(nav2[cat]) as subcat}
              <li class=""><a class="p-2 text-nowrap rounded-sm hover:bg-neutral-focus" class:menu-active={`/${actual}` == nav2[cat][subcat]} href={nav2[cat][subcat]}>{subcat}</a></li>
            {/each}
          </ul>
        </li>
      {/each}
    </ul>
  </nav>

<style>
  /* @reference "../../app.css"; */
  /* #mobile-nav {
    display: none!important;
  } */
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
  .menu-active {
    background-color: var(--color-base-200)!important;
  }

</style>