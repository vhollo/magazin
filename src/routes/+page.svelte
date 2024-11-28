<script>
  import Cards from '$lib/components/Cards.svelte'
  import Card from '$lib/components/Card.svelte'
// @ts-nocheck

  export let data
  //console.log('p.s',data.docs)

  //$: doc = data.doc
  $: docs = data.docs
  //const base = 'https://www.diabetes.hu/'

  //$: pubdate = doc && new Date(doc.publishedon * 1000).toLocaleDateString('hu-HU')
  //$: editdate = doc && new Date(doc.editedon * 1000).toLocaleDateString('hu-HU')
  //$: console.log(docs)
</script>

<main>
  <section class="carousel carousel-center bg-neutral space-x-4 p-4 mb-4 items-stretch">
    <!--{@const card = {id: doc.id, img: doc.tvs.img, pos: doc.tvs.pos, path: doc.path, desc: doc.description, title: doc.title, longtitle: doc.longtitle, introtext: doc.introtext, ellipsis: doc.ellipsis, content: doc.content, tag: doc.tvs.tag}}-->
    <aside class="carousel-item card card-compact bg-base-100 shadow-xl max-w-md max-h-1/2">
      <Card card={ {'img':'https://img.daisyui.com/images/stock/photo-1559703248-dcaaec9fab78.webp', 'pos': '50% 40%', 'longtitle': 'Segítség, cukorbeteg vagyok!', 'introtext': 'Sokszor azt gondoljuk, ha egy betegség elindul, törvényszerűen romlik. Ez egyáltalán nem biztos! A folyamat attól függ, hogy mennyire sikerül a gyorsító, rontó folyamatokat kiküszöbölnünk, és mennyire hagyjuk a védekező mechanizmusainkat érvényesülni.', 'tags': '', 'buttons': {'Bevezető': '/cikkek/diabetes/2401/csak-a-cukor-szamit-vagy-a-nagy-egesz', 'Válogatott cikkek': '/s-o-s'} } }/>
    </aside>

    <aside class="carousel-item card card-compact bg-base-100 shadow-xl max-w-md max-h-1/2">
      <Card card={ {'img':'https://img.daisyui.com/images/stock/photo-1601004890684-d8cbf643f5f2.webp', 'pos': '50% 50%', 'longtitle': 'Gesztációs diabétesz', 'introtext': 'Várandósság cukorbetegen', 'tags': '', 'buttons': {'Bevezető': '/gdm', 'Válogatott cikkek': '/gdm'} } }/>
    </aside>

    <aside class="carousel-item card card-compact bg-base-100 shadow-xl max-w-md max-h-1/2">
      <figure><img alt="" src="https://img.daisyui.com/images/stock/photo-1559703248-dcaaec9fab78.webp" width="928" height="548"/></figure>
      <div class="card-body prose">
        <h2 class="card-title">
          Segítség, cukorbeteg vagyok!
          <div class="badge badge-secondary">NEW</div>
        </h2>
        <p class="intro">Sokszor azt gondoljuk, ha egy betegség elindul, törvényszerűen romlik. Ez egyáltalán nem biztos! A folyamat attól függ, hogy mennyire sikerül a gyorsító, rontó folyamatokat kiküszöbölnünk, és mennyire hagyjuk a védekező mechanizmusainkat érvényesülni.</p>
        <!--<Cards docs={docs['s-o-s']} full={false}/>-->

        <div class="card-actions justify-end mt-4">
          <a class="btn btn-sm btn-outline" href="/cikkek/diabetes/2401/csak-a-cukor-szamit-vagy-a-nagy-egesz">Bevezető</a>
          <a class="btn btn-sm btn-outline" href="/s-o-s">Válogatott cikkek</a>
        </div>
      </div>
    </aside>
    <div class="carousel-item">
      <img
        alt="" src="https://img.daisyui.com/images/stock/photo-1559703248-dcaaec9fab78.webp"
        class="rounded-box" />
    </div>
    <div class="carousel-item">
      <img
        alt="" src="https://img.daisyui.com/images/stock/photo-1565098772267-60af42b81ef2.webp"
        class="rounded-box" />
    </div>
    <div class="carousel-item">
      <img
        alt="" src="https://img.daisyui.com/images/stock/photo-1572635148818-ef6fd45eb394.webp"
        class="rounded-box" />
    </div>
    <div class="carousel-item">
      <img
        alt="" src="https://img.daisyui.com/images/stock/photo-1494253109108-2e30c049369b.webp"
        class="rounded-box" />
    </div>
    <div class="carousel-item">
      <img
        alt="" src="https://img.daisyui.com/images/stock/photo-1550258987-190a2d41a8ba.webp"
        class="rounded-box" />
    </div>
    <div class="carousel-item">
      <img
        alt="" src="https://img.daisyui.com/images/stock/photo-1559181567-c3190ca9959b.webp"
        class="rounded-box" />
    </div>
    <div class="carousel-item">
      <img
        alt="" src="https://img.daisyui.com/images/stock/photo-1601004890684-d8cbf643f5f2.webp"
        class="rounded-box" />
    </div>
  </section>

  <article class="prose card w-128 bg-base-300 shadow-xl my-8 mx-auto p-4">
    <h1>Szevasz Tavasz!</h1>
    <p></p>
  </article>

  <section class="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">

    <div class="card bg-base-100 shadow-xl">
      <!--<figure><img alt="" src="/assets/photo-1606107557195-0e29a4b5b4aa.jpg" width="928" height="548"/></figure>-->
      <div class="card-body prose">
        <h2 class="card-title">
          Segítség, cukorbeteg vagyok!
          <!--<div class="badge badge-secondary">NEW</div>-->
        </h2>
        <p>Sokszor azt gondoljuk, ha egy betegség elindul, törvényszerűen romlik. Ez egyáltalán nem biztos! A folyamat attól függ, hogy mennyire sikerül a gyorsító, rontó folyamatokat kiküszöbölnünk, és mennyire hagyjuk a védekező mechanizmusainkat érvényesülni.</p>
        <!--<Cards docs={docs['s-o-s']} full={false}/>-->

        <div class="card-actions justify-end">
          <div class="badge badge-outline"><a href="/s-o-s">Bevezető</a></div> 
          <div class="badge badge-outline"><a href="/s-o-s#cikkek">Válogatott cikkek</a></div>
        </div>
      </div>
    </div>

    <div class="card bg-base-100 shadow-xl">
      <!--<figure><img alt="" src="/assets/photo-1606107557195-0e29a4b5b4aa.jpg" width="928" height="548" /></figure>-->
      <div class="card-body prose">
        <h2 class="card-title">
          Gesztációs diabétesz
          <!--<div class="badge badge-secondary">NEW</div>-->
        </h2>
        <p>Várandósság cukorbetegen</p>
        <!--<Cards docs={docs['gdm']} full={false}/>-->

        <div class="card-actions justify-end">
          <div class="badge badge-outline"><a href="/gdm">Bevezető</a></div> 
          <div class="badge badge-outline"><a href="/gdm#cikkek">Válogatott cikkek</a></div>
        </div>
      </div>
    </div>

    <div class="card card-compact bg-base-100 shadow-xl">
      <!--<figure><img alt="" src="/assets/photo-1606107557195-0e29a4b5b4aa.jpg" width="928" height="548" /></figure>-->
      <div class="card-body prose">
        <h2 class="card-title">
          Táplálkozás
          <!--<div class="badge badge-secondary">NEW</div>-->
        </h2>
        <p>Receptek, mintaétrendek</p>
        <!--<Cards docs={docs['recept']} full={false}/>-->

        <div class="card-actions justify-end">
          <div class="badge badge-outline">Tápanyag-táblázatok</div> 
          <!--<div class="badge badge-outline">Receptek</div>-->
          <div class="badge badge-outline"><a href="/recept">Recept</a></div>
        </div>
      </div>
    </div>

    <div class="card bg-base-100 shadow-xl">
      <!--<figure><img alt="" src="/assets/photo-1606107557195-0e29a4b5b4aa.jpg" width="928" height="548" /></figure>-->
      <div class="card-body prose">
        <h2 class="card-title">
          Klubok, Egyesületek
          <!--<div class="badge badge-secondary">NEW</div>-->
        </h2>
        <p>Közösségi élet</p>
        <!--<Cards docs={docs['klub']} full={false}/>-->

        <div class="card-actions justify-end">
          <div class="badge badge-outline">Elérhetőségek</div> 
          <div class="badge badge-outline">Hírek</div>
        </div>
      </div>
    </div>
  </section>

  {#if docs.tags}
    <Cards docs={docs.tags}/>
  {/if}
</main>

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
