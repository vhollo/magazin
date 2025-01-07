<script>
  import CardBody from '$lib/components/CardBody.svelte'
  export let card
  //const PUBLIC_BASE_URL = 'https://www.diabetes.hu/'
  import { PUBLIC_BASE_URL } from '$env/static/public'
  import Cards from './Cards.svelte'

  /*$: {
    if (card.img) {
      card.ext = card.img.split('.').pop()
      //console.log(ext)
    }
    card.ellipsis = ''
    if (!card.introtext?.length && card.content) {
      const regex = /(?:<h2\b.*?>(.*?)<\/h2>\s*)?<h4[^>]*class=["'][^"']*introtext[^"']*["'][^>]*>([\s\S]*?)<\/h4>/g;

      //card.ellipsis = ''
      let match
      while ((match = regex.exec(card.content)) !== null) {
        const h2 = match[1] ? match[1].trim() : null
        const introtext = match[2].trim()
        card.ellipsis += h2 && `<p class="intro"><b>${h2}</b><br>${introtext}</p>` || ''//introtext || card.content
      }

      if (!card.ellipsis) card.ellipsis = card.content.match(/<(?!aside\b|figure\b|img\b|h2\b|h3\b|ul\b|li\b)(.*?)\b[^>]*>[\s\S]*?<\/\1>/g)?.slice(0, 2).join('')
    }
    //if (card.id == '424') console.log(card.ellipsis)
  }*/
</script>

<!--<aside class:double={card.img} class:triple={card.ellipsis?.indexOf('<video') !== -1} class="card card-compact bg-base-100 shadow-xl">-->
  {#if card.video}
    <figure>
      {#if card.path}
        <a href={`/${card.path}`}>
          <!--<img style={`object-fit: ${card.ext == 'png' ? 'contain' : 'cover'}; object-position: ${card.pos || '50% 40%'}`} src={`${PUBLIC_BASE_URL}${card.img}`} alt="" width="928" height="548"/>-->
          <img 
            style={`object-fit: ${card.ext == 'png' ? 'contain' : 'cover'}; object-position: ${card.pos || '50% 40%'}`} 
            src={`${card.img}`} 
            alt="" width="928" height="548"
          />
        </a>
      {:else}
        <img 
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
            style={`object-fit: ${card.img.ext == 'png' ? 'contain' : 'cover'}; object-position: ${card.img.pos || '50% 40%'}`} 
            src={`${card.img.src}`} 
            alt="" width="928" height="548"
          />
        </a>
      {:else}
        <img 
          style={`object-fit: ${card.ext == 'png' ? 'contain' : 'cover'}; object-position: ${card.pos || '50% 40%'}`} 
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
    <a href={`/${card.path}`} class="card-body gap-3 grow-0 p-0">
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
    <div class="card-body gap-3 grow-0 p-0">
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