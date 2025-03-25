<script lang="ts">
	import { useQuery } from '@sanity/svelte-loader';
	import Card from '$lib/sanity/Card.svelte';
	import Welcome from '$lib/sanity/Welcome.svelte';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
	const uq = useQuery(data);

	let { data: posts } = $derived($uq);
</script>

<section>
	{#if posts.length}
		{#each posts as quiz}
			<Card {quiz} />
		{/each}
	{:else}
		<Welcome />
	{/if}
</section>
