<script>
  import Cards from '$lib/components/Cards.svelte'
// @ts-nocheck

  export let data
  //console.log('p.s',data.docs)

  $: doc = data.doc
  $: docs = data.docs
  const base = 'https://www.diabetes.hu/'

  $: pubdate = doc && new Date(doc.publishedon * 1000).toLocaleDateString('hu-HU')
  $: editdate = doc && new Date(doc.editedon * 1000).toLocaleDateString('hu-HU')
  //$: console.log(doc.tvs.sze.full)
</script>

<main>
  <section class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
    <div class="card bg-base-300 shadow-xl">
      <!--<figure><img src="/assets/photo-1606107557195-0e29a4b5b4aa.jpg" alt="Shoes" width="928" height="548"/></figure>-->
      <div class="card-body prose">
        <h2 class="card-title">
          Segítség, cukorbeteg vagyok!
          <!--<div class="badge badge-secondary">NEW</div>-->
        </h2>
        <p>s-o-s</p>
        <div class="card-actions justify-end">
          <div class="badge badge-outline"><a href="/s-o-s">Bevezető</a></div> 
          <div class="badge badge-outline"><a href="/s-o-s#cikkek">Válogatott cikkek</a></div>
        </div>
      </div>
    </div>

    <div class="card bg-base-300 shadow-xl">
      <!--<figure><img src="/assets/photo-1606107557195-0e29a4b5b4aa.jpg" alt="Shoes" width="928" height="548" /></figure>-->
      <div class="card-body prose">
        <h2 class="card-title">
          Gesztációs diabétesz
          <!--<div class="badge badge-secondary">NEW</div>-->
        </h2>
        <p>Várandósság cukorbetegen</p>
        <div class="card-actions justify-end">
          <div class="badge badge-outline"><a href="/gdm">Bevezető</a></div> 
          <div class="badge badge-outline"><a href="/gdm#cikkek">Válogatott cikkek</a></div>
        </div>
      </div>
    </div>

    <div class="card bg-base-300 shadow-xl">
      <!--<figure><img src="/assets/photo-1606107557195-0e29a4b5b4aa.jpg" alt="Shoes" width="928" height="548" /></figure>-->
      <div class="card-body prose">
        <h2 class="card-title">
          Táplálkozás
          <!--<div class="badge badge-secondary">NEW</div>-->
        </h2>
        <p>Receptek, mintaétrendek</p>
        <div class="card-actions justify-end">
          <div class="badge badge-outline">Tápanyag-táblázatok</div> 
          <!--<div class="badge badge-outline">Receptek</div>-->
          <div class="badge badge-outline"><a href="/recept">Recept</a></div>
        </div>
      </div>
    </div>

    <div class="card bg-base-300 shadow-xl">
      <!--<figure><img src="/assets/photo-1606107557195-0e29a4b5b4aa.jpg" alt="Shoes" width="928" height="548" /></figure>-->
      <div class="card-body prose">
        <h2 class="card-title">
          Klubok, Egyesületek
          <!--<div class="badge badge-secondary">NEW</div>-->
        </h2>
        <p>Közösségi élet</p>
        <div class="card-actions justify-end">
          <div class="badge badge-outline">Elérhetőségek</div> 
          <div class="badge badge-outline">Hírek</div>
        </div>
      </div>
    </div>
  </section>

  {#if docs}
    <Cards {docs}/>
  {/if}
</main>
