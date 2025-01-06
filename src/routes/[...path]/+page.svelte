<script>
  import Cards from '$lib/components/Cards.svelte'
  import Card from '$lib/components/Card.svelte'
  import { PUBLIC_BASE_URL } from '$env/static/public'
// @ts-nocheck

  export let data
  console.log('[path]', data.doc.id, data.doc.rank, data.docs.length)

  $: doc = data.doc
  $: docs = data.docs.slice(0, 18)
  $: pagenum = data.docs.length > 0 ? 1 : 0


  //$: (data) => { doc = data.doc stb…}
  // if (18 * pagenum >= data.docs.length) pagenum = 0

  const _pagenum = () => {
    pagenum++
    docs = data.docs.slice(0, 18 * pagenum)
    if (18 * pagenum >= data.docs.length) pagenum = 0
  }
  // _pagenum()

  $: pubdate = doc && new Date(doc.publishedon * 1000).toLocaleDateString('hu-HU')
  $: editdate = doc && new Date(doc.editedon * 1000).toLocaleDateString('hu-HU')
</script>

<main>
  {#if doc.id}
    <!--{@const date = new Date(doc.publishedon * 1000).toLocaleDateString('hu-HU')}-->
    <!--{@const meta = [doc.tvs.sze, date, doc.tvs.cat].join(' | ')}-->
    <article class="prose mx-auto px-4 py-12">
      <h2 class="felcim uppercase text-sm">{@html doc.description}</h2>
      <h1 class="title">{@html doc.longtitle || doc.pagetitle}</h1>
      <h4 class="introtext">{@html doc.introtext}</h4>
      <p>
        {#if doc.tvs.sze.length}
          {#each doc.tvs.sze as sze, i}
            <a href="/#{sze.val}"><small class="uppercase">{sze.name}</small></a>{#if (i + 1) < doc.tvs.sze.length}, {/if}
          {/each}
          &nbsp;|
        {/if}
        <small>{`${pubdate}${editdate && editdate !== pubdate ?' (frissítve: '+editdate+')':''}`}</small><small class="uppercase">{`${doc.tvs.cat?' | '+doc.tvs.cat:''}`}</small></p>
      <aside class="flex flex-wrap gap-2 sm:visible mb-12">
        {#each doc.tvs.tag as tag}
          <small class="badge badge-outline badge-sm">{tag}</small>
        {/each}
      </aside>
      <!--{#if doc.tvs.img}
      <figure class="pageimage text-center w-full">
        <img class="mx-auto" style={`object-fit: contain;`} src={doc.tvs.img} alt="">
        <figcaption>{@html doc.tvs.credit}</figcaption>
      </figure>
      {/if}-->
      {#if doc.img}
      <figure class="pageimage text-center w-full">
        <img class="mx-auto" style={`object-fit: contain;`} src={doc.img.src} alt="">
        <figcaption>{@html doc.img.caption}</figcaption>
      </figure>
      {/if}
      <!--<p class="uppercase"><small></small></p>-->
      {@html doc.content}
      {#if doc.tvs.sze.length}
        {#each doc.tvs.sze as sze}
          {#if sze.full}
            {@html sze.full}
          {:else}
            <p class="alairas">{sze.name}</p>
          {/if}
        {/each}
      {/if}
    </article>
  <!-- {:else}
    <section class="carousel carousel-center bg-neutral space-x-4 p-4 pb-8 items-stretch w-full">
      <aside class="carousel-item card rounded card--compact bg-base-100 max-w-xs lg:w-5/12 h-min max-h-1/2">
        <Card card={ {'img': {src: 'https://img.daisyui.com/images/stock/photo-1559703248-dcaaec9fab78.webp'}, 'longtitle': 'Segítség, cukorbeteg vagyok!', 'introtext': 'Sokszor azt gondoljuk, ha egy betegség elindul, törvényszerűen romlik. Ez egyáltalán nem biztos! A folyamat attól függ, hogy mennyire sikerül a gyorsító, rontó folyamatokat kiküszöbölnünk, és mennyire hagyjuk a védekező mechanizmusainkat érvényesülni.', 'tags': '', 'buttons': {'Bevezető': '/cikkek/diabetes/2402/prevencio', 'Válogatott cikkek': '/s-o-s'} } }/>
      </aside>

      <aside class="carousel-item card rounded card--compact bg-base-100 max-w-xs lg:w-5/12 h-min max-h-1/2">
        <Card card={ {'img': {src: 'assets/gdm.jpg'}, 'longtitle': 'Gesztációs diabétesz', 'introtext': 'A 24–28. heti vércukorterhelés mutatja ki a gesztációs diabéteszt. Ha valakit diagnosztizálnak, az első reakciója általában a félelem. A legrosszabb, amit tehetünk, ha a diagnózis után tagadásba menekülünk. Ehelyett vegyük kezünkbe az irányítást, orvosunk útmutatása alapján mérjük vércukrunkat, kövessük az étkezési ajánlásokat, mozogjunk!', 'tags': '', 'buttons': {'Bevezető': '/cikkek/diabetes/gdm2024/tippek-nogyogyaszoktol', 'Válogatott cikkek': '/varandossag'} } }/>
      </aside>

      <aside class="carousel-item card rounded card--compact bg-base-100 max-w-xs lg:w-5/12 h-min max-h-1/2">
        <Card card={ {'img': {src: `${PUBLIC_BASE_URL}assets/images/cikkek/dg2405/dg2405-fottetelek-AdobeStock_446471987.jpg`}, 'longtitle': 'Táplálkozás', 'introtext': '1-es típusú cukorbetegséggel élőknél az étrendi kezelés célja és feladata a jó vércukorkontroll, a szervezet szükségletének megfelelő energia- és tápanyagbevitel, valamint az egészségmegőrző táplálkozási szokások kialakítása. Ez utóbbi alapszabálya, hogy változatosan (sokféle élelmiszert, sokféle módon elkészítve) és mértékletesen kell enni. Az egészséges étrend tartalmaz zöldségféléket, gyümölcsöket, gabonaféléket, kenyeret, tésztát, burgonyát, rizst, tejtermékeket, húsféléket, halat, tojást, szárazhüvelyeseket, olajos magvakat.', 'tags': '', 'buttons': {'Receptek': '/receptek', 'Válogatott cikkek': '/taplalkozas'} } }/>
      </aside>

      <aside class="carousel-item card rounded card--compact bg-base-100 max-w-xs lg:w-5/12 h-min max-h-1/2">
        <Card card={ {'img': {src: 'https://img.daisyui.com/images/stock/photo-1565098772267-60af42b81ef2.webp'}, 'longtitle': 'Klubok, Egyesületek', 'introtext': 'A cél, hogy egy cukorbeteg lehetőség szerint teljes körű ellátást kapjon. A gondozás során a laborvizsgálattól a szövődményfelmérésen át az étrend, az életmód és a személyre szabott terápia meghatározásáig minden nélkülözhetetlen szakember, orvosok, dietetikus, személyi edző és szakasszisztens dolgozik együtt.', 'tags': '', 'buttons': {'Elérhetőségek': '/hirek/civil-szervezetek-es-szakellatohelyek', 'Hírek': '/hirek'} } }/>
      </aside>
    </section> -->
  {/if}



  {#if docs?.length}
    <!--{#each Object.keys(docs) as key}-->
      <Cards {docs}/>
    <!--{/each}-->
  {:else}
    <h3 class="text-center">NO DOCS</h3>
  {/if}
</main>

{#if pagenum > 0}
<footer class="footer footer-center bg-base-200 text-base-content pt-4">
  <button on:click={_pagenum} class="btn btn-outline">További cikkek</button>
</footer>
{/if}
