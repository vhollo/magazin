<script>
  // Home "Válogatás szakértőinktől" rail (homepage redesign 2026, F3.2).
  // Renders `collections/home.expertCards` minus the one the Hero already shows
  // (the newest pick with an image), as passed in by `+page.svelte`, with the
  // shared `CardV` card in its compact variant (same look as the article lists).
  // The home top banner sits after the first desktop row (FIRST_ROW cards), so
  // the hero is followed by content rather than by an ad.
  import { trackEvent } from "$lib/analytics";
  import BannerTop from "$lib/components/BannerTop.svelte";
  import CardV from "$lib/components/CardV.svelte";

  /** @type {import('$lib/modx/collections').ThinCard[]} */
  export let cards = [];
  /** `conf.top_banners`; rendered between the first row and the rest. */
  /** @type {any[]} */
  export let banners = [];

  const FIRST_ROW = 4; // lg:grid-cols-4
  // The first row, then the rest; the banner goes between the two grids.
  $: groups = [cards.slice(0, FIRST_ROW), cards.slice(FIRST_ROW)].filter(
    (g) => g.length,
  );
</script>

{#if cards.length}
  <section class="mx-auto w-full max-w-7xl px-4 py-10 sm:py-14">
    <header class="mb-6 flex items-baseline justify-between gap-4">
      <h2 class="display text-2xl sm:text-3xl">Válogatás szakértőinktől</h2>
      <a
        href="/szerzok"
        class="link link-hover shrink-0 text-sm font-medium text-secondary sm:text-base"
        on:click={() => trackEvent("expert_authors_click", { source: "home" })}
        >Szerzőink →</a
      >
    </header>
    {#each groups as group, i}
      <div class={["grid gap-6 sm:grid-cols-2 lg:grid-cols-4", i > 0 && !banners.length && "mt-6"]}>
        {#each group as card (card.id)}
          <CardV
            {card}
            variant="compact"
            on:click={() =>
              trackEvent("expert_card_click", { path: String(card.path ?? "") })}
          />
        {/each}
      </div>
      {#if i === 0 && banners.length}
        <BannerTop {banners} />
      {/if}
    {/each}
  </section>
{/if}
