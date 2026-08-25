<script>
  // Author index — the public face of the `authors` collection.
  import { decodeHtmlEntities } from "$lib/htmlEntities.js";
  import { authorPhotoUrl } from "$lib/authors";

  export let data;

  const decode = (/** @type {string | undefined} */ value) =>
    decodeHtmlEntities(value ?? "");

  $: authors = data.authors ?? [];
</script>

<svelte:head>
  <title>Szerzőink | Diabetes</title>
  <meta
    name="description"
    content="A Diabetes magazin szerzői: orvosok, dietetikusok, gyógyszerészek, edukátorok."
  />
</svelte:head>

<main class="mx-auto w-full max-w-7xl px-4 py-10 sm:py-14">
  <header class="mb-8">
    <h1 class="display text-3xl sm:text-4xl">Szerzőink</h1>
    <p class="mt-2 text-base-content/70">
      {authors.length} szerző — orvosok, dietetikusok, gyógyszerészek, edukátorok.
    </p>
  </header>

  <ul class="grid list-none gap-6 p-0 sm:grid-cols-2 lg:grid-cols-3">
    {#each authors as author (author.slug)}
      <li class="m-0">
        <a
          href={`/szerzok/${author.slug}`}
          class="flex gap-4 rounded-sm bg-base-200 p-4 no-underline transition-shadow hover:shadow-md"
        >
          {#if author.photo}
            <img
              class="h-20 w-20 shrink-0 rounded-sm object-cover"
              src={authorPhotoUrl(author.photo)}
              alt={decode(author.displayName)}
              width="80"
              height="80"
              loading="lazy"
            />
          {/if}
          <span class="min-w-0">
            <span class="display block text-lg leading-snug"
              >{decode(author.displayName)}</span
            >
            {#if author.title}
              <small class="block text-base-content/70">{decode(author.title)}</small>
            {/if}
            {#if author.articleCount}
              <small class="block text-base-content/50"
                >{author.articleCount} cikk</small
              >
            {/if}
          </span>
        </a>
      </li>
    {/each}
  </ul>
</main>
