<script>
	import '../app.postcss'
  import Nav from '$lib/components/Nav.svelte'
	//export let data
  //if (data.doc.id == '3284') console.log(data.doc)
</script>

<!--<svelte:head>
  {#if data.doc?.script}
    {@html data.doc.script}
  {/if}
</svelte:head>-->

<Nav/>
<slot></slot>
<!--<p>Share <a href={`/cikkek/diabetes/2306/lent-es-fent`}>/cikkek/diabetes/2306/lent-es-fent</a></p>-->
