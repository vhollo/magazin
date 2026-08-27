<script module>
  import MiniSearch from 'minisearch'
  import Search from '$lib/components/Search.svelte';
  import Nav2 from '$lib/components/Nav2.svelte';
  import { fade, fly } from 'svelte/transition';
</script>
<script lang="ts">
  import type { PageProps } from "./$types";
  const { data }: PageProps = $props()
  const patikas = $derived(data.doc.patikas)

  const miniSearch = $derived.by(() => {
    const ms = new MiniSearch({
      idField: 'patika',
      fields: ['irsz', 'varos', 'cegnev', 'cim', 'patika'],
      storeFields: ['patika', 'irsz', 'varos', 'cim', 'email'],
    })
    ms.addAll(patikas)
    return ms
  })

  let query = $state('')

  let list = $derived(query ? miniSearch.search(query, { fuzzy: 0.25 }) : patikas)
</script>

<svelte:head>
  <title>{(data.doc.title ? data.doc.title + ' • ' : '') + data.conf.sitename}</title>
  <meta name="description" content="Keresőnkkel megtalálhatod a hozzád legközelebb eső gyógyszertárat, ahol a Diabetes és/vagy Hypertonia betegtájékoztató magazin elérhető."/>
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

<main>
  <section class="band relative overflow-hidden bg-base-200">
    <div class="mx-auto max-w-4xl px-4 py-10 sm:py-14">
      <h1 class="display text-3xl leading-tight text-balance sm:text-4xl">Gyógyszertárkereső</h1>
      <p class="mt-2 max-w-4xl opacity-80">Keresőnkkel megtalálhatod a hozzád legközelebb eső gyógyszertárat, ahol a Diabetes és/vagy Hypertonia betegtájékoztató magazin elérhető.</p>
      <form class="form-control mt-6 w-full max-w-md">
        <p class="label">
          Keress gyógyszertárat név, cím, város vagy irányítószám alapján
        </p>
        <input type="text" placeholder="Keresés" class="input input-bordered w-full max-w-sm" bind:value={query} />
      </form>
    </div>
  </section>

  <div class="mx-auto max-w-4xl px-4 pb-8">
<ul class="mt-6 w-full max-w-sm">
    {#each list as p: any}
      <li class="not-last:border-b py-2" transition:fly={{ y: 200, duration: 1000 }}>
        <p class="font-bold">
          <a href="https://maps.google.com/maps?q={p.patika}+{p.varos}+{p.irsz}" target="_blank" rel="noopener noreferrer" class="flex justify-between"><span>{p.patika}</span><span>📍</span></a>
        </p>
        <p>{p.irsz} {p.varos}</p>
        <p>{p.cim}</p>
      </li>
    {/each}
  </ul>
  </div>
</main>
<Nav2 actual={data.path} />
<Search articles={data.articleCount} recipes={data.recipeCount} />

<style>
  a {text-decoration: dotted underline !important;}
  .label { text-wrap-mode: break-word !important;}
</style>