<script>
	import './app.postcss'
  import Nav from '$lib/components/Nav.svelte'
  import Footer from '$lib/components/Footer.svelte'
  //import { page } from '$app/stores'
	export let data
</script>

<!--<svelte:head>
  {#if data.doc?.script}
    {@html data.doc.script}
  {/if}
</svelte:head>-->

<Nav actual={data.doc.path}/>
<slot></slot>
<Footer/>
<!--<p>Share <a href={`/cikkek/diabetes/2306/lent-es-fent`}>/cikkek/diabetes/2306/lent-es-fent</a></p>-->
