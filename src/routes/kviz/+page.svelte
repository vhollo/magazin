<script module>
  import Search from '$lib/components/Search.svelte';
  import Nav2 from '$lib/components/Nav2.svelte';
</script>
<script lang="ts">
import { onMount } from 'svelte';
import { uid } from '$lib/authStore';
import { get } from 'svelte/store';
import { invalidateAll } from '$app/navigation';

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

import { kvizScores } from '$lib/kvizStore';
// console.log($kvizScores)
import type { PageProps } from "./$types";
const { data }: PageProps = $props()
// console.log({data})
const kvizzes = data.kvizzes
// console.log({kvizzes})
</script>

<svelte:head>
  <title>{(data.doc.title ? data.doc.title + ' • ' : '') + data.conf.sitename}</title>
  <meta name="description" content="Szeretettel várunk minden kedden 17:00 órakor a soron következő DiabPONT előadáson! Részletek, csatlakozás: https://ceosz.hu/diabpont/"/>
  <meta name="keywords" content={data.conf.tags.join(', ') || 'diabetes, diabétesz, cukorbetegség, vese, keton, Tudomány Kiadó Kft'}/>
  <meta name="author" content={data.conf.sitename}/>
  <meta name="og:image" content={data.conf.ogi || '/assets/logo-uj-diabetes-web.svg'}/>
  <meta name="og:title" content={(data.doc.title ? data.doc.title + ' • ' : '') + data.conf.sitename}/>
  <meta name="og:description" content={data.conf.description || 'www.diabetes.hu • Az Alapítvány a Cukorbetegekért betegtájékoztató lapja. Kiadja a Tudomány Kiadó Kft.'}/>
  <meta name="og:url" content={data.conf.url || 'https://diabetes.hu'}/>
  <meta name="og:site_name" content="Diabetes"/>
  <meta name="og:type" content="article"/>
  <meta name="og:locale" content="hu_HU"/>
</svelte:head>

<main class="bg-base-300">
  <article class="prose mt-16 mb-8 w-full mx-auto flex-none">
    <h1 class="text-center">DiabKVÍZ</h1>
    <!-- <h2 class="text-center">{kviz.title}</h2> -->
    <p class="text-center">Az alábbi kvízek csak példák.</p>
  </article>

<div class="list max-w-screen-md mx-auto grid grid-cols-[auto 1fr auto] gap-4 mb-16 px-2">
  {#each kvizzes as kviz, i}
  <h2 class="col-span-3 uppercase mt-4">{kviz.title}</h2>
    <div class="font-thin opacity-60 tabular-nums text-sm">{@html new Date(kviz.starts_on).toLocaleDateString('hu-HU', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace('. ', '<br>').replace('. ', '.').slice(0, -1)}</div>
  <p class="opacity-60 hyphens-auto">{kviz.description}</p>
  <span class="text-center">
  {#if !isNaN($kvizScores[kviz.id])}
    <a href={`/kviz/${kviz.id}`} aria-label="Beküldés" class="">
      <span class="badge badge-accent">
        {$kvizScores[kviz.id]} / {kviz.max_score} pont
      </span>
    </a>
  {:else}
    <a href={`/kviz/${kviz.id}`} aria-label="Beküldés" class="btn btn-outline !hover:outline btn-square">
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
<Search count={data.count}/>
<Nav2 actual={data.path}/>
