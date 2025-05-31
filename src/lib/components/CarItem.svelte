<script>
  import CardBody from '$lib/components/CardBody.svelte'
  export let card
  import { PUBLIC_BASE_URL } from '$env/static/public'

</script>

<!--<aside class:double={card.img} class:triple={card.ellipsis?.indexOf('<video') !== -1} class="card card-sm bg-base-100 shadow-xl">-->
  {#if card.video}
    <figure>
      {#if card.path}
        <a href={`/${card.path}`}>
          <!--<img style={`object-fit: ${card.ext == 'png' ? 'contain' : 'cover'}; object-position: ${card.pos || '50% 40%'}`} src={`${PUBLIC_BASE_URL}${card.img}`} alt="" width="928" height="548"/>-->
          <img  
            -loading="lazy"
            style={`object-fit: ${card.ext == 'png' ? 'contain' : 'cover'}; object-position: ${card.pos || '50% 40%'}`} 
            src={`${card.img}`} 
            alt="" width="928" height="548"
          />
        </a>
      {:else}
        <img 
          -loading="lazy"
          style={`object-fit: ${card.ext == 'png' ? 'contain' : 'cover'}; object-position: ${card.pos || '50% 40%'}`} 
          src={`${card.img}`} 
          alt="" width="928" height="548"
        />
      {/if}
    </figure>
  {:else if card.img}
    <figure>
      {#if card.path}
        <a href={`/${card.path}`}>
          <!--<img style={`object-fit: ${card.ext == 'png' ? 'contain' : 'cover'}; object-position: ${card.pos || '50% 40%'}`} src={`${PUBLIC_BASE_URL}${card.img}`} alt="" width="928" height="548"/>-->
          <img 
            -loading="lazy"
            style={`object-fit: ${card.img.ext == 'png' ? 'contain' : 'cover'}; object-position: ${card.img.pos || '50% 40%'}`} 
            src={`${card.img.src}`} 
            alt="" width="928" height="548"
          />
        </a>
      {:else}
        <img 
          -loading="lazy"
          style={`object-fit: ${card.img.ext == 'png' ? 'contain' : 'cover'}; object-position: ${card.img.pos || '50% 40%'}`} 
          src={`${card.img.src}`} 
          alt="" width="928" height="548"
        />
      {/if}
    </figure>
  {:else}
    <!--<figure class="empty">
      <a href={`/${card.path}`}>
        <img src="/pixel.png" alt="" width="928" height="548">
      </a>
    </figure>-->
  {/if}

  {#if card.path}
    <a href={`/${card.path}`} class="card-body grow-0 gap-3 p-4">
      <CardBody {card}/>
    </a>
    <div class="card-actions justify-end p-0 mt--auto">
      {#if card.buttons}
      {#each Object.keys(card.buttons) as btn}
      <a class="btn btn-sm btn-outline" href={card.buttons[btn]}>{btn}</a>
      {/each}
      {/if}
      {#each card.tags as tag}
        <!--<a class="badge badge-outline badge-sm" href={tag}>{tag}</a>-->
        <small class="badge badge-outline badge-sm">{tag}</small>
      {/each}
      <!-- <small class="badge badge-outline badge-sm">{card.rank}</small> -->
    </div>
  {:else}
    <div class="card-body grow-0 gap-3 p-4">
      <CardBody {card}/>
    </div>
    <div class="card-actions justify-end p-2 mt--auto">
      {#if card.buttons}
      {#each Object.keys(card.buttons) as btn}
        <a class="btn btn-sm btn-outline" href={card.buttons[btn]}>{btn}</a>
      {/each}
      {/if}
      {#each card.tags as tag}
        <!--<a class="badge badge-outline badge-sm" href={tag}>{tag}</a>-->
        <small class="badge badge-outline badge-sm">{tag}</small>
      {/each}
      <!-- <small class="badge badge-outline badge-sm">{card.rank}</small> -->
    </div>
  {/if}
<!--</aside>-->

<style>
  figure, img {
    aspect-ratio: var(--imgratio);
  }
</style>