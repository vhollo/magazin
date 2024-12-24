<script>
// @ts-nocheck

  import { PUBLIC_BASE_URL } from '$env/static/public'
  export let actual
  let _open_nav = false

  const cats = {
    'Kezelés': {
      'Inzulinok': '/inzulinok',
      'Gyógyszerek': '/gyogyszerek',
      'Technikai eszközök': '/technikai-eszkozok',
      'Orvos–beteg kapcsolat': '/orvos-beteg',
      'Önmenedzselés': '/onmenedzseles',
    },
    'Életmód': {
      'Táplálkozás': '/taplalkozas',
      'Receptek': '/receptek',
      'Testmozgás': '/testmozgas',
      'Psziché': '/psziche',
      'Jogi útmutatók': '/jogi-utmutatok',
    },
    'Szövődmények': {
      'Idegrendszer': '/idegrendszer',
      'Vese': '/vese',
      'Látás': '/latas',
      'Végtagok': '/vegtagok',
      'Szív-érrendszer': '/sziv-errendszer',
      'Társbetegségek': '/tarsbetegsegek',
    },
    'Közösségi élet': {
      'Egyesületek': '/egyesulet',
      'Közösség': '/kozosseg',
      'Események': '/esemenyek',
      'Rendezvények': '/rendezvenyek',
    },
    'Portrék': {
      'Gyógyítók': '/gyogyitok',
      'Sorstársak': '/sorstarsak',
    },
    'Gyermekvállalás': {
      'Gesztációs diabétesz': '/gdm',
      'Várandósság cukorbetegséggel': '/varandossag',
    },
    'Impresszum': {
      'Alapítvány a Cukorbetegekért': '/alapitany',
      'Tudomány Kiadó': '/tudomany',
      'Portmed': '/portmed',
    },
  }

  /*function _dropdown(event){
    console.log(event)
    const target = event.target//.parentElement.nextSibling
    console.log(target.nextElementSibling)
    target.classList.toggle('menu-dropdown-show')
    target.nextElementSibling.classList.toggle('menu-dropdown-show')
  }*/
  function _uncheck(event){
    //console.log(event)
    const target = event.target//.parentElement.nextSibling
    console.log(target.firstElementChild)
    target.firstElementChild.checked = false
    //target.nextElementSibling.classList.toggle('menu-dropdown-show')
  }

  $: console.log(actual)
  //$: _open_nav = actual && false

  const _close_nav = () => _open_nav = false

</script>

