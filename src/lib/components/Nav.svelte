<script context="module">
  import { nav1 } from '$lib/nav1.js'
  import { nav2 } from '$lib/nav2.js'
  import { goto } from '$app/navigation'
  import { browser } from '$app/environment'
  import { sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink, /* signInWithEmailAndPassword, setPersistence, browserLocalPersistence, getAdditionalUserInfo, */ updateProfile, /* createUserWithEmailAndPassword, */ onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth'
  import { firebaseAuth/* , signInWithGoogle */ } from '$lib/firebase'
  import { authUser, email } from '$lib/authStore'
  import { navLinkActive, navSubgroupActive } from '$lib/navActive.js'
</script>

<script>
  // @ts-nocheck

  export let actual

  let _open_nav = false, target
  let collapse = null
  let lastClickedCat = null
  let shouldToggleOff = false

  const closeAllCollapses = () => {
    collapse = null
    lastClickedCat = null
    shouldToggleOff = false
  }

  // Reactive statement to handle toggle when same collapse is clicked
  $: if (shouldToggleOff && collapse === lastClickedCat && collapse !== null) {
    const catToClose = collapse
    collapse = null
    lastClickedCat = null
    shouldToggleOff = false
    // Uncheck the radio
    if (typeof document !== 'undefined') {
      const radios = document.querySelectorAll(`input[name="collapse"][value="${catToClose}"]`)
      radios.forEach(radio => radio.checked = false)
    }
  }

  const handleCollapseClick = (cat, event) => {
    // This might not fire if radio is clicked instead
  }

  const handleRadioClick = (cat, event) => {
    // This fires BEFORE bind:group updates collapse
    const currentState = collapse
    
    // If clicking the same radio that's already checked, toggle it off
    if (currentState === cat) {
      // Set flag - reactive statement will handle closing after bind:group updates
      lastClickedCat = cat
      shouldToggleOff = true
    } else {
      // Opening a new collapse
      lastClickedCat = null
      shouldToggleOff = false
    }
  }

  const handleRadioChange = (cat, event) => {
    // Update last clicked for next time
    if (collapse === cat) {
      lastClickedCat = cat
    }
  }

  const handleCollapseKeydown = (cat, event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleCollapseClick(cat, event)
    }
  }

  const _scrollIntoView = async (event) => {
    event.preventDefault()
    target = event.target.getAttribute('href') || event.target.parentElement.getAttribute('href') || null
    if (target) {
      _open_nav = false
      await new Promise(resolve => setTimeout(resolve, 500))
      const el = document.querySelector(target)
      el.scrollIntoView({block: 'start', behavior: 'auto', offset: { top: 64 } })
    } else { // open dropdown
      const el = event.target.parentElement
      await new Promise(resolve => setTimeout(resolve, 50))
      el.scrollIntoView({ block: 'center', behavior: 'auto', offset: { top: 128 } })
    }
    target = null
  }

  const handleLogout = () => {
    signOut(firebaseAuth)
      .then(() => {
        // $authUser = undefined
        // goto('/login');
      })
      .catch((error) => {
        // Error handling
      })
    _open_nav = false
  }

  let displayName //, password
  let success = undefined;

  onAuthStateChanged(firebaseAuth, (user) => {
    if (user) {
      // console.log({user})
      // User is signed in, update your state accordingly
      authUser.set({ 'uid': user.uid, 'email': user.email, 'displayName': user.displayName || displayName })
      // console.log(authUser)
    } else {
      // User is signed out
      authUser.set(undefined)
    }
    // console.log('onAuthStateChanged', user)
  })

  const provider = new GoogleAuthProvider();

  const signInWithGoogle = () => {
    signInWithPopup(firebaseAuth, provider)
      .then((result) => {
        // This gives you a Google Access Token. You can use it to access the Google API.
        const credential = GoogleAuthProvider.credentialFromResult(result);
        const token = credential.accessToken;
        // The signed-in user info.
        // const user = result.user;
        $authUser = result.user;
        // console.log("Successfully signed in with Google!", $authUser);
        // ... You can now update your UI to show the user is logged in
      })
      .catch((error) => {
        // Handle Errors here.
        const errorCode = error.code;
        const errorMessage = error.message;
        // The email of the user's account used.
        // const email = error.customData?.email;
        // The AuthCredential type that was used.
        const credential = GoogleAuthProvider.credentialFromError(error);
        console.error("Error during Google sign-in:", errorMessage);
        success = false;
      });
  }

  const google_login = () => {
    mod_login.close()
    signInWithGoogle()
  }

  const actionCodeSettings = {
    url: browser ? window.location.href : '/',
    handleCodeInApp: true,
  }


  function ota_login() {
    sendSignInLinkToEmail(firebaseAuth, $email, actionCodeSettings)
    .then(() => {
      // The link was successfully sent. Inform the user.
      // Save the email locally so you don't need to ask the user for it again
      // if they open the link on the same device.
      window.localStorage.setItem('emailForSignIn', $email);
      // window.localStorage.setItem('displayName', displayName);
      success = 'sent'
      // ...
    })
    .catch((error) => {
      const errorCode = error.code;
      const errorMessage = error.message;
      console.log(errorCode, errorMessage)
      success = false
      // ...
    });
  }

  // Confirm the link is a sign-in with email link.
  // const auth = getAuth();
  if (browser && isSignInWithEmailLink(firebaseAuth, window.location.href)) {
    // Additional state parameters can also be passed via URL.
    // This can be used to continue the user's intended action before triggering
    // the sign-in operation.
    // Get the email if available. This should be available if the user completes
    // the flow on the same device where they started it.
    let email = window.localStorage.getItem('emailForSignIn');
    // let displayName = window.localStorage.getItem('displayName');
    if (!email) {
      // User opened the link on a different device. To prevent session fixation
      // attacks, ask the user to provide the associated email again. For example:
      email = window.prompt('Kérjük, add meg újra az email címed')
      // displayName = window.prompt('Kérjük, add meg a neved')
    }
    // The client SDK will parse the code from the link for you.
    signInWithEmailLink(firebaseAuth, email, window.location.href)
      .then(async (result) => {
        // Check if user has a display name
        if (!firebaseAuth.currentUser?.displayName) {
          /* displayName = window.prompt('Kérjük, add meg a neved');
          if (displayName) {
            try {
              await updateProfile(firebaseAuth.currentUser, {
                displayName: displayName
              });
              // Update the local state
              $authUser = {
                ...$authUser,
            displayName: displayName
              };
            } catch (error) {
              console.error('Error updating profile:', error);
            }
          } */
          mod_login.showModal()
        }
        
        // Clear email from storage
        window.localStorage.removeItem('emailForSignIn');
        success = true;
        // goto location.href without parameters
        goto(location.href.split('?')[0])
      })
      .catch((error) => {
        // Some error occurred, you can inspect the code: error.code
        // Common errors could be invalid email and invalid or expired OTPs.
        console.log(error)
        success = false
        mod_login.showModal()
      });
  }

  async function setDisplayName() {
    if ($authUser && displayName) {
      try {
        await updateProfile(firebaseAuth.currentUser, {
          displayName: displayName
        });
        // Update the local state
        $authUser = {
          ...$authUser,
          displayName: displayName
        };
        mod_login.close()
      } catch (error) {
        console.error('Error updating profile:', error);
      }
    }
  }

  const user_click = () => {
    if ($authUser) {
      _open_nav = false
      mod_logout.showModal()
    } else {
      _open_nav = false
      mod_login.showModal()
    }
  }
  
