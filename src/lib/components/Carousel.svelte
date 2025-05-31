<script context="module">
  import { afterUpdate } from 'svelte'
  import CarItem from '$lib/components/CarItem.svelte'
  import { PUBLIC_BASE_URL } from '$env/static/public'
</script>

<script lang="ts">
  let carous, scroll = false, main: number, height: number

  afterUpdate(() => {
    if (carous.scrollWidth > main) {
      scroll = true
    } else {
      scroll = false
    }
  })
  const _left = () => {
    carous.scrollLeft -= main/2;
  }
  const _right = () => {
    carous.scrollLeft += main/2;
  }
</script>

  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <section bind:clientWidth={main} bind:clientHeight={height} class="relative">
    <div class="carousel carousel-center bg--neutral space-x-4 px-4 py-8 items-stretch w-full" bind:this={carous}>
      <aside class="carousel-item card rounded-sm card--sm bg-base-100 w-full sm:w-7/12 lg:w-2/5 xl:w-[27.5%] max-h-1/2 pb-2">
        <CarItem card={ {'img': {src: 'assets/pixabay-question-2709670-1280.jpg'}, 'longtitle': 'Segítség, cukorbeteg vagyok!', 'introtext': 'Sokszor azt gondoljuk, ha egy betegség elindul, törvényszerűen romlik. Ez egyáltalán nem biztos! A folyamat attól függ, hogy mennyire sikerül a gyorsító, rontó folyamatokat kiküszöbölnünk, és mennyire hagyjuk a védekező mechanizmusainkat érvényesülni.', 'tags': '', 'buttons': {'Bevezető': '/cikkek/diabetes/2402/prevencio', 'Válogatott cikkek': '/s-o-s'} } }/>
      </aside>
  
      <aside class="carousel-item card rounded-sm card--sm bg-base-100 w-full sm:w-7/12 lg:w-2/5 xl:w-[27.5%] max-h-1/2 pb-2">
        <CarItem card={ {'img': {src: `${PUBLIC_BASE_URL}assets/images/cikkek/dg2405/dg2405-fottetelek-AdobeStock_446471987.jpg`}, 'longtitle': 'Táplálkozás', 'introtext': 'Cukorbetegséggel élőknél az étrendi kezelés célja és feladata a jó vércukorkontroll, a szervezet szükségletének megfelelő energia- és tápanyagbevitel, valamint az egészségmegőrző táplálkozási szokások kialakítása. Ez utóbbi alapszabálya, hogy változatosan és mértékletesen kell enni. ', 'tags': '', 'buttons': {'Receptek': '/receptek', 'Válogatott cikkek': '/taplalkozas'} } }/>
      </aside>
  
      <aside class="carousel-item card rounded-sm card--sm bg-base-100 w-full sm:w-7/12 lg:w-2/5 xl:w-[27.5%] max-h-1/2 pb-2">
        <CarItem card={ {'img': {src: `assets/dj1701-p1-optim.jpg`}, 'longtitle': 'Junior', 'introtext': 'Évtizedekkel ezelőtt az orvosok tiltották nemcsak a versenyszerű sportolást, de a kedvtelésből végzett mozgástól is óvták a diabéteszeseket. Az élet és a tudomány túllépett ezen, de nemcsak a sport az, amelyben ki lehet teljesedni. Művész, tudós, tanár, asztalos – bármilyen szakmát, hivatást választhattok diabosként is. Boldog, elégedett, sikeres felnőttek lehettek. Egyetlen feltétele van ennek: tanuljatok, tudjatok minél többet a cukorbetegségről, s a tanultakat alkalmazzátok mindennapjaitokban.', 'tags': '', 'buttons': {'Cikkek': '/junior', 'Szakellátóhelyek': '/hirek/civil-szervezetek-es-szakellatohelyek'} } }/>
      </aside>
  
      <aside class="carousel-item card rounded-sm card--sm bg-base-100 w-full sm:w-7/12 lg:w-2/5 xl:w-[27.5%] max-h-1/2 pb-2">
        <CarItem card={ {'img': {src: 'assets/gdm.jpg'}, 'longtitle': 'Gesztációs diabétesz', 'introtext': 'A 24–28. heti vércukorterhelés mutatja ki a gesztációs diabéteszt. Ha valakit diagnosztizálnak, az első reakciója általában a félelem. A legrosszabb, amit tehetünk, ha a diagnózis után tagadásba menekülünk. Ehelyett vegyük kezünkbe az irányítást, orvosunk útmutatása alapján mérjük vércukrunkat, kövessük az étkezési ajánlásokat, mozogjunk!', 'tags': '', 'buttons': {'Bevezető': '/cikkek/diabetes/gdm2024/tippek-nogyogyaszoktol', 'Válogatott cikkek': '/gyermekvallalas'} } }/>
      </aside>
  
      <aside class="carousel-item card rounded-sm card--sm bg-base-100 w-full sm:w-7/12 lg:w-2/5 xl:w-[27.5%] max-h-1/2 pb-2">
        <CarItem card={ {'img': {src: `${PUBLIC_BASE_URL}assets/images/cikkek/dt2302/Collage_of_large_group_of_ethnically_diverse_smiling_people,_men_and_women_expressing_happy,_joyful_emotions_over_green_and_yellow_background._Multiracial_society.jpg`}, 'longtitle': 'Klubok, Egyesületek', 'introtext': 'A cél, hogy egy cukorbeteg lehetőség szerint teljes körű ellátást kapjon. A gondozás során a laborvizsgálattól a szövődményfelmérésen át az étrend, az életmód és a személyre szabott terápia meghatározásáig minden nélkülözhetetlen szakember, orvosok, dietetikus, személyi edő és szakasszisztens dolgozik együtt.', 'tags': '', 'buttons': {'Elérhetőségek': '/hirek/civil-szervezetek-es-szakellatohelyek', 'Hírek': '/hirek'} } }/>
      </aside>
    </div>
    {#if scroll}
    <!-- <div class="absolute left-0 top-0 bottom-0 w-12 m-2 flex items-center z-10"></div> -->
    <button on:click={_left} class="absolute left-0 circle border-2 inline-block w-12 h-12 m-2" style="top: 50%; transform: translateY(-50%);">◀︎</button>
    <!-- <div class="absolute right-0 top-0 bottom-0 w-12 m-2 flex items-center z-10"></div> -->
    <button on:click={_right} class="absolute right-0 circle border-2 inline-block w-12 h-12 m-2" style="top: 50%; transform: translateY(-50%);">▶︎</button>
    {/if}
  </section>
  
<style>
  .carousel-item {
    max-width: 92%;
  }
  section button {
    visibility: hidden;
  }
  section:hover button {
    visibility: visible;
  }
  .circle {
    border-radius: 50%;
    backdrop-filter: blur(10px);
    /* vertical-align: middle; */
    /* line-height: 100%; */
    font-size: xx-large;
  }

</style>