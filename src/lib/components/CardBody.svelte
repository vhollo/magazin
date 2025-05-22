<script>
  export let card
  /* if (!card.introtext?.length && !card.ellipsis) {
    card.ellipsis = card.content.match(/<(?!aside\b|figure\b|video\b|div\b|img\b|h2\b|h3\b|ul\b|li\b)(.*?)\b[^>]*>[\s\S]*?<\/\1>/g)?.slice(0, 1).join('')
    card.table = card.ellipsis?.indexOf('<table') > -1
    card.video = card.content.match(/<video\b(.*?)\b[^>]*>[\s\S]*?<\/video>/g)?.join('')
    // console.log(doc)
  } else if (card.introtext.indexOf('<p') == 0) {
    card.ellipsis = card.introtext
  } */
</script>

{#if card.description}
  <h4 class="italic">{@html card.description}</h4>
{/if}
<h2 class="card-title block pb-2">
  {@html card.longtitle || card.title}
</h2>
<div class="ellipsis">{@html card.ellipsis}</div>

<!-- {#if card.ellipsis}
  <div class="ellipsis">{@html card.ellipsis}</div>
{:else}
  <p class="intro">{@html card.introtext}</p>
{/if} -->

<style>
  .ellipsis :global(video) {
    display: none;
  }
</style>