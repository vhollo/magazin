<script>
  // Article byline box, rendered from the `authors/{slug}` record instead of the
  // raw MODX chunk HTML it replaced. Markup mirrors the old chunk (`#szerzo`
  // + `.nev` + `.cv`) so the existing grid in app.css — and the rule that hides a
  // hard-coded `.alairas` when a signature box is present — keep working.
  //
  // Fields are plain text with HTML entities (soft hyphens included), so they are
  // decoded here and rendered as text; nothing is passed to {@html}.
  import { decodeHtmlEntities } from "$lib/htmlEntities.js";
  import { authorPhotoUrl } from "$lib/authors";

  /** @type {import('$lib/authors').Author} */
  export let author;
  /** The first box on a page owns `id="szerzo"`; ids must stay unique. */
  export let first = true;

  const decode = (/** @type {string | undefined} */ value) =>
    decodeHtmlEntities(value ?? "");

  $: photo = authorPhotoUrl(author?.photo);
  $: titulus = [author?.title, ...(author?.affiliations ?? [])].filter(Boolean);
  $: support = author?.support;
</script>

{#if author}
  <div id={first ? "szerzo" : undefined} class="szerzo cv">
    {#if photo}
      <img src={photo} alt={decode(author.displayName)} width="120" loading="lazy" />
    {/if}
    <h3 class="nev">
      {#if author.slug}
        <a href={`/szerzok/${author.slug}`}>{decode(author.displayName)}</a>
      {:else}
        {decode(author.displayName)}
      {/if}
    </h3>
    <!-- Titulus block: in the source chunks these lines were one paragraph broken
         by <br> (titulus, society role, institution), so they render as one unit —
         `.cv` is for the CV prose that follows. -->
    {#each titulus as line}
      <p class="titulus">{decode(line)}</p>
    {/each}
    {#each author.cv ?? [] as paragraph}
      <p class="cv">{decode(paragraph)}</p>
    {/each}
    {#if author.quote}
      <p class="cv idezet">{decode(author.quote)}</p>
    {/if}
    {#if author.email || author.links?.length}
      <p class="cv kapcsolat">
        {#if author.email}
          <a href={`mailto:${author.email}`}>{author.email}</a>
        {/if}
        {#each author.links ?? [] as link}
          <a href={link.url} rel="external noopener">{decode(link.label) || link.url}</a>
        {/each}
      </p>
    {/if}
    {#if support}
      <aside class="cv tamogatas">
        {#if support.logo}
          <img class="logo" src={authorPhotoUrl(support.logo)} alt="" width="120" loading="lazy" />
        {/if}
        {#each support.lines ?? [] as line}
          <span>{decode(line)}</span>
        {/each}
        {#each support.links ?? [] as link}
          <a href={link.url} rel="external noopener">{decode(link.label) || link.url}</a>
        {/each}
        {#if support.email}
          <a href={`mailto:${support.email}`}>{support.email}</a>
        {/if}
      </aside>
    {/if}
  </div>
{/if}
