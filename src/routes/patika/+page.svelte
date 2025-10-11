<script module>
  import MiniSearch from 'minisearch'
  import Search from '$lib/components/Search.svelte';
  import Nav2 from '$lib/components/Nav2.svelte';
  import { fade, fly } from 'svelte/transition';
</script>
<script lang="ts">
  import type { PageProps } from "./$types";
  const { data }: PageProps = $props()
  // console.log('data',data.doc.patikas)
  const patikas = data.doc.patikas
  // console.log('patikas2',patikas.length)

  const miniSearch = new MiniSearch({
    idField: 'patika',
    fields: ['irsz', 'varos', 'cegnev', 'cim', 'patika'],
    storeFields: ['patika', 'irsz', 'varos', 'cim', 'email'],
    // processTerm: (term, _fieldName) => term.toLowerCase(),
  })
  miniSearch.addAll(patikas)

  let query = $state('')

	let list: any[] = $derived(query ? miniSearch.search(query, { fuzzy: 0.4 }) : patikas)
</script>

<svelte:head>
  <title>{(data.doc.title ? data.doc.title + ' • ' : '') + data.conf.sitename}</title>
  <meta name="description" content="Keresőnkkel megtalálhatja az Önhöz legközelebb eső gyógyszertárat, ahol a Diabetes és/vagy Hypertonia betegtájékoztató magazin elérhető."/>
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

<main class="bg-base-300 px-2">
  <article class="prose mt-16 mb-8 w-full mx-auto flex-none">
    <h1 class="text-center">Gyógyszertárkereső</h1>
    <!-- <h2 class="text-center">{kviz.title}</h2> -->
    <p class="text-center">Keresőnkkel megtalálhatja az Önhöz legközelebb eső gyógyszertárat, ahol a Diabetes és/vagy Hypertonia betegtájékoztató magazin elérhető.</p>
  <form class="form-control w-full max-w-md mx-auto">
    <!-- svelte-ignore a11y_label_has_associated_control -->
    <p class="label">
      Keressen gyógyszertárat név, cím, város vagy irányítószám alapján
    </p>
    <input type="text" placeholder="Keresés" class="input input-bordered w-full max-w-sm" bind:value={query} />
  </form>
</article>
<ul class="w-full max-w-sm mx-auto mt-4 mb-8">
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
</main>
<Search count={data.count}/>
<Nav2 actual={data.path}/>

<style>
  a {text-decoration: dotted underline !important;}
  label { text-wrap-mode: break-word !important;}
</style>