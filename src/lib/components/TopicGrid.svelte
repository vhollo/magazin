<script>
  // Home "Böngésszen témák szerint" topic grid (homepage redesign 2026, F3.5) —
  // visual entry to the nav2 category structure, each card listing its
  // sub-topic links as chips.
  import { nav2 } from "$lib/nav2.js";

  const categories = Object.entries(nav2);
</script>

<section class="mx-auto max-w-6xl px-4 py-10 sm:py-14">
  <header class="mb-6">
    <h2 class="display text-2xl sm:text-3xl">Böngésszen témák szerint</h2>
  </header>
  <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {#each categories as [name, subcats] (name)}
      <div class="topic card rounded-sm bg-base-200 p-4">
        <h3 class="display mb-3 text-lg">{name}</h3>
        <ul class="flex flex-wrap gap-2">
          {#each Object.entries(subcats) as [subName, href] (href)}
            <li>
              <a class="chip" {href}>{subName}</a>
            </li>
          {/each}
        </ul>
      </div>
    {/each}
  </div>
</section>

<style>
  .chip {
    display: inline-block;
    padding: 0.3rem 0.75rem;
    border: 1px solid
      color-mix(in oklch, var(--color-base-content) 25%, transparent);
    border-radius: 9999px;
    font-size: 0.8rem;
    line-height: 1.4;
    text-decoration: none;
    transition:
      border-color 0.2s ease,
      color 0.2s ease,
      background-color 0.2s ease;
  }
  .chip:hover,
  .chip:focus-visible {
    border-color: var(--color-secondary);
    color: var(--color-secondary);
    background-color: color-mix(
      in oklch,
      var(--color-secondary) 8%,
      transparent
    );
  }
</style>
