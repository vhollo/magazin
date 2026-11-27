<script lang="ts">
  /**
   * Shared header of a single content page — the magazine article (`/[...path]`) and the
   * Receptsarok recipe (`/receptsarok/[year]/[id]`) render the same anatomy with the same
   * typography (styles: `.content-header` in `src/app.css`):
   *
   *   felcím (kicker)  → `kicker` snippet, e.g. a breadcrumb, or `kickerHtml` (MODX `description`)
   *   title            → `<h1>`, the only heading in the header
   *   bevezető (lead)  → `<div class="introtext lead">`. A div, not a <p>: the MODX `introtext`
   *                      column holds HTML, and a few leads contain `<p>`/`<ul>`/`<blockquote>`,
   *                      which a <p> wrapper would break (the browser closes the outer <p>).
   *   byline           → authors (linked when `href` is set) · meta items (date, category…)
   *   badges           → tags / servings / „ingyenes”
   *
   * It is `not-prose`: it sits at the top of the `.prose` reading column but sets its own
   * type, so the article and the recipe can't drift apart through prose heading rules.
   */
  import type { Snippet } from 'svelte'

  type Author = { name: string; href?: string }
  type MetaItem = { text: string; title?: string; mark?: string }
  type Badge = { label: string; tone?: 'outline' | 'success' }

  let {
    kicker,
    kickerHtml = '',
    title,
    titleHtml = false,
    lead = '',
    authors = [],
    meta = [],
    badges = [],
  }: {
    kicker?: Snippet
    kickerHtml?: string
    title: string
    /** `title` is trusted HTML (MODX `longtitle` may carry `<sup>` etc.); otherwise plain text. */
    titleHtml?: boolean
    lead?: string
    authors?: Author[]
    meta?: MetaItem[]
    badges?: Badge[]
  } = $props()

  const metaItems = $derived(meta.filter((item) => item.text))
</script>

<header class="content-header not-prose">
  {#if kicker}
    <div class="felcim">{@render kicker()}</div>
  {:else if kickerHtml}
    <p class="felcim">{@html kickerHtml}</p>
  {/if}

  <h1 class="display text-3xl leading-tight text-balance sm:text-4xl">
    {#if titleHtml}{@html title}{:else}{title}{/if}
  </h1>

  {#if lead}
    <div class="introtext lead">{@html lead}</div>
  {/if}

  {#if authors.length || metaItems.length}
    <p class="byline">
      {#each authors as author, i (i)}
        {#if author.href}
          <a class="szerzo-link" href={author.href}>{author.name}</a>
        {:else}
          <span class="szerzo-nev">{author.name}</span>
        {/if}{#if i + 1 < authors.length}<span class="sep">, </span>{/if}
      {/each}
      {#each metaItems as item, i (i)}
        {#if authors.length || i > 0}<span class="sep" aria-hidden="true"> · </span>{/if}
        <span title={item.title || undefined}>{item.text}{#if item.mark}<sup>{item.mark}</sup>{/if}</span>
      {/each}
    </p>
  {/if}

  {#if badges.length}
    <ul class="badges" aria-label="Címkék">
      {#each badges as badge, i (i)}
        <li class="badge badge-sm {badge.tone === 'success' ? 'badge-success' : 'badge-outline'}">
          {badge.label}
        </li>
      {/each}
    </ul>
  {/if}
</header>
