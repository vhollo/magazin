<script>
  // Author index — the public face of the `authors` collection.
  import Search from "$lib/components/Search.svelte";
  import Nav2 from '$lib/components/Nav2.svelte'
  import { decodeHtmlEntities } from "$lib/htmlEntities.js";
  import { authorPhotoUrl } from "$lib/authors";

  export let data;

  const decode = (/** @type {string | undefined} */ value) =>
    decodeHtmlEntities(value ?? "");

  $: authors = data.authors ?? [];

  // Client-side filter: the whole list is already on the page, and 150-odd names
  // are nothing to scan. Accents are folded so "adam" finds "Ádám", and every
  // typed word has to match somewhere, in any order ("agnes adam" is fine).
  let query = "";

  const fold = (/** @type {string} */ value) =>
    decode(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

  $: haystacks = new Map(
    authors.map((author) => [
      author.slug,
      fold(
        [author.displayName, author.name, author.title, ...(author.affiliations ?? [])]
          .filter(Boolean)
          .join(" "),
      ),
    ]),
  );
  $: terms = fold(query).split(/\s+/).filter(Boolean);
  $: shown = terms.length
    ? authors.filter((author) =>
        terms.every((term) => (haystacks.get(author.slug) ?? "").includes(term)),
      )
    : authors;
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
    <form class="form-control mt-6 w-full max-w-md" on:submit|preventDefault>
      <label class="label" for="szerzo-kereso">
        Keress szerzőt név, titulus vagy intézmény alapján
      </label>
      <div class="flex items-center gap-3">
        <input
          id="szerzo-kereso"
          type="search"
          placeholder="Keresés"
          autocomplete="off"
          class="input input-bordered w-full max-w-sm"
          bind:value={query}
        />
        {#if terms.length}
          <small class="whitespace-nowrap text-base-content/70">
            {shown.length} találat
          </small>
        {/if}
      </div>
    </form>
  </header>

  <ul class="grid list-none gap-6 p-0 sm:grid-cols-2 lg:grid-cols-3">
    {#each shown as author (author.slug)}
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

  {#if terms.length && !shown.length}
    <p class="py-8 text-base-content/70">
      Nincs találat erre: <strong>{query}</strong>. Próbáld a szerző vezetéknevével.
    </p>
  {/if}
</main>

<Nav2 actual="/szerzok" />
<Search articles={data.articleCount} recipes={data.recipeCount} />
