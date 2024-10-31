<script>
  export let card
  const base = 'https://www.diabetes.hu/'

  $: if (!card.introtext?.length && card.content) {
    //console.log(card.content)
    //const matches = card.content.match(/<(?!aside\b|h2\b|h3\b|ul\b|li\b)([a-zA-Z]+)\b[^>]*>[\s\S]*?<\/\1>/g)?.slice(0, 2);
    const matches = card.content.match(/<(?!img\b|h2\b|ul\b|li\b)([a-zA-Z]+)\b[^>]*>[\s\S]*?<\/\1>/g)?.slice(0, 2);
    card.ellipsis = matches.join('')
    //console.log(card.ellipsis)
  }
</script>

<aside class="card card-compact bg-base-300 shadow-xl">
  {#if card.img}
    <figure>
      <a href={`/${card.path}`}>
        <img style={`object-fit: cover; object-position: ${card.pos || 'center'}`} src={`${base}${card.img}`} alt="" width="928" height="548"/>
      </a>
    </figure>
  {:else}
    <figure><img class="w-full" src="/pixel.png" alt=""></figure>
  {/if}
  <div class="card-body justify-between">
    <a href={`/${card.path}`}>
      <h2 class="card-title">
        {@html card.longtitle || card.title}
      </h2>
      <div class="intro prose">
        {#if card.ellipsis}{@html card.ellipsis}{/if}
        {#if card.introtext}<p>{@html card.introtext}</p>{/if}
      </div>
    </a>
    <div class="card-actions">
      {#each card.tag as tag}
        <small class="badge badge-outline badge-sm">{tag}</small>
      {/each}
    </div>
  </div>
</aside>
