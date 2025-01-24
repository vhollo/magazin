<script context="module">
  import Cards from '$lib/components/Cards.svelte'
  import Carousel from '$lib/components/Carousel.svelte'
  import Search from '$lib/components/Search.svelte'
  import { PUBLIC_BASE_URL } from '$env/static/public'

</script>

<script>
  // @ts-nocheck
  // import { onMount, afterUpdate } from 'svelte'

  export let data
  // console.log('[/]',data.docs.length)
  let pagenum = 1

  //$: (data) => { doc = data.doc stb…}
  //$: doc = data.doc
  let docs = data.docs.slice(0, 18)

  //$: pubdate = doc && new Date(doc.publishedon * 1000).toLocaleDateString('hu-HU')
  //$: editdate = doc && new Date(doc.editedon * 1000).toLocaleDateString('hu-HU')
  //$: console.log(docs.length)
  const _pagenum = () => {
    pagenum++
    docs = data.docs.slice(0, 18 * pagenum)
    if (18 * pagenum >= data.docs.length) pagenum = 0
    // console.log(pagenum, docs.length)
  }

</script>

<svelte:head><title>Diabetes</title></svelte:head>

<main class="bg-base-300">
  <Carousel/>
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- <section bind:clientWidth={main} class="relative">
  <div class="carousel carousel-center bg-neutral space-x-4 p-4 pb-0 items-stretch w-full {scroll}" bind:this={carous}>
    <aside class="carousel-item card rounded card-compact bg-base-100 w-full sm:w-7/12 lg:w-2/5 xl:w-[27.5%] max-h-1/2">
      <CarItem card={ {'img': {src: `${PUBLIC_BASE_URL}assets/images/cikkek/dt1204/pixabay-question-2709670-1280.jpg`}, 'longtitle': 'Segítség, cukorbeteg vagyok!', 'introtext': 'Sokszor azt gondoljuk, ha egy betegség elindul, törvényszerűen romlik. Ez egyáltalán nem biztos! A folyamat attól függ, hogy mennyire sikerül a gyorsító, rontó folyamatokat kiküszöbölnünk, és mennyire hagyjuk a védekező mechanizmusainkat érvényesülni.', 'tags': '', 'buttons': {'Bevezető': '/cikkek/diabetes/2402/prevencio', 'Válogatott cikkek': '/s-o-s'} } }/>
    </aside>

    <aside class="carousel-item card rounded card-compact bg-base-100 w-full sm:w-7/12 lg:w-2/5 xl:w-[27.5%] max-h-1/2">
      <CarItem card={ {'img': {src: 'assets/gdm.jpg'}, 'longtitle': 'Gesztációs diabétesz', 'introtext': 'A 24–28. heti vércukorterhelés mutatja ki a gesztációs diabéteszt. Ha valakit diagnosztizálnak, az első reakciója általában a félelem. A legrosszabb, amit tehetünk, ha a diagnózis után tagadásba menekülünk. Ehelyett vegyük kezünkbe az irányítást, orvosunk útmutatása alapján mérjük vércukrunkat, kövessük az étkezési ajánlásokat, mozogjunk!', 'tags': '', 'buttons': {'Bevezető': '/cikkek/diabetes/gdm2024/tippek-nogyogyaszoktol', 'Válogatott cikkek': '/gyermekvallalas'} } }/>
    </aside>

    <aside class="carousel-item card rounded card-compact bg-base-100 w-full sm:w-7/12 lg:w-2/5 xl:w-[27.5%] max-h-1/2">
      <CarItem card={ {'img': {src: `${PUBLIC_BASE_URL}assets/images/cikkek/dg2405/dg2405-fottetelek-AdobeStock_446471987.jpg`}, 'longtitle': 'Táplálkozás', 'introtext': '1-es típusú cukorbetegséggel élőknél az étrendi kezelés célja és feladata a jó vércukorkontroll, a szervezet szükségletének megfelelő energia- és tápanyagbevitel, valamint az egészségmegőrző táplálkozási szokások kialakítása. Ez utóbbi alapszabálya, hogy változatosan (sokféle élelmiszert, sokféle módon elkészítve) és mértékletesen kell enni. Az egészséges étrend tartalmaz zöldségféléket, gyümölcsöket, gabonaféléket, kenyeret, tésztát, burgonyát, rizst, tejtermékeket, húsféléket, halat, tojást, szárazhüvelyeseket, olajos magvakat.', 'tags': '', 'buttons': {'Receptek': '/receptek', 'Válogatott cikkek': '/taplalkozas'} } }/>
    </aside>

    <aside class="carousel-item card rounded card-compact bg-base-100 w-full sm:w-7/12 lg:w-2/5 xl:w-[27.5%] max-h-1/2">
      <CarItem card={ {'img': {src: `${PUBLIC_BASE_URL}assets/images/cikkek/dt2302/Collage_of_large_group_of_ethnically_diverse_smiling_people,_men_and_women_expressing_happy,_joyful_emotions_over_green_and_yellow_background._Multiracial_society.jpg`}, 'longtitle': 'Klubok, Egyesületek', 'introtext': 'A Celt, hogy egy cukorbeteg lehetőség szerint teljes körű ellátást kapjon. A gondozás során a laborvizsgálattól a szövődményfelmérésen át az étrend, az életmód és a személyre szabott terápia meghatározásáig minden nélkülözhetetlen szakember, orvosok, dietetikus, személyi edő és szakasszisztens dolgozik együtt.', 'tags': '', 'buttons': {'Elérhetőségek': '/hirek/civil-szervezetek-es-szakellatohelyek', 'Hírek': '/hirek'} } }/>
    </aside>
  </div>
  {#if scroll}
    <button class="absolute left-0 top-0 bottom-0 w-16" on:click={_left}><span class="circle border-2 inline-block w-12 h-12">◀︎</span></button>
    <button class="absolute right-0 top-0 bottom-0 w-16" on:click={_right}><span class="circle border-2 inline-block w-12 h-12">▶︎</span></button>
  {/if}
</section>
 -->
  <aside class="mx-auto py-8 max-md:mx-4 bg-neutral">
    <Search />
  </aside>

  {#if docs.length}
    <Cards docs={docs}/>
  {/if}
</main>

{#if pagenum > 0}
<footer class="footer footer-center bg-base-200 text-base-content pt-4">
  <button on:click={_pagenum} class="btn btn-outline">További cikkek</button>
</footer>
{/if}

<style>
  .card img {
    object-fit: cover;
    object-position: 50% 40%;
  }

</style>
