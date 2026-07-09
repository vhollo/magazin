<script>
  // Home "Válogatás szakértőinktől" rail (homepage redesign 2026, F3.2).
  // Renders a slice of `collections/home.expertCards` — the Hero already shows
  // the newest one, so the page typically passes `expertCards.slice(1)`.
  import { trackEvent } from "$lib/analytics";

  /** @type {import('$lib/modx/collections').ThinCard[]} */
  export let cards = [];

  /**
   * @param {import('$lib/modx/collections').ThinCard} card
   * @returns {{ src?: string, pos?: string, ext?: string } | null | undefined}
   */
  const cardImg = (card) => /** @type {any} */ (card?.img);

  /** @param {import('$lib/modx/collections').ThinCard} card */
  const cardAuthors = (card) =>
    (card.tv?.szerzo ?? [])
      .map((s) => s?.name)
      .filter(Boolean)
      .join(", ");
</script>

{#if cards.length}
  <section class="mx-auto max-w-6xl px-4 py-10 sm:py-14">
    <header class="mb-6 flex items-baseline justify-between gap-4">
      <h2 class="display text-2xl sm:text-3xl">Válogatás szakértőinktől</h2>
      <!-- <span class="badge badge-outline badge-secondary hidden sm:inline-flex"
        >Dr.</span
      > -->
    </header>
    <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {#each cards as card (card.id)}
        {@const img = cardImg(card)}
        {@const authors = cardAuthors(card)}
        <a
          href={`/${card.path}`}
          class="pick card overflow-hidden rounded-sm bg-base-100 shadow-md transition-shadow duration-300 hover:shadow-lg"
          on:click={() =>
            trackEvent("expert_card_click", { path: String(card.path ?? "") })}
        >
          {#if img}
            <figure class="m-0">
              <img
                loading="lazy"
                src={img.src}
                alt=""
                width="928"
                height="548"
                style={`object-fit: ${img.ext == "png" ? "contain" : "cover"}; object-position: ${img.pos || "50% 40%"}`}
              />
            </figure>
          {/if}
          <div class="card-body gap-1.5 p-4">
            <h3 class="display card-title block text-base leading-snug">
              {@html card.longtitle || card.title}
            </h3>
            {#if authors}
              <p class="text-sm font-medium text-secondary">{authors}</p>
            {/if}
          </div>
        </a>
      {/each}
    </div>
  </section>
{/if}

<style>
  .pick figure,
  .pick img {
    aspect-ratio: var(--imgratio);
    width: 100%;
  }
</style>