</script>

<nav class="sticky top-0 z-40 hover:z-50 bg-base-300 text-base-content navbar max-md-block max-md:flex-col justify-top py-0 min-h-12 h-12 max-md:overflow-y-auto">
  <!-- <label for="mobile-nav" aria-label="open sidebar" class="top-0 left-0 bg-base-300 z-50 btn btn-lg btn-square btn-ghost md:hidden text-base-content">
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
  <div class="max-md:sticky max-md:top-0 h-12 items-center flex justify-between max-md:w-full bg-base-300 z-50">
    <a class="block" href="/" onclick={() => _open_nav = false}>
      <img class="h-10 md:hidden" src={'/assets/logo-diabetes2-1.svg'} alt="diabetes.hu">
      <img class="w-10 h-10 max-md:hidden lg:hidden" src={'/icon.svg'} alt="diabetes.hu">
      <img class="h-10 max-lg:hidden" src={'/assets/logo-diabetes2-1.svg'} alt="diabetes.hu">
    </a>
    <label for="mobile-nav" aria-label="open sidebar" class="bg-base-300 z-50 btn btn-square btn-ghost md:hidden text-base-content">
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
  </div>
  <input id="mobile-nav" type="checkbox" bind:checked={_open_nav}/>
  <ul class="ml-auto max-md:mx-auto max-md:w-full max-md:max-w-sm overflow---y-auto">
    <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
    {#each Object.keys(nav1) as cat}
      <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
      <li tabindex="0" class="first:max-md:pt-8 drop-col collapse-arrow dropdown-hover dropdown-end text-nowrap"><!-- md:inline-block onblur={_uncheck} -->
        {#if typeof nav1[cat] === 'string'}
          <a href="{nav1[cat]}" class="relative z-10 max-md:p-4 md:py-2 rounded-sm md:menu-title !text-base-content text-nowrap font-medium bg-base-300 transition-[color,background-color] duration-200 ease-out hover:bg-base-content/10 focus-visible:bg-base-content/10 focus-visible:outline-none" class:bg-primary={navLinkActive(actual, nav1[cat])} onclick={() => { _open_nav = false; closeAllCollapses(); }}>{cat}</a>
        {:else}
          <input type="radio" name="collapse" class="md:hidden" bind:group={collapse} value={cat} onclick={(e) => handleRadioClick(cat, e)} onchange={(e) => { handleRadioChange(cat, e); _scrollIntoView(e); }}/>
          <!-- svelte-ignore a11y_invalid_attribute — same element as sibling links; # prevented in onclick -->
          <a href="#" tabindex="0" class="relative z-10 max-md:collapse-title max-md:!min-h-0 max-md:!p-4 max-md:!pr-12 md:py-2 rounded-sm md:menu-title text-nowrap font-medium no-underline bg-base-300 transition-[color,background-color] duration-200 ease-out hover:bg-base-content/10 focus-visible:bg-base-content/10 focus-visible:outline-none" class:!text-base-content={!navSubgroupActive(actual, nav1[cat])} class:!text-secondary-content={navSubgroupActive(actual, nav1[cat])} class:bg-secondary={navSubgroupActive(actual, nav1[cat])} onclick={(e) => { e.preventDefault(); handleCollapseClick(cat, e) }} onkeydown={(e) => handleCollapseKeydown(cat, e)}>{cat}</a>
          <ul tabindex="0" class="!z-0 menu max-md:w-full flex-nowrap max-md:collapse-content dropdown-content md:rounded-md text-base-content py-0 md:p-2 bg-base-300">
            {#each Object.keys(nav1[cat]) as subcat}
              <li class=""><a class="p-2 text-nowrap" class:bg-primary={navLinkActive(actual, nav1[cat][subcat])} href={nav1[cat][subcat]} onclick={() => _open_nav = false}>{subcat}</a></li>
            {/each}
          </ul>
        {/if}
      </li>
    {/each}
    {#each Object.keys(nav2) as cat}
      <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
      <li tabindex="0" class="collapse collapse-arrow md:hidden text-nowrap"><!-- md:inline-block onblur={_uncheck} -->
        {#if typeof nav2[cat] === 'string'}
          <a href="{nav2[cat]}" class="relative z-10 max-md:p-4 md:p-2 rounded-sm md:menu-title !text-base-content text-nowrap font-medium bg-base-300 transition-[color,background-color] duration-200 ease-out hover:bg-base-content/10 focus-visible:bg-base-content/10 focus-visible:outline-none" class:bg-primary={navLinkActive(actual, nav2[cat])} onclick={() => { _open_nav = false; closeAllCollapses(); }}>{cat}</a>
        {:else}
          <input type="radio" name="collapse" class="md:hidden" bind:group={collapse} value={cat} onclick={(e) => handleRadioClick(cat, e)} onchange={(e) => { handleRadioChange(cat, e); _scrollIntoView(e); }}/>
          <!-- svelte-ignore a11y_invalid_attribute — same element as sibling links; # prevented in onclick -->
          <a href="#" tabindex="0" class="relative z-10 max-md:collapse-title max-md:!min-h-0 max-md:!p-4 max-md:!pr-12 md:p-2 rounded-sm md:menu-title text-nowrap font-medium no-underline bg-base-300 transition-[color,background-color] duration-200 ease-out hover:bg-base-content/10 focus-visible:bg-base-content/10 focus-visible:outline-none" class:!text-base-content={!navSubgroupActive(actual, nav2[cat])} class:!text-secondary-content={navSubgroupActive(actual, nav2[cat])} class:bg-secondary={navSubgroupActive(actual, nav2[cat])} onclick={(e) => { e.preventDefault(); handleCollapseClick(cat, e) }} onkeydown={(e) => handleCollapseKeydown(cat, e)}>{cat}</a>
          <ul tabindex="0" class="!z-0 menu max-md:w-full flex-nowrap max-md:collapse-content dropdown-content md:rounded-md text-base-content py-0 md:p-2 bg-base-300">
            {#each Object.keys(nav2[cat]) as subcat}
              <li class=""><a class="p-2 text-nowrap" class:bg-primary={navLinkActive(actual, nav2[cat][subcat])} href={nav2[cat][subcat]} onclick={() => _open_nav = false}>{subcat}</a></li>
            {/each}
          </ul>
        {/if}
      </li>
    {/each}
    <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
    <li tabindex="0" class="drop-col text-nowrap"><!-- md:inline-block onblur={_uncheck} -->
      <a href="#search" aria-labelledby="label-search" onclick={ (e) => { closeAllCollapses(); _scrollIntoView(e); } } class="max-md:flex justify-between items-center p-4 rounded-sm !text-base-content text-nowrap font-medium transition-[color,background-color] duration-200 ease-out hover:bg-base-content/10 focus-visible:bg-base-content/10 focus-visible:outline-none">
        <span id="label-search" class="md:hidden">Keresés&nbsp;</span>
        <svg class="inline h-[1em]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
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
      </a>
    </li>
    <li class="drop-col text-nowrap max-md:p-2">
      <button 
        aria-labelledby="label-user"
        class="btn md:btn-sm max-md:flex max-md:justify-between max-md:items-center max-md:p-4 md:p-0 !rounded-full text-nowrap font-medium border-none shadow-none" 
        class:btn-primary={$authUser} onclick={() => user_click()}>
        <span id="label-user" class="md:hidden">Felhasználó&nbsp;</span>
        <svg class="inline size-[1rem]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
        </svg>
      </button>
    </li>
  </ul>
</nav>



<dialog id="mod_login" class="modal modal-bottom sm:modal-middle">
  <div class="modal-box">
    <button class="btn btn-sm !btn-circle btn-ghost absolute right-2 top-2 border-none" onclick={()=>mod_login.close()}>✕</button>
    <h3 class="text-lg font-bold">Hello!</h3>
    {#if !$authUser}
    <p class="py-4">Az Email címed igazolása közösségi fiókkal vagy egyszer használható ellenőrző link küldésével történhet.</p>
    <!-- <div class="modal-action flex-col gap-4"> -->
    <fieldset class="fieldset flex gap-4 justify-center">
      <button class="btn btn-secondary !border-secondary h-8" onclick={() => google_login()}>Google fiók</button>
      <button class="btn btn-secondary !border-secondary h-8" onclick={() => alert('Fejlesztés alatt.')}><s>Facebook fiók</s></button>
    </fieldset>
    <p class="text-center text-sm py-4">vagy</p>
    <form onsubmit={() => ota_login()}>
      <fieldset class="fieldset flex gap-4 items-center">
        <!-- <input
        type="text"
        placeholder="Név"
        class="h-8 px-2 border border-primary rounded-md flex-1"
        required
        bind:value={displayName}
        /> -->
      <!-- </fieldset>
      <fieldset class="fieldset flex gap-4 items-center"> -->
        <input
        id="email"
        name="email"
        type="email"
        autocomplete="email"
        autocorrect="off"
        autocapitalize="off"
        spellcheck="false"
        placeholder="Email cím"
        class="h-8 px-2 border border-primary rounded-md flex-1"
        required
        bind:value={$email}
        />
        {#if success === 'sent'}
        <button class="btn btn-primary h-8" ohnoclick={() => ota_login()}>Link újraküldése</button>
        {:else}
        <button class="btn btn-primary h-8" ohnoclick={() => ota_login()}>Link küldése</button>
        {/if}
        <!-- <input
        type="password"
        placeholder="Jelszó"
        class="h-8 px-2 border border-primary rounded-md"
        required
        bind:value={password}
        /> -->
      </fieldset>
      <!-- <fieldset class="fieldset flex gap-4 items-center"> -->
        <!-- <button type="submit" class="btn btn-sm text-center">Login</button> -->
      <!-- </fieldset> -->
      {#if success === false}
        <div class="flex-col py-2 mt-2 bg-error text-error-content text-center">Hiba történt. Kérjük, próbáld újra.</div>
      {/if}
      {#if success === 'sent'}
        <div class="flex-col py-2 mt-2 bg-success text-success-content text-center">Az ellenőrző linket elküldtük az Email címedre.</div>
      {/if}
      <!-- </div> -->
    </form>
    {:else}
      <p class="py-4">Kérjük, add meg a neved.</p>
      <form onsubmit={() => setDisplayName()}>
        <fieldset class="fieldset flex gap-4 items-center">
          <input
          id="name"
          name="name"
          type="text"
          placeholder="Név"
          class="h-8 px-2 border border-primary rounded-md flex-1"
          required
          bind:value={displayName}
          />
          <button class="btn btn-primary h-8" ohnoclick={() => setDisplayName()}>OK</button>
        </fieldset>
      </form>
    {/if}
  </div>
  <form method="dialog" class="modal-backdrop">
    <button>✕</button>
  </form>
</dialog>

<dialog id="mod_logout" class="modal modal-bottom sm:modal-middle">
  <div class="modal-box">
    <button class="btn btn-sm btn-circle absolute right-2 top-2 border-none" onclick={ () => mod_logout.close()}>✕</button>
    <h3 class="text-lg font-bold">Bejelentkezve, mint:</h3>
    <div class="grid xs:grid-cols-2 gap-4 max-w-screen-md mx-auto py-12 px-2">
      <p class="border border-primary bg-base-200 !h-full w-full p-2">{$authUser?.email}</p>
      <p class="border border-primary bg-base-200 !h-full w-full p-2">{$authUser?.displayName}</p>
    </div>
    <!-- <p class="py-4">Biztosan ki szeretnél jelentkezni?</p> -->
    <div class="modal-action flex-col gap-4">
      <button class="btn btn-sm mx-auto" onclick={ () => {mod_logout.close(); handleLogout()} }>Kijelentkezés</button>
    </div>
  </div>
  <form method="dialog" class="modal-backdrop">
    <button>✕</button>
  </form>
</dialog>

<!-- <dialog id="mod_reg" class="modal modal-bottom sm:modal-middle">
  <div class="modal-box">
    <h3 class="text-lg font-bold">Hello!</h3>
    <p class="py-4">Press ESC key or click the button below to close</p>
    <div class="modal-action flex-col gap-4">
      <button class="btn btn-sm btn-circle absolute right-2 top-2 border-none" onclick={()=>mod_reg.close()}>✕</button>
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
  @media (prefers-color-scheme: light) {
  }
  @media (prefers-color-scheme: dark) {
  }

  /* nav {
    -webkit-backdrop-filter: blur(8px);
    backdrop-filter: blur(8px);
    --tw-bg-opacity: .85;
  } */

  #mobile-nav {
    display: none!important;
  }

  @media (width < 48rem) {
    nav:has(#mobile-nav:checked) {
      min-height: 100vh;
    }
    #mobile-nav ~ ul {
      transition: height 0.25s ease-in;
      /* overflow: hidden; */
      height: 0;
    }
    #mobile-nav:checked ~ ul {
      height: auto;
      height: calc-size(auto, size);
    }
    /* #mobile-nav:checked ~ ul > li{
      margin-block: 1rem;
    } */
    /* max-md:collapse-content is not .collapse-content — DaisyUI keeps content-visibility:hidden until checked~.collapse-content */
    li input:checked ~ ul {
      visibility: visible !important;
      display: block !important;
      content-visibility: visible !important;
      min-height: fit-content !important;
    }

    .collapse-arrow > a.max-md\:collapse-title::after {
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

    .collapse-arrow:not(.collapse-close) > input[type="radio"]:checked ~ a.max-md\:collapse-title::after {
      transform: translateY(-50%) rotate(225deg);
    }
  }

  input:required:not(:valid) ~ button {
    pointer-events: none;
    user-select: none;
  }
  /* fieldset.required:not(:valid) ~ fieldset {
    display: none;
  } */

</style>