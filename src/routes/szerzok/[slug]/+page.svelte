<script>
  // Author profile: the full record, plus the articles they wrote.
  import Cards from "$lib/components/Cards.svelte";
  import Search from "$lib/components/Search.svelte";
  import { decodeHtmlEntities } from "$lib/htmlEntities.js";
  import { authorPhotoUrl } from "$lib/authors";

  export let data;

  const decode = (/** @type {string | undefined} */ value) =>
    decodeHtmlEntities(value ?? "");

  $: author = data.author;
  $: cards = data.cards ?? [];
  $: photo = authorPhotoUrl(author?.photo);
  $: titulus = [author?.title, ...(author?.affiliations ?? [])].filter(Boolean);
  $: description = [author?.title, ...(author?.cv ?? [])]
    .filter(Boolean)
    .map((line) => decode(line))
    .join(" ")
    .slice(0, 300);
</script>

<svelte:head>
  <title>{decode(author.displayName)} | Diabetes</title>
  <meta name="description" content={description || decode(author.displayName)} />
  <meta name="author" content={decode(author.displayName)} />
</svelte:head>

<main class="mx-auto w-full max-w-7xl px-4 py-10 sm:py-14">
  <article class="prose max-w-none">
    <header class="flex flex-wrap items-start gap-6 not-prose">
      {#if photo}
        <img
          class="w-32 shrink-0 rounded-sm"
          src={photo}
          alt={decode(author.displayName)}
          width="128"
          loading="eager"
        />
      {/if}
      <div class="min-w-0">
        <h1 class="display text-3xl sm:text-4xl">{decode(author.displayName)}</h1>
        <!-- Titulus block: one unit, no gaps between the lines. -->
        {#if titulus.length}
          <div class="mt-1 text-base-content/70">
            {#each titulus as line}
              <p class="m-0">{decode(line)}</p>
            {/each}
          </div>
        {/if}
        {#if author.email || author.links?.length}
          <p class="mt-2 flex flex-wrap gap-x-4 text-sm">
            {#if author.email}
              <a href={`mailto:${author.email}`}>{author.email}</a>
            {/if}
            {#each author.links ?? [] as link}
              <a href={link.url} rel="external noopener"
                >{decode(link.label) || link.url}</a
              >
            {/each}
          </p>
        {/if}
      </div>
    </header>

    {#each author.cv ?? [] as paragraph}
      <p>{decode(paragraph)}</p>
    {/each}

    {#if author.quote}
      <blockquote>{decode(author.quote)}</blockquote>
    {/if}

    {#if author.support}
      <aside class="not-prose mt-8 rounded-sm bg-base-200 p-4 text-sm">
        {#if author.support.logo}
          <img
            class="mb-2 w-28"
            src={authorPhotoUrl(author.support.logo)}
            alt=""
            width="112"
            loading="lazy"
          />
        {/if}
        {#each author.support.lines ?? [] as line}
          <span class="block">{decode(line)}</span>
        {/each}
        {#each author.support.links ?? [] as link}
          <a class="mr-4" href={link.url} rel="external noopener"
            >{decode(link.label) || link.url}</a
          >
        {/each}
        {#if author.support.email}
          <a href={`mailto:${author.support.email}`}>{author.support.email}</a>
        {/if}
      </aside>
    {/if}
  </article>

  {#if cards.length}
    <section class="mt-12">
      <h2 class="display mb-6 text-2xl">Cikkei</h2>
      <Cards {cards} moreLabel="További cikkei" />
    </section>
  {/if}
</main>

<Search articles={data.articleCount} recipes={data.recipeCount} />
