<script lang="ts">
  import { browser } from '$app/environment'
  import { authUser } from '$lib/authStore';
  import {
	//blur,
	//crossfade,
	//draw,
	fade,
	//fly,
	//scale,
	//slide
} from 'svelte/transition'
  import CardV from '$lib/components/CardV.svelte'
  import CardH from '$lib/components/CardH.svelte'
  export let docs, full = true
  //console.log({docs})
  
  $: for (let doc of docs) {
    if (!doc.introtext?.length && !doc.ellipsis) {
      doc.ellipsis = doc.content.match(/<(?!aside\b|figure\b|img\b|h2\b|h3\b|ul\b|li\b)(.*?)\b[^>]*>[\s\S]*?<\/\1>/g)?.slice(0, 3).join('')
      doc.table = doc.ellipsis?.indexOf('<table') > -1
      doc.video = doc.content.match(/<video\b(.*?)\b[^>]*>[\s\S]*?<\/video>/g)?.slice(0, 100).join('')
    }
    //if (doc.id == '424') console.log(doc.ellipsis)
  }
</script>

{#if full}
  <section class="grid gap-x-6 gap-y-0 px-4 py-6">
    {#each docs as doc, i}
      <aside in:fade={{ duration: 1000 }} class:double={doc.img || doc.video} class:triple={doc.description && (doc.img || doc.video)} class="card gap-4" style="order:{i+1}">
        <CardV card={doc}/>
      </aside>
    {/each}
    {#if !$authUser && browser}
      <aside class="card rounded-smgap-4 bg-base-100" style="order:0">
        <h1 class="card-body">HIRDETÉS</h1>
      </aside>
      <aside class="card rounded-smgap-4 bg-base-100" style="order:4">
        <h1 class="card-body">HIRDETÉS</h1>
      </aside>
      <aside class="card rounded-smgap-4 bg-base-100" style="order:8">
        <h1 class="card-body">HIRDETÉS</h1>
      </aside>
      <aside class="card rounded-smgap-4 bg-base-100" style="order:12">
        <h1 class="card-body">HIRDETÉS</h1>
      </aside>
      <aside class="card rounded-smgap-4 bg-base-100" style="order:16">
        <h1 class="card-body">HIRDETÉS</h1>
      </aside>
    {/if}
  </section>
{:else}
<section class="flex flex-wrap gap-x-6 gap-y-8 px-4 py-6">
  {#each docs as doc}
    <CardH card={doc}/>
  {/each}
</section>
{/if}

<style>
  section {
    grid-template-columns: repeat(auto-fill, minmax(24ch, 1fr));
    grid-auto-rows: auto;
    grid-auto-flow: dense;
    grid-template-rows: masonry;
    /*transition: height 0.25s ease-in;
    overflow-y: clip;
    transition-behavior: allow-discrete;
    height: calc(auto);*/
  }
  aside {
    position: unset;
    min-height: 20ch;
    /* grid-row-end: span 3; */
    margin-bottom: 3rem;
  }
  aside.double {
    grid-row-end: span 2;
  }
  aside.triple {
    grid-row-end: span 2;
  }
  /* aside.triple :global(figure) {
    display: none;
  } */
  /* :global(aside.triple:has(figure)) {
    grid-row-end: span 2;
  } */
</style>
  