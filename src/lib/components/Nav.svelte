<script context="module">
  import { nav1 } from '$lib/nav1.js'
  import { nav2 } from '$lib/nav2.js'
  import { goto } from '$app/navigation'
  import { browser } from '$app/environment'
  import { signInWithEmailAndPassword, setPersistence, browserLocalPersistence, createUserWithEmailAndPassword, onAuthStateChanged, signOut/* , onAuthStateChanged */ } from 'firebase/auth';
  import { firebaseAuth, signInWithGoogle } from '$lib/firebase'
  import { authUser } from '$lib/authStore'
</script>

<script>
  // @ts-nocheck

  export let actual
  let _open_nav = false, target

  /* function _uncheck(event){
    const target = event.target//.parentElement.nextSibling
    target.firstElementChild.checked = false
  } */

  //$: _open_nav = actual && false

  const _close_nav = () => _open_nav = false

  const _scrollIntoView = async (event) => {
    // console.log(window.location.hash)
    event.preventDefault()
    target = event.target.getAttribute('href') || event.target.parentElement.getAttribute('href') || null
    if (target) {
      _close_nav()
      await new Promise(resolve => setTimeout(resolve, 500))
      el = document.querySelector(target)
      // console.log(event.target.getAttribute('href'), el)
      el.scrollIntoView({block: 'start', behavior: 'smooth', offset: { top: 64 } })
      // window.location.hash = ''
      target = null
    } else {
      target = null
      el = event.target.parentElement
      await new Promise(resolve => setTimeout(resolve, 0))
      el.scrollIntoView({block: 'center', behavior: 'smooth', offset: { top: -64 } })
    }
  }

  // let el
  // if (browser) window.location.hash = ''



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

  let email, password

  let success = undefined;

  const login = (e) => {
    setPersistence(firebaseAuth, browserLocalPersistence).then(() => {
      signInWithEmailAndPassword(firebaseAuth, email, password).then((userCredential) => {
        $authUser = {
          uid: userCredential.user.uid,
          email: userCredential.user.email || ''
        }
        success = true
        // goto('/');
      }).catch((error) => {
        const errorCode = error.code
        const errorMessage = error.message
        console.log(errorCode, errorMessage)

        success = false

        if (errorCode == 'auth/invalid-credential') register()
      })
    })
  }
  const register = () => {
  createUserWithEmailAndPassword(firebaseAuth, email, password)
    .then((userCredentials) => {
      console.log(userCredentials)
      // goto('/login');
      login()
    })
    .catch((error) => {
      const errorCode = error.code;
      const errorMessage = error.message;
      console.log(errorCode, errorMessage);

      success = false;
      mod_login.showModal();
    });
  }
  const google = () => {
    mod_login.close()
    signInWithGoogle()
  }

</script>

