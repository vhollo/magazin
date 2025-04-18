<script>
  export let card
  const base = 'https://www.diabetes.hu/'

  /* $: if (!card.introtext?.length && card.content) {

    const regex = /(?:<h2\b.*?>(.*?)<\/h2>\s*)?<h4[^>]*class=["'][^"']*introtext[^"']*["'][^>]*>([\s\S]*?)<\/h4>/g;

    //const result = []
    card.ellipsis = ''
    let match
    while ((match = regex.exec(card.content)) !== null) {
      const h2 = match[1] ? match[1].trim() : null
      const introtext = match[2].trim()
      card.ellipsis += h2 && `<p class="intro"><b>${h2}</b><br>${introtext}</p>` || introtext || card.content
      //card.ellipsis += introtext && `<p>${introtext}</p>` || card.content
    }

    if (!card.ellipsis) card.ellipsis = card.content.match(/<(?!aside\b|figure\b|img\b|h2\b|h3\b|ul\b|li\b)(.*?)\b[^>]*>[\s\S]*?<\/\1>/g)?.slice(0, 2).join('')
    //console.log(card.ellipsis)
  } */
</script>

<a href={`/${card.path}`} class="card min-[480px]:card-side w-full max-w-prose mx-auto">
  <div class="card-body p-0 max-[479px]:order-1">
    {#if card.description}<h4 class="italic">{@html card.description}</h4>{/if}
    <h3 class="card-title">
      {@html card.longtitle || card.title}
    </h3>
    {#if card.ellipsis}<div class="twoliner">{@html card.ellipsis}</div>{/if}
    {#if card.introtext}<p class="twoliner">{@html card.introtext}</p>{/if}
  </div>
  {#if card.img}
  <img loading="lazy" class="m-0 sm:ml-2 w-full h-[240px] min-[480px]:w-[160px] min-[480px]:h-[160px]" style={`object-fit: ${card.img.ext == 'png' ? 'contain' : 'cover'}; object-position: ${card.img.pos || '50% 40%'}`} src={`${card.img.src}`} alt="">
  {/if}
</a>