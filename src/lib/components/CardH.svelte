<script>
  import CardBody from '$lib/components/CardBody.svelte'
  export let card
</script>

<a href={`/${card.path}`} class="card xs:card-side w-full max-w-prose mx-auto rounded-none">
  <div class="card-body p-0 order-1 xs:order-0">
    <CardBody {card}/>
  </div>
  {#if card.video}
    <figure class="basis-[200px] shrink-0 m-0 xs:ml-2 w-full h-[200px] xs:h-[160px]">
      {@html card.video}
    </figure>
  {:else if card.img}
    <img loading="lazy" class="basis-[200px] shrink-0 m-0 xs:ml-2 w-full h-[200px] xs:w-[200px]" style={`object-fit: ${card.img.ext == 'png' ? 'contain' : 'cover'}; object-position: ${card.img.pos || '50% 40%'}`} src={`${card.img.src}`} alt="">
  {/if}
</a>