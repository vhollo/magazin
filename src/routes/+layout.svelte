<script lang="ts">
	import '../app.postcss'
  import Nav from '$lib/components/Nav.svelte'
  import Footer from '$lib/components/Footer.svelte'

  export let data

  // import { page } from '$app/stores'
  // import { goto } from '$app/navigation'

  </script>

<Nav actual={data.doc.path}/>

<slot></slot>
<Footer/>
