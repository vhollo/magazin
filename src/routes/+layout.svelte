<script lang="ts">
	import '../app.css'
  import Nav from '$lib/components/Nav.svelte'
  import Footer from '$lib/components/Footer.svelte'

	import { page } from '$app/state';
	import type { LayoutProps } from './$types';
	let { data, children }: LayoutProps = $props();

  // import { page } from '$app/stores'
  // import { goto } from '$app/navigation'

  // console.log(data.path)
  </script>

<Nav actual={data.path}/>

{@render children()}
<Footer/>
