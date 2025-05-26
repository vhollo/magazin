<script lang="ts">
  export let card
  card.desc = card.description?.replace(/<a\b.*?\b[^>]*>(.*?)<\/a>/gi, (_m: string, p: string) => p.indexOf('.') > -1 && p.indexOf(' ') == -1 ? `<span class="break-all">${p}</span>` : p) || ''
</script>

{#if card.desc}
  <h4 class="italic">{@html card.desc}</h4>
{/if}
<h2 class="card-title block pb-2">
  {@html card.longtitle || card.title}
</h2>
<div class="ellipsis">{@html card.ellipsis}</div>

<style>
  .ellipsis :global(video) {
    display: none;
  }
</style>