<script module lang="ts">
  import Search from '$lib/components/Search.svelte';
  import Nav2 from '$lib/components/Nav2.svelte';
  import type { PageProps } from "./$types";
  import { marked } from '$lib/marked';

</script>
<script lang="ts">
import { onMount, tick } from 'svelte';
import { browser } from '$app/environment';
import { uid } from '$lib/authStore';
import { get } from 'svelte/store';
import { afterNavigate, invalidateAll } from '$app/navigation';
import { kvizScores } from '$lib/kvizStore';

onMount(() => {
  let prev = !!get(uid);
  const stop = uid.subscribe((v) => {
    const curr = !!v;
    if (curr !== prev) {
      invalidateAll(); // triggers +page.ts load again on login and logout
    }
    prev = curr;
  });
  return stop;
});

const { data }: PageProps = $props()
const kvizzes = $derived(data.kvizzes)
// console.log({kvizzes})
// marked is configured in $lib/marked.ts, imported via +page.ts

// ── Scroll restoration ───────────────────────────────────────────────────────
// This page is ssr:false, so the pre-hydration restore in app.html can't help
// (no server HTML). Instead we restore once the client has rendered the list,
// retrying until we reach the saved Y — this also returns you to your place in
// the list on back/forward from a quiz. behavior:'instant' avoids the global
// scroll-behavior:smooth animating each retry.
let pendingScrollY: number | null = null

async function restoreScrollWhenReady() {
  if (pendingScrollY == null || !browser) return
  const y = pendingScrollY
  await tick()
  await tick()
  let attempts = 0
  const tryScroll = () => {
    window.scrollTo({ top: y, left: 0, behavior: 'instant' })
    attempts++
    if (window.scrollY >= y - 2 || attempts >= 12) {
      pendingScrollY = null
      return
    }
    setTimeout(tryScroll, 50)
  }
  requestAnimationFrame(() => requestAnimationFrame(tryScroll))
}

export const snapshot: import('./$types').Snapshot<{ scrollY: number }> = {
  capture: () => ({ scrollY: browser ? window.scrollY : 0 }),
  restore: (value) => {
    if (browser && typeof value?.scrollY === 'number') pendingScrollY = value.scrollY
  },
}

afterNavigate((navigation) => {
  if (!browser) return
  if (navigation.type !== 'enter' && navigation.type !== 'popstate') return
  if (pendingScrollY == null) {
    try {
      const idx = history.state?.['sveltekit:history']
      const map = JSON.parse(sessionStorage['sveltekit:scroll'] || '{}')
      const pos = idx != null ? map[idx] : null
      if (pos && typeof pos.y === 'number') pendingScrollY = pos.y
    } catch (e) { /* ignore */ }
  }
  if (pendingScrollY != null) restoreScrollWhenReady()
})

</script>

<svelte:head>
  <title>{(data.doc.title ? data.doc.title + ' • ' : '') + data.conf.sitename}</title>
  <meta name="description" content="Szeretettel várunk minden kedden 17:00 órakor a soron következő DiabPONT előadáson! Részletek, csatlakozás: https://ceosz.hu/diabpont/"/>
  <meta name="keywords" content={data.conf.tags.join(', ') || 'diabetes, diabétesz, cukorbetegség, vese, keton, Tudomány Kiadó Kft'}/>
  <meta name="author" content={data.conf.sitename}/>
  <meta name="og:image" content={data.conf.ogi || '/icon.svg'}/>
  <meta name="og:title" content={(data.doc.title ? data.doc.title + ' • ' : '') + data.conf.sitename}/>
  <meta name="og:description" content={data.conf.description || 'www.diabetes.hu • Az Alapítvány a Cukorbetegekért betegtájékoztató lapja. Kiadja a Tudomány Kiadó Kft.'}/>
  <meta name="og:url" content={data.conf.url || 'https://diabetes.hu'}/>
  <meta name="og:site_name" content="Diabetes"/>
  <meta name="og:type" content="article"/>
  <meta name="og:locale" content="hu_HU"/>
</svelte:head>

<main class="">
  <article class="prose mt-16 mb-8 w-full mx-auto flex-none">
    <h1 class="text-center">DiabKVÍZ</h1>
    <!-- <h2 class="text-center">{kviz.title}</h2> -->
    <p class="text-center">Az alábbi kvízek csak példák.</p>
    <!-- <p class="text-center"><a href="/kviz/tabella" class="btn btn-outline btn-sm">TABELLA</a></p> -->
  </article>

<div class="list max-w-screen-md mx-auto grid grid-cols-[auto 1fr auto] gap-4 mb-16 px-2">
  {#each kvizzes as kviz, i}
  <h2 class="col-span-3 uppercase mt-4"><a class="!no-underline" href={`/kviz/${kviz.id}`}>{kviz.title}</a></h2>
    <div class="font-thin tabular-nums text-sm"
      class:text-primary={!isNaN($kvizScores[kviz.id])}
      class:text-accent={isNaN($kvizScores[kviz.id])}
      class:text-warning={(new Date(kviz.expires_on).getTime() + 24 * 60 * 60 * 1000) < (new Date()).getTime()}
    >
      {#if kviz.expires_on}
      {@html new Date(kviz.expires_on).toLocaleDateString('hu-HU', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace('. ', '.<br>').replace('. ', '.').slice(0, -1)}
      {/if}
    </div>
  <div class="opacity-60 hyphens-auto">{@html marked.parse(kviz.description || '')}</div>
  <span class="flex flex-col gap-1">
  {#if (new Date(kviz.expires_on).getTime() + 24 * 60 * 60 * 1000) < (new Date()).getTime()}
    <a href={`/kviz/${kviz.id}`} aria-label="Megtekintés" class="btn btn-outline btn-warning !hover:outline btn-square mx-auto">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
        <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
      </svg>
    </a>
    {#if $kvizScores[kviz.id]}
    <span class="text-warning mx-auto text-sm">
      {$kvizScores[kviz.id]} / {kviz.max_score}<br>pont
    </span>
    {:else}
    <span class="text-warning mx-auto text-sm">
      Lejárt
    </span>
  {/if}
  {:else if !isNaN($kvizScores[kviz.id])}
    <a href={`/kviz/${kviz.id}`} aria-label="Kitöltés újra" class="btn btn-outline btn-primary !hover:outline btn-square mx-auto">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
        <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
      </svg>
    </a>
    <span class="text-primary mx-auto">
        {$kvizScores[kviz.id]} / {kviz.max_score}<br>pont
    </span>
  {:else}
    <a href={`/kviz/${kviz.id}`} aria-label="Beküldés" class="btn btn-outline btn-accent !hover:outline btn-square mx-auto">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
        <path stroke-linecap="round" stroke-linejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
      </svg>
    </a>
  {/if}
  <!-- {$kvizScores[kviz.id].isInteger.toString()} -->
  </span>
  {/each}
</div>
</main>
<Search articles={data.articleCount} recipes={data.recipeCount} />
<Nav2 actual={data.path}/>