<nav class="sticky top-0 z-40 bg-neutral navbar max-md:block justify-center py-0">
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
  <div class="sticky top-0 max-md:mx-auto bg-neutral z-50">
    <a class="block p-2" href="/" onclick={() => _close_nav}>
      <img class="h-12" src={'/assets/logo-diabetes2-1.svg'} alt="diabetes.hu" height="60">
    </a>
  </div>
  <label for="mobile-nav" aria-label="open sidebar" class="fixed top-2 right-0 bg-neutral z-50 btn btn-lg btn-square btn-ghost md:hidden text-neutral-content">
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
  <input id="mobile-nav" type="checkbox" bind:checked={_open_nav}/>
  <ul class="ml-auto max-md:mx-auto max-md:max-w-sm z-40">
    <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
    <li tabindex="0" class="drop-col text-nowrap"><!-- md:inline-block onblur={_uncheck} -->
      <a href="#search" onclick={() => _scrollIntoView} class="max-md:flex justify-between items-center max-md:p-4 md:p-2 rounded-sm md:menu-title !text-neutral-content text-nowrap font-medium"><span class="md:hidden">Keresés&nbsp;</span><svg class="inline h-[1em] opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
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
    {#each Object.keys(nav1) as cat}
      <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
      <li tabindex="0" class="drop-col collapse-arrow dropdown-hover dropdown-end text-nowrap"><!-- md:inline-block onblur={_uncheck} -->
        {#if typeof nav1[cat] === 'string'}
          <a href="{nav1[cat]}" class="max-md:p-4 md:p-2 rounded-sm md:menu-title !text-neutral-content text-nowrap font-medium" class:menu-active={`/${actual}` == nav1[cat]} onclick={() => _close_nav}>{cat}</a>
        {:else}
          <input type="radio" name="collapse" class="md:hidden" onchange={ () => _scrollIntoView() }/>
          <div tabindex="0" role="button" class="max-md:collapse-title md:menu-title !text-neutral-content text-nowrap font-medium cursor-default">{cat}</div>
          <ul tabindex="0" class="menu max-md:w-full flex-nowrap max-md:collapse-content dropdown-content md:rounded-md text-neutral-content p-0 md:p-2">
            {#each Object.keys(nav1[cat]) as subcat}
              <li class=""><a class="max-md:p-4 md:p-2 text-nowrap rounded-sm-focus" class:menu-active={`/${actual}` == nav1[cat][subcat]} href={nav1[cat][subcat]} onclick={() => _close_nav}>{subcat}</a></li>
            {/each}
          </ul>
        {/if}
      </li>
    {/each}
    {#each Object.keys(nav2) as cat}
      <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
      <li tabindex="0" class="collapse collapse-arrow md:hidden text-nowrap"><!-- md:inline-block onblur={_uncheck} -->
        {#if typeof nav2[cat] === 'string'}
          <a href="{nav2[cat]}" class="max-md:p-4 md:p-2 rounded-sm md:menu-title !text-neutral-content text-nowrap font-medium">{cat}</a>
        {:else}
          <input type="radio" name="collapse" class="md:hidden" onchange={ () => _scrollIntoView() }/>
          <div tabindex="0" role="button" class="max-md:collapse-title md:menu-title !text-neutral-content text-nowrap font-medium cursor-default">{cat}</div>
          <ul tabindex="0" class="menu w-full flex-nowrap max-md:collapse-content dropdown-content md:rounded-md text-neutral-content md:p-2 !py-0">
            {#each Object.keys(nav2[cat]) as subcat}
              <li class=""><a class="max-md:p-4 md:p-2 text-nowrap rounded-sm-focus" class:menu-active={`/${actual}` == nav2[cat][subcat]} href={nav2[cat][subcat]} onclick={() => _close_nav}>{subcat}</a></li>
            {/each}
          </ul>
        {/if}
      </li>
    {/each}
    <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
    <li tabindex="0" class="drop-col collapse-arrow dropdown-hover dropdown-end text-nowrap"><!-- md:inline-block onblur={_uncheck} -->
      <input type="radio" name="collapse" class="md:hidden" onchange={ () => _scrollIntoView() }/>
      <div tabindex="0" role="button" class="max-md:collapse-title md:menu-title !text-neutral-content opacity-50 cursor-default btn btn-sm btn-circle" class:bg-accent={$authUser} class:opacity-100={$authUser}>⍜</div>
      <ul tabindex="0" class="menu max-md:w-full flex-nowrap max-md:collapse-content dropdown-content md:rounded-md text-neutral-content md:p-2">
        {#if $authUser}
          <!-- <li class=""><a class="max-md:p-4 md:p-2 text-nowrap rounded-sm" href="/admin/ads">Ads</a></li> -->
          <li class=""><button class="max-md:p-4 md:p-2 text-nowrap rounded-sm border-none" onclick={() => handleLogout()}>Kijelentkezés</button></li>
        {:else}
          <li class=""><button class="max-md:p-4 md:p-2 text-nowrap rounded-sm border-none" onclick={ () => {_close_nav(); mod_login.showModal()}}>Bejelentkezés</button></li>
          <!-- <li class=""><button class="max-md:p-4 md:p-2 text-nowrap rounded-sm border-none" onclick={ () => {_close_nav(); mod_reg.showModal()} }>Regisztráció</button></li> -->
          <!-- <li class=""><a class="max-md:p-4 md:p-2 text-nowrap rounded-sm" class:menu-active={`/${actual}` == 'login'} href="/login" onclick={() => _close_nav}>Bejelentkezés</a></li>
          <li class=""><a class="max-md:p-4 md:p-2 text-nowrap rounded-sm" class:menu-active={`/${actual}` == 'register'} href="/register" onclick={() => _close_nav}>Regisztráció</a></li> -->
        {/if}
      </ul>
    </li>
  </ul>
</nav>

<dialog id="mod_login" class="modal modal-bottom sm:modal-middle">
  <div class="modal-box">
    <h3 class="text-lg font-bold">Hello!</h3>
    <p class="py-4">Press ESC key or click the button X to close</p>
    <div class="modal-action flex-col gap-4">
      <button class="btn btn-sm btn-circle absolute right-2 top-2" onclick={()=>mod_login.close()}>✕</button>

      <button class="btn btn-outline" onclick={() => google()}>Google fiók</button>

      <form
        method="dialog"
        class="flex flex-col sm:flex-row gap-6 sm:gap-4 max-sm-space-y-4 max-sm:w-sm sm:w-10/12 mx-auto sm:justify-center"
        onsubmit={ () => login() }
      >
        <input
          type="email"
          placeholder="Email"
          class="h-8 px-2 border border-primary rounded-md"
          required
          bind:value={email}
        />
        <input
          type="password"
          placeholder="Password"
          class="h-8 px-2 border border-primary rounded-md"
          required
          bind:value={password}
        />

        <button type="submit" class="btn btn-sm">Login</button>
      </form>
      {#if success === false}
        <div class="flex-col py-2 bg-error text-error-content text-center">Hiba történt. Kérlek, próbáld újra.</div>
      {/if}
    </div>
  </div>
</dialog>

<!-- <dialog id="mod_reg" class="modal modal-bottom sm:modal-middle">
  <div class="modal-box">
    <h3 class="text-lg font-bold">Hello!</h3>
    <p class="py-4">Press ESC key or click the button below to close</p>
    <div class="modal-action flex-col gap-4">
      <button class="btn btn-sm btn-circle absolute right-2 top-2" onclick={()=>mod_reg.close()}>✕</button>
      <form
      class="flex flex-col sm:flex-row gap-6 sm:gap-4 p-8 max-sm-space-y-4 max-sm:max-w-sm sm:w-10/12 mx-auto sm:justify-center"
      onsubmit={ () => register() }
      >
        <input
          type="email"
          placeholder="Email"
          class="h-8 px-2 border border-primary rounded-md"
          required
          bind:value={email}
        />
        <input
          type="password"
          placeholder="Password"
          class="h-8 px-2 border border-primary rounded-md"
          required
          bind:value={password}
        />
    
        <button type="submit" class="btn btn-sm">Register</button>
      </form>
      {#if success === false}
        <div class="flex-col py-2 bg-error text-error-content text-center">Hiba történt. Kérlek, próbáld újra.</div>
      {/if}
    </div>
  </div>
</dialog> -->

<style>
  #mobile-nav {
    display: none!important;
  }

  @media (width < 48rem) {
    nav:has(#mobile-nav:checked) {
      min-height: 100vh;
    }
    #mobile-nav ~ ul {
      transition: height 0.25s ease-in;
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

    .collapse-arrow > .max-md\:collapse-title::after {
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

    .collapse-arrow:not(.collapse-close) > input[type="radio"]:checked ~ .max-md\:collapse-title::after {
      transform: translateY(-50%) rotate(225deg);
    }
  }

</style>