<script lang="ts">
	import type { PageProps } from './$types';
	import Search from '$lib/components/Search.svelte';
	import Nav2 from '$lib/components/Nav2.svelte';

	const { data }: PageProps = $props();
	const { leaderboard, doc, conf } = data;
</script>

<svelte:head>
	<title>{(doc.title ? doc.title + ' • ' : '') + conf.sitename}</title>
	<meta name="description" content="DiabKVÍZ Tabella - összpontszámok szerint csökkenő sorrendben" />
	<meta name="keywords" content={conf.tags.join(', ') || 'diabetes, diabétesz, cukorbetegség, kvíz, táblázat'} />
	<meta name="author" content={conf.sitename} />
</svelte:head>

<main class="">
	<article class="prose mt-16 mb-8 w-full mx-auto flex-none">
		<h1 class="text-center">DiabKVÍZ Tabella</h1>
		<p class="text-center">Összpontszámok szerint csökkenő sorrendben</p>
	</article>

	<div class="max-w-screen-md mx-auto mb-16 px-2">
		{#if leaderboard && leaderboard.length > 0}
			<div class="overflow-x-auto">
				<table class="table table-zebra w-full">
					<thead>
						<tr>
							<th class="text-center">Helyezés</th>
							<th>Név</th>
							<th class="text-right">Összpontszám</th>
						</tr>
					</thead>
					<tbody>
						{#each leaderboard as item, index}
							<tr>
								<td class="text-center font-bold">{index + 1}.</td>
								<td>{item.name}</td>
								<td class="text-right font-bold tabular-nums">{item.score} pont</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else}
			<div class="text-center py-8">
				<p class="opacity-60">Még nincsenek beküldött eredmények.</p>
			</div>
		{/if}
	</div>
</main>

<Search articles={data.articleCount} recipes={data.recipeCount} />
<Nav2 actual={doc.path} />
