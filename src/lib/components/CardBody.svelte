<script lang="ts">
  export let card
  card.desc = card.description?.replace(/<a\b.*?\b[^>]*>(.*?)<\/a>/gi, (_m: string, p: string) => p.indexOf('.') > -1 && p.indexOf(' ') == -1 ? `<span class="break-all">${p}</span>` : p) || ''
</script>

{#if card.desc}
  <h4 class="italic">{@html card.desc}</h4>
{/if}
<div class="flex items-start justify-between gap-2 pb-2">
  <h2 class="card-title block !mb-0 flex-1 min-w-0">
    {@html card.longtitle || card.title}
  </h2>
  {#if card.tv?.tags?.includes('receptsarok') && !card.free && (card.locked ?? true)}
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-5 shrink-0 opacity-50" aria-hidden="true">
      <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
    </svg>
  {/if}
</div>
<div class="ellipsis">{@html card.ellipsis}</div>

<style>
  .ellipsis :global(video) {
    display: none;
  }
</style>