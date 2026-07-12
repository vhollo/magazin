<script lang="ts">
	import type { PageProps } from './$types';
	import Search from '$lib/components/Search.svelte';
	import Nav2 from '$lib/components/Nav2.svelte';
	import { authUser } from '$lib/authStore';

	const { data }: PageProps = $props();
	const leaderboard = $derived(data.leaderboard);
	const doc = $derived(data.doc);
	const conf = $derived(data.conf);

	/** Medal accent for the top three ranks; neutral chip below. */
	function rankClass(rank: number) {
		if (rank === 1) return 'bg-amber-400 text-amber-950';
		if (rank === 2) return 'bg-slate-300 text-slate-900';
		if (rank === 3) return 'bg-orange-300 text-orange-950';
		return 'bg-base-300 text-base-content';
	}
</script>

<svelte:head>
	<title>{(doc.title ? doc.title + ' • ' : '') + conf.sitename}</title>
	<meta name="description" content="DiabKVÍZ Tabella - összpontszámok szerint csökkenő sorrendben" />
	<meta name="keywords" content={conf.tags.join(', ') || 'diabetes, diabétesz, cukorbetegség, kvíz, táblázat'} />
	<meta name="author" content={conf.sitename} />
</svelte:head>

<main class="">
	<article class="prose mt-16 mb-8 w-full mx-auto flex-none text-center">
		<h1>DiabKVÍZ Tabella</h1>
		<p>Összpontszámok szerint csökkenő sorrendben</p>
		<p class="!mt-0 opacity-70">(Csak a le nem járt kvízek pontszámai)</p>
		<p>
			<a href="/kviz" class="btn btn-outline btn-primary border-2 btn-sm gap-2 no-underline">
				<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-5">
					<path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
				</svg>
				Vissza a kvízekhez
			</a>
		</p>
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
						{#each leaderboard as item, index (item.name)}
							{@const rank = index + 1}
							{@const isMe = !!$authUser?.displayName && item.name === $authUser.displayName}
							<tr class:me={isMe}>
								<td class="text-center">
									<span class="inline-flex size-8 items-center justify-center rounded-full font-bold tabular-nums {rankClass(rank)}">{rank}</span>
								</td>
								<td class="font-medium" class:font-bold={rank <= 3}>
									{item.name}
									{#if isMe}
										<span class="badge badge-primary badge-sm ml-2">Te</span>
									{/if}
								</td>
								<td class="text-right font-bold tabular-nums">{item.score} pont</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else}
			<div class="text-center py-12">
				<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="mx-auto size-16 opacity-30">
					<path stroke-linecap="round" stroke-linejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-3.044 0" />
				</svg>
				<p class="mt-4 opacity-60">Még nincsenek beküldött eredmények.</p>
				<a href="/kviz" class="btn btn-outline btn-primary border-2 btn-sm mt-4 no-underline">Töltsd ki az első kvízt</a>
			</div>
		{/if}
	</div>
	<article class="prose mt-16 mb-8 w-full mx-auto flex-none text-center">
		<p>
			<a href="/kviz" class="btn btn-outline btn-primary border-2 btn-sm gap-2 no-underline">
				<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-5">
					<path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
				</svg>
				Vissza a kvízekhez
			</a>
		</p>
	</article>
</main>

<Search articles={data.articleCount} recipes={data.recipeCount} />
<Nav2 actual={doc.path} />

<style>
	/* Highlight the signed-in user's own row; !important beats table-zebra's td bg. */
	tr.me td {
		background-color: color-mix(in oklch, var(--color-primary) 14%, transparent) !important;
	}
</style>
