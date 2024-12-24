<script>
  export let card
</script>

{#if card.desc}<h4 class="italic">{@html card.desc}</h4>{/if}
<h2 class="card-title">
  {@html card.longtitle || card.title}
</h2>
{#if card.introtext}
  <p class="intro">{@html card.introtext}</p>
{:else}
  <div class="ellipsis">{@html card.ellipsis}</div>
{/if}
