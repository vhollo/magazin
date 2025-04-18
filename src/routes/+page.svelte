<script context="module">
  import Nav2 from '$lib/components/Nav2.svelte'
  import Cards from '$lib/components/Cards.svelte'
  import Carousel from '$lib/components/Carousel.svelte'
  import Search from '$lib/components/Search.svelte'
  import { PUBLIC_BASE_URL } from '$env/static/public'

</script>

<script>
  // @ts-nocheck
  // import { onMount, afterUpdate } from 'svelte'

  export let data
  // console.log('[/]',data.docs.length)
  // let pagenum = 1

  //$: (data) => { doc = data.doc stb…}
  //$: doc = data.doc
  let docs = data.docs.slice(0, 18 * 4)

</script>

<svelte:head><title>Diabetes</title></svelte:head>
  <Carousel/>

  <Search />
  <Nav2/>
  
  {#if docs.length}
  <article class="prose w-128 my-16 mx-auto">
    <h1 class="text-center">A legfrissebb cikkek</h1>
  </article>
    <Cards cards={docs}/>
  {/if}

