<script>
  export let card
  const base = 'https://www.diabetes.hu/'

  $: if (!card.introtext?.length && card.content) {
    //console.log(card.id)
    //const matches = card.content.match(/<(?!aside\b|h2\b|h3\b|ul\b|li\b)([a-zA-Z]+)\b[^>]*>[\s\S]*?<\/\1>/g)?.slice(0, 2);
    //const matches = card.content.match(/<(?!aside\b|figure\b|img\b|h2\b|ul\b|li\b)([a-zA-Z]+)\b[^>]*>[\s\S]*?<\/\1>/g)?.slice(0, 2);
    //let matches = card.content.match(/^(?=.*<h2>.*)(?=.*<h4.*?class=['"]*.*introtext.*['"]*.*)(?!.*<aside>.*)(?!.*<img>.*)(?=.*<p>.*$)/gi)/*?.slice(0, 2)*/ || [];
    //let matches = card.content.match(/^(?=.*<h4.*?introtext*.*)(?!.*<aside>.*)(?!.*<img>.*)/gmi)/*?.slice(0, 2)*/ || [];
    //const matches = card.content.match(/<p[^>]*>((?:(?!<img\b)[\s\S])*?)<\/p>/g)?.slice(0, 2);
    //const regex = /<h4\b[^>]*\b(intotext)\b[^>]*>(.*?)<\/h4>/gi;
    //const matches = [...card.content.matchAll(regex)].map(match => match[0])
    //if (card.id == '4058') console.log(matches)
    //card.ellipsis = matches.join('')
    //console.log(card.ellipsis)


    const regex = /(?:<h2\b.*?>(.*?)<\/h2>\s*)?<h4[^>]*class=["'][^"']*introtext[^"']*["'][^>]*>([\s\S]*?)<\/h4>/g;

    //const result = []
    card.ellipsis = ''
    let match
    while ((match = regex.exec(card.content)) !== null) {
      /*result.push({
          h2: match[1] ? match[1].trim() : null,
          introtext: match[2].trim()
      });*/

      const h2 = match[1] ? match[1].trim() : null
      const introtext = match[2].trim()
      card.ellipsis += h2 && `<p class="intro"><b>${h2}</b><br>${introtext}</p>` || introtext || card.content
      //card.ellipsis += introtext && `<p>${introtext}</p>` || card.content
    }

    if (!card.ellipsis) card.ellipsis = card.content.match(/<(?!aside\b|figure\b|img\b|h2\b|h3\b|ul\b|li\b)([a-zA-Z]+)\b[^>]*>[\s\S]*?<\/\1>/g)?.slice(0, 2).join('')
    //console.log(card.ellipsis)
  }
</script>

<aside class:double={card.img} class="card card-compact bg-base-300 shadow-xl">
  {#if card.img}
    <figure>
      <a href={`/${card.path}`}>
        <img style={`object-fit: cover; object-position: ${card.pos || 'center'}`} src={`${base}${card.img}`} alt="" width="928" height="548"/>
      </a>
    </figure>
  {:else}
    <figure>
      <!--<a href={`/${card.path}`}>
        <img src="/pixel.png" alt="" width="928" height="548">
      </a>-->
    </figure>
  {/if}
  <div class="card-body justify-between">
    <a href={`/${card.path}`}>
      {#if card.desc}<h4 class="italic">{card.desc}</h4>{/if}
      <h2 class="card-title">
        {@html card.longtitle || card.title}
      </h2>
      {#if card.ellipsis}<div class="ellipsis">{@html card.ellipsis}</div>{/if}
      {#if card.introtext}<p class="intro">{@html card.introtext}</p>{/if}
    </a>
    <div class="card-actions">
      {#each card.tag as tag}
        <small class="badge badge-outline badge-sm">{tag}</small>
      {/each}
    </div>
  </div>
</aside>

<style>
  aside.double {
    grid-row-end: span 2;
  }
</style>