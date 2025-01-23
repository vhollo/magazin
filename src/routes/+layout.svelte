<script lang="ts">
	import '../app.postcss'
  import Nav from '$lib/components/Nav.svelte'
  import Footer from '$lib/components/Footer.svelte'
  //import { page } from '$app/stores'
	export let data

  import { page } from '$app/stores'
  // import { goto } from '$app/navigation'
  // import { signOut/* , onAuthStateChanged */ } from 'firebase/auth'
  // import { firebaseAuth } from '$lib/firebase'
  // import { authUser } from '$lib/authStore'
  // $: console.log($authUser)

/*   onAuthStateChanged(firebaseAuth, (user) => {
    if (user) {
      // console.log($authUser)
      // User is signed in, update your state accordingly
      $authUser = { 'uid': user.uid, 'email': user.email }
      // console.log($authUser)
    } else {
      // User is signed out
      $authUser = undefined
    }
  })
 */
  /* const handleLogout = () => {
    signOut(firebaseAuth)
      .then(() => {
        $authUser = undefined
        // goto('/login');
      })
      .catch((error) => {
        console.log(error);
      })
  } */
</script>

<!--<svelte:head>
  {#if data.doc?.script}
    {@html data.doc.script}
  {/if}
</svelte:head>-->

<Nav actual={data.doc.path}/>
<!-- 
<nav class="flex gap-4">
  {#if $authUser}
    <button class="hover:underline" on:click={handleLogout}>Logout</button>
  {:else}
    <a href="/register" class="hover:underline" class:active={$page.url.pathname === '/register'}
      >Register</a
    >
    <a href="/login" class="hover:underline" class:active={$page.url.pathname === '/login'}
      >Login</a
    >
  {/if}
</nav>
 -->
<slot></slot>
<Footer/>
