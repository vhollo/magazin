<script>
  // Shared vertical article card – the one card look used site-wide by `Cards`
  // (article lists: home "latest", collections, /keres, /szerzok/{slug}, kvíz,
  // receptsarok category) and by the home `ExpertSection`.
  //   variant="excerpt" (default): kicker, title, 3-line lead, author, ≤2 tags.
  //   variant="compact" (ExpertSection): image, title, author; a card without an
  //     image shows the lead in the image's place (7 lines ≈ the image height).
  // Same surface everywhere: white card, shadow, rounded-sm, p-4 body.
  // `on:click` is forwarded from the main link (ExpertSection tracks it).
  /** @type {any} */
  export let card;
  /** @type {'excerpt' | 'compact'} */
  export let variant = "excerpt";

  const MAX_TAGS = 2;

  $: compact = variant === "compact";
  $: img = card?.img;
  $: href = card?.path ? `/${card.path}` : undefined;
  // The whole card body is one link, so links inside the kicker would nest:
  // keep their text (wrapping bare domains so they can break).
  $: kicker = compact
    ? ""
    : (card?.description ?? "").replace(
        /<a\b.*?\b[^>]*>(.*?)<\/a>/gi,
        (/** @type {string} */ _m, /** @type {string} */ p) =>
          p.indexOf(".") > -1 && p.indexOf(" ") == -1
            ? `<span class="break-all">${p}</span>`
            : p,
      );
  $: authors = (card?.tv?.szerzo ?? [])
    .map((/** @type {any} */ s) => s?.name)
    .filter(Boolean)
    .join(", ");
  $: showLead = Boolean(card?.ellipsis) && (!compact || !img);
  // Recipe cards carry a nutrition <table> as their lead: never cut it to 3 lines.
  $: hasTable = /<table/i.test(card?.ellipsis ?? "");
  $: tags = compact ? [] : (card?.tv?.tags ?? []).slice(0, MAX_TAGS);
  $: locked =
    (card?.tv?.tags?.includes("receptsarok") ||
      (typeof card?.path === "string" && card.path.startsWith("receptsarok/"))) &&
    !card?.free &&
    (card?.locked ?? true);
</script>

<!-- Not <article>: app.css styles article-body tables/figures via `article …`
     selectors, which would restyle the recipe nutrition table in the lead. -->
<div
  class="vcard card overflow-hidden rounded-sm bg-base-100 shadow-md transition-shadow duration-300 hover:shadow-lg"
>
  {#if card.video}
    <figure class="m-0">
      {@html card.video}
    </figure>
  {/if}

  {#snippet main()}
    {#if img && !card.video}
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
      {#if kicker}
        <p class="text-sm italic opacity-70">{@html kicker}</p>
      {/if}
      <div class="flex items-start justify-between gap-2">
        <svelte:element
          this={compact ? "h3" : "h2"}
          class={["display card-title block !mb-0 min-w-0 flex-1 leading-snug", compact ? "text-base" : "text-lg"]}
        >
          {@html card.longtitle || card.title}
        </svelte:element>
        {#if locked}
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-5 shrink-0 opacity-50" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
          </svg>
        {/if}
      </div>
      {#if showLead}
        <div class={["ellipsis text-sm opacity-80", compact ? "lead-compact" : !hasTable && "lead-excerpt"]}>
          {@html card.ellipsis}
        </div>
      {/if}
      {#if authors}
        <p class="text-sm font-medium text-secondary">{authors}</p>
      {/if}
    </div>
  {/snippet}
  {#if href}
    <a {href} class="flex grow flex-col" on:click>{@render main()}</a>
  {:else}
    <div class="flex grow flex-col">{@render main()}</div>
  {/if}

  {#if card.buttons || tags.length}
    <div class="card-actions justify-start px-4 pb-4">
      {#each Object.keys(card.buttons ?? {}) as btn}
        <a class="btn btn-sm btn-outline" href={card.buttons[btn]}>{btn}</a>
      {/each}
      {#each tags as tag}
        <small class="badge badge-outline badge-sm">{tag}</small>
      {/each}
    </div>
  {/if}
</div>

<style>
  figure,
  img {
    aspect-ratio: var(--imgratio);
    width: 100%;
  }
  .lead-excerpt {
    -webkit-line-clamp: 3;
    line-clamp: 3;
  }
  .lead-compact {
    -webkit-line-clamp: 7;
    line-clamp: 7;
  }
  .ellipsis :global(video) {
    display: none;
  }
</style>
