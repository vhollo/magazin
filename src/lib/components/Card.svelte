<script>
  export let doc
  const base = 'https://www.diabetes.hu/'
</script>

<div class="card card-compact bg-base-300 shadow-xl">
  {#if doc.tvs.img}
    <figure>
      <a href={`/${doc.path}`}>
        <img style={`object-fit: cover; object-position: ${doc.tvs.pos || 'center'}`} src={`${base}${doc.tvs.img}`} alt="" width="928" height="548"/>
      </a>
    </figure>
  {/if}
  <a href={`/${doc.path}`} class="card-body prose">
    <h2 class="card-title gap-0"><a href={`/${doc.path}`}>
      {@html doc.longtitle || doc.title}
      <!--<div class="badge badge-secondary">NEW</div>-->
    </h2>
    <p>{@html doc.introtext}</p>
    <div class="card-actions justify-end">
      {#each doc.tvs.tag as tag}
      <div class="badge badge-outline">{tag}</div>
      {/each}
    </div>
  </a>
</div>

<style>
  .card a {
    text-decoration: none;
  }
</style>