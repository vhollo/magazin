<script>
  export let card
  const base = 'https://www.diabetes.hu/'
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
      <h2 class="card-title gap-0">
        {@html card.longtitle || card.title}
      </h2>
      <div class="intro">
        <p>{@html card.introtext || card.content}</p>
      </div>
    </a>
    <div class="card-actions">
      {#each card.tag as tag}
        <small class="badge badge-outline badge-sm">{tag}</small>
      {/each}
    </div>
  </div>
</aside>

<style>
  .card a {
    text-decoration: none;
  }
  
  /* OVERFLOW w/ ELLIPSIS */
  .intro {
    overflow: hidden;
    /*margin-right: -1ch;*/
  }
  .intro p {
    display: -webkit-box;
    -webkit-line-clamp: 7;
    -webkit-box-orient: vertical; 
    margin: 0; 
  }
  /*.intro p {
    --max-lines: 7;
    position: relative;
    max-height: calc(var(--lh-card) * var(--max-lines));
    overflow-y: hidden;
    padding-right: 1ch;
  }*/
  /*.intro p::before {
    position: absolute;
    content: "…";
    bottom: 0;
    right: 0;
  }
  .intro p::after {
    content: "";
    position: absolute;
    right: 0;
    width: 1rem;
    height: 1rem;
  }*/

</style>