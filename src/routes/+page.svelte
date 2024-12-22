<script>
  import Cards from '$lib/components/Cards.svelte'
  import Card from '$lib/components/Card.svelte'
  import { PUBLIC_BASE_URL } from '$env/static/public'
// @ts-nocheck

  export let data
  console.log('p.s',data.docs.length)
  let pagenum = 1

  //$: doc = data.doc
  let docs = data.docs.slice(0, 18 * pagenum)

  //$: pubdate = doc && new Date(doc.publishedon * 1000).toLocaleDateString('hu-HU')
  //$: editdate = doc && new Date(doc.editedon * 1000).toLocaleDateString('hu-HU')
  //$: console.log(docs.length)
  const _pagenum = () => {
    pagenum++
    docs = data.docs.slice(0, 18 * pagenum)
    if (18 * pagenum >= data.docs.length) pagenum = 0
    console.log(pagenum, docs.length)
  }
</script>

<main>
  
  <section class="carousel carousel-center bg-neutral space-x-4 p-4 mb-4 items-stretch w-full">
      <!--{@const card = {id: doc.id, img: doc.tvs.img, pos: doc.tvs.pos, path: doc.path, desc: doc.description, title: doc.title, longtitle: doc.longtitle, introtext: doc.introtext, ellipsis: doc.ellipsis, content: doc.content, tag: doc.tvs.tag}}-->
    <aside class="carousel-item card rounded card--compact bg-base-100 max-w-xs lg:w-5/12 h-min max-h-1/2">
      <Card card={ {'img': {src: 'https://img.daisyui.com/images/stock/photo-1559703248-dcaaec9fab78.webp'}, 'longtitle': 'Segítség, cukorbeteg vagyok!', 'introtext': 'Sokszor azt gondoljuk, ha egy betegség elindul, törvényszerűen romlik. Ez egyáltalán nem biztos! A folyamat attól függ, hogy mennyire sikerül a gyorsító, rontó folyamatokat kiküszöbölnünk, és mennyire hagyjuk a védekező mechanizmusainkat érvényesülni.', 'tags': '', 'buttons': {'Bevezető': '/cikkek/diabetes/2401/csak-a-cukor-szamit-vagy-a-nagy-egesz', 'Válogatott cikkek': '/s-o-s'} } }/>
    </aside>

    <aside class="carousel-item card rounded card--compact bg-base-100 max-w-xs lg:w-5/12 h-min max-h-1/2">
      <Card card={ {'img': {src: 'assets/gdm.jpg'}, 'longtitle': 'Gesztációs diabétesz', 'introtext': 'A 24–28. heti vércukorterhelés mutatja ki a gesztációs diabéteszt. Ha valakit diagnosztizálnak, az első reakciója általában a félelem. A legrosszabb, amit tehetünk, ha a diagnózis után tagadásba menekülünk. Ehelyett vegyük kezünkbe az irányítást, orvosunk útmutatása alapján mérjük vércukrunkat, kövessük az étkezési ajánlásokat, mozogjunk!', 'tags': '', 'buttons': {'Bevezető': '/cikkek/diabetes/gdm2024/tippek-nogyogyaszoktol', 'Válogatott cikkek': '/gdm'} } }/>
    </aside>

    <aside class="carousel-item card rounded card--compact bg-base-100 max-w-xs lg:w-5/12 h-min max-h-1/2">
      <Card card={ {'img': {src: `${PUBLIC_BASE_URL}assets/images/cikkek/dg2405/dg2405-fottetelek-AdobeStock_446471987.jpg`}, 'longtitle': 'Táplálkozás', 'introtext': '1-es típusú cukorbetegséggel élőknél az étrendi kezelés célja és feladata a jó vércukorkontroll, a szervezet szükségletének megfelelő energia- és tápanyagbevitel, valamint az egészségmegőrző táplálkozási szokások kialakítása. Ez utóbbi alapszabálya, hogy változatosan (sokféle élelmiszert, sokféle módon elkészítve) és mértékletesen kell enni. Az egészséges étrend tartalmaz zöldségféléket, gyümölcsöket, gabonaféléket, kenyeret, tésztát, burgonyát, rizst, tejtermékeket, húsféléket, halat, tojást, szárazhüvelyeseket, olajos magvakat.', 'tags': '', 'buttons': {'Receptek': '/receptek', 'Válogatott cikkek': '/taplalkozas'} } }/>
    </aside>

    <aside class="carousel-item card rounded card--compact bg-base-100 max-w-xs lg:w-5/12 h-min max-h-1/2">
      <Card card={ {'img': {src: 'https://img.daisyui.com/images/stock/photo-1565098772267-60af42b81ef2.webp'}, 'longtitle': 'Klubok, Egyesületek', 'introtext': 'A cél, hogy egy cukorbeteg lehetőség szerint teljes körű ellátást kapjon. A gondozás során a laborvizsgálattól a szövődményfelmérésen át az étrend, az életmód és a személyre szabott terápia meghatározásáig minden nélkülözhetetlen szakember, orvosok, dietetikus, személyi edző és szakasszisztens dolgozik együtt.', 'tags': '', 'buttons': {'Elérhetőségek': '/hirek/civil-szervezetek-es-szakellatohelyek', 'Hírek': '/hirek'} } }/>
    </aside>

  </section>

  <!--<article class="prose card w-128 bg-base-300 shadow-xl my-8 mx-auto p-4">
    <h1>Szevasz Tavasz!</h1>
    <p></p>
  </article>-->

  {#if docs.length}
    <Cards docs={docs}/>
  {/if}
</main>

{#if pagenum > 0}
<footer class="footer footer-center bg-base-200 text-base-content p-2">
  <button on:click={_pagenum} class="btn btn-outline">További cikkek</button>
</footer>
{/if}

<style>
  /*section {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(28ch, 1fr));
    grid-auto-rows: minmax(10ch, auto);
    grid-auto-flow: dense;
  }*/
  .card img {
    object-fit: cover;
    object-position: 50% 40%;
  }
</style>