<nav class="sticky top-0 lg:-top-16 z-50">
  <nav class="navbar lg:justify-center bg-neutral py-0">
    <div class="max-lg:flex-1"><a class="p-2" href="/" on:click={_close_nav}><img class="h-12" src={`${PUBLIC_BASE_URL}assets/templates/magazine/images/logo-diabetes2.svg`} alt="diabetes.hu"></a></div>
    <label for="mobile-nav" aria-label="open sidebar" class="btn btn-square btn-ghost lg:hidden text-neutral-content">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        class="h-6 w-6 stroke-current">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M4 6h16M4 12h16M4 18h16"></path>
      </svg>
    </label>
  </nav>
  <nav class="lg:navbar min--h-0 bg-neutral text-neutral-content">
    <input id="mobile-nav" type="checkbox" bind:checked={_open_nav}/>
    <ul class="mx-auto max-lg:max-w-xl">
      {#each Object.keys(cats) as cat}
        <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
        <li tabindex="0" class="grow max-lg:collapse collapse-arrow dropdown dropdown-hover last:dropdown-end w--min text-nowrap"><!-- lg:inline-block  on:blur={_uncheck} -->
          <input type="radio" name="collapse" class="lg:hidden"/>
          <div tabindex="0" role="button" class="max-lg:collapse-title lg:menu-title !text-neutral-content text-nowrap font-medium">{cat}</div>
          <ul tabindex="0" class="menu flex-nowrap max-lg:collapse-content lg:dropdown-content lg:rounded-box bg-neutral p-0">
            {#each Object.keys(cats[cat]) as subcat}
              <li class=""><a class="text-nowrap" href={cats[cat][subcat]} on:click={_close_nav}>{subcat}</a></li>
            {/each}
          </ul>
        </li>
      {/each}
    </ul>
  </nav>
</nav>

<!--<ul class="lg:!h-auto">
  <li class="collapse w-min border-base-300 border">
    <input type="checkbox" name="menu-accordion" on:blur={_dropup} />
    <div class="collapse-title w-min text-xl font-medium">Kezelés</div>
    <ul class="collapse-content w-min p-0">
      <li><a><s>Inzulinok</s></a></li>
      <li><a><s>Gyógyszerek</s></a></li>
      <li><a><s>Technikai eszközök</s></a></li>
      <li><a href="/orvos-beteg">Orvos–beteg kapcsolat</a></li>
      <li><a href="/önellenőrzés">Önmenedzselés</a></li>
    </ul>
  </li>
  <li class="collapse w-min border-base-300 border">
    <input type="checkbox" name="menu-accordion" on:blur={_dropup} />
    <div class="collapse-title w-min text-xl font-medium">Életmód</div>
    <ul class="collapse-content w-min p-0">
      <li><a href="/recept">Receptek</a></li>
      <li><a href="/táplálkozás">Táplálkozás</a></li>
      <li><a href="/testmozgás">Testmozgás</a></li>
      <li><a href="/psziché">Psziché</a></li>
      <li><a href="/jog">Jogi útmutatók</a></li>
    </ul>
  </li>
  <li class="collapse w-min border-base-300 border">
    <input type="checkbox" name="menu-accordion" on:blur={_dropup} />
    <div class="collapse-title w-min text-xl font-medium">Szövődmények</div>
    <ul class="collapse-content w-min p-0">
      <li><a href="/idegrendszer">Idegrendszer</a></li>
      <li><a href="/vese">Vese</a></li>
      <li><a href="/látás">Látás</a></li>
      <li><a href="/végtag">Végtagok</a></li>
      <li><a href="/hypertonia">Szív-érrendszer</a></li>
      <li><a href="/társbetegségek">Társbetegségek</a></li>
    </ul>
  </li>
  <li class="collapse w-min border-base-300 border">
    <input type="checkbox" name="menu-accordion" on:blur={_dropup} />
    <div class="collapse-title w-min text-xl font-medium">Közösségi élet</div>
    <ul class="collapse-content w-min p-0">
      <li><a href="/egyesület">Egyesületek</a></li>
      <li><a href="/közösség">Közösség</a></li>
      <li><a href="/esemény">Események</a></li>
      <li><a href="/rendezvény">Rendezvények</a></li>
    </ul>
  </li>
  <li class="collapse w-min border-base-300 border">
    <input type="checkbox" name="menu-accordion" on:blur={_dropup} />
    <div class="collapse-title w-min text-xl font-medium">Portrék</div>
    <ul class="collapse-content w-min p-0">
      <li><a href="/portrék">Gyógyítók</a></li>
      <li><a href="/sorstársak">Sorstársak</a></li>
    </ul>
  </li>
  <li class="collapse w-min border-base-300 border">
    <input type="checkbox" name="menu-accordion" on:blur={_dropup} />
    <div class="collapse-title w-min text-xl font-medium">Gyermekvállalás</div>
    <ul class="collapse-content w-min p-0">
      <li><a><s>Gesztációs diabétesz</s></a></li>
      <li><a><s>Várandósság cukorbetegséggel</s></a></li>
    </ul>
  </li>
  <li class="collapse w-min border-base-300 border">
    <input type="checkbox" name="menu-accordion" on:blur={_dropup} />
    <div class="collapse-title w-min text-xl font-medium">Impresszum</div>
    <ul class="collapse-content w-min p-0">
          <li><a><s>Alapítvány a Cukorbetegekért</s></a></li>
          <li><a><s>Tudomány Kiadó</s></a></li>
          <li><a><s>Portmed</s></a></li>
    </ul>
  </li>
</ul>-->

<style>
  #mobile-nav {
    display: none!important;
  }
  /* FIX: last:dropdown-end */
  .last\:dropdown-end:last-of-type .lg\:dropdown-content {
    /*display: none;*/
    /*@apply dropdown-end;*/
    inset-inline-end: 0px!important;
  }
  a:hover {
    outline-offset: 0;
    outline-width: 0;
  }
  @media (max-width: 1023px)  {
    #mobile-nav ~ ul {
      transition: height 0.5s ease-in;
      overflow: hidden;
      height: 0;
    }
    #mobile-nav:checked ~ ul {
      height: auto;
      height: calc-size(auto, size);
    }
    li input:checked ~ ul {
      visibility: visible!important;
    }
  }

</style>