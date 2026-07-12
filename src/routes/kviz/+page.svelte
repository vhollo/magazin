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
  <article class="prose mt-16 mb-8 w-full mx-auto flex-none text-center">
    <h1>DiabKVÍZ</h1>
    <p>Az alábbi kvízek csak példák.</p>
    <p>
      <a href="/kviz/tabella" class="btn btn-primary btn-sm gap-2 no-underline">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-3.044 0" />
        </svg>
        TABELLA
      </a>
    </p>
  </article>

<div class="list max-w-screen-md mx-auto mb-16 px-2 flex flex-col gap-6">
  {#each kvizzes as kviz, i (kviz.id)}
    {@const score = $kvizScores[kviz.id]}
    {@const expired = !!kviz.expires_on && (new Date(kviz.expires_on).getTime() + 24 * 60 * 60 * 1000) < Date.now()}
    {@const done = !expired && !isNaN(score)}
    {@const status = expired ? 'expired' : done ? 'done' : 'open'}
    <article
      class="quiz border-l-4 pl-4 pb-6 border-b border-b-base-200 grid grid-cols-[auto_1fr_auto] gap-4"
      class:border-l-accent={status === 'open'}
      class:border-l-primary={status === 'done'}
      class:border-l-warning={status === 'expired'}
    >
      <h2 class="col-span-3 uppercase mt-0 mb-1">
        <a class="!no-underline" href={`/kviz/${kviz.id}`}>{kviz.title}</a>
      </h2>

      <div class="flex flex-col gap-2 items-start">
        <span
          class="badge badge-sm font-semibold whitespace-nowrap"
          class:badge-accent={status === 'open'}
          class:badge-primary={status === 'done'}
          class:badge-warning={status === 'expired'}
        >
          {status === 'open' ? 'Határidő' : status === 'done' ? 'Kitöltve' : 'Lejárt'}
        </span>
        {#if kviz.expires_on}
          {@const d = new Date(kviz.expires_on)}
          <span
            class="font-medium tabular-nums text-sm leading-tight text-center mx-auto"
            class:text-primary={done}
            class:text-accent={status === 'open'}
            class:text-warning={expired}
          >
            <span class="block">{d.getFullYear()}.</span>
            <span class="block">{String(d.getMonth() + 1).padStart(2, '0')}.</span>
            <span class="block">{String(d.getDate()).padStart(2, '0')}.</span>
          </span>
        {/if}
      </div>

      <div class="opacity-70 hyphens-auto">{@html marked.parse(kviz.description || '')}</div>

      <span class="flex flex-col gap-1 items-center">
        {#if expired}
          <a href={`/kviz/${kviz.id}`} aria-label="Megtekintés" class="btn btn-outline btn-warning border-2 btn-square">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
          </a>
          {#if score}
            <span class="text-warning text-center text-sm font-medium">{score} / {kviz.max_score}<br>pont</span>
          <!-- {:else}
            <span class="text-warning text-center text-sm font-medium">Lejárt</span> -->
          {/if}
        {:else if done}
          <a href={`/kviz/${kviz.id}`} aria-label="Kitöltés újra" class="btn btn-outline btn-primary border-2 btn-square">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          </a>
          <span class="text-primary text-center text-sm font-medium">{score} / {kviz.max_score}<br>pont</span>
        {:else}
          <a href={`/kviz/${kviz.id}`} aria-label="Kitöltés" class="btn btn-outline btn-accent border-2 btn-square">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
            </svg>
          </a>
        {/if}
      </span>
    </article>
  {/each}
</div>
</main>
<Search articles={data.articleCount} recipes={data.recipeCount} />
<Nav2 actual={data.path}/>
