<script lang="ts">
  /**
   * Reading column of a single content page (magazine article and Receptsarok recipe):
   * a `.prose` column at its 65ch measure, plus an optional ad rail of side banners on
   * ≥ md screens. The pair is centred as one composition (the documented exception to the
   * site's left rail — see AGENTS.md › Page shell). Without banners the column is centred
   * alone.
   */
  import type { Snippet } from 'svelte'
  import BannerSide from '$lib/components/BannerSide.svelte'

  let {
    banners = [],
    children,
  }: {
    /** Side banners for the rail (`conf.side_banners` filtered to `prominent`). */
    banners?: any[]
    children: Snippet
  } = $props()
</script>

<main class="reading-layout bg-base-100 md:flex flex-row justify-center gap-8 px-4">
  <article class="prose py-12 flex-1">
    {@render children()}
  </article>

  {#if banners.length}
    <section class="adrail max-md:hidden flex flex-col flex-0 gap-2 py-12 mx-auto md:mx-0">
      {#each banners as banner, i (i)}
        <aside>
          <BannerSide {banner} />
        </aside>
      {/each}
    </section>
  {/if}
</main>

<style>
  /* The ad rail beside the reading column. Class-scoped (not a bare `section`
     selector): a bare element selector once captured a listing band on the
     article route and pinned it to a 300px stub. */
  .adrail {
    min-width: 24ch;
    width: calc((100% - 65ch) / 2);
  }
  .adrail aside {
    position: unset;
    min-height: 20ch;
    margin-bottom: 3rem;
  }
</style>
