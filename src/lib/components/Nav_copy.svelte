<script>
  import { PUBLIC_BASE_URL } from '$env/static/public'
  //export let data

  function _dropdown(event){
    const targets = document.getElementsByClassName('menu-dropdown-toggle')
    for (let t in targets) t => t.classlist.toggle('menu-dropdown-show')
    const target = event.target//.parentElement.nextSibling
    console.log(target.nextElementSibling)
    target.classList.toggle('menu-dropdown-show')
    target.nextElementSibling.classList.toggle('menu-dropdown-show')
  }

</script>

<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<nav class="navbar bg-neutral pt-1 pb-0 min-h-0">
  <div class="flex-1 mx-auto"><a class="p-2" href="/"><img class="h-12" src={`${PUBLIC_BASE_URL}assets/templates/magazine/images/logo-diabetes2.svg`} alt="diabetes.hu"></a></div>
  <!--<div class="flex-none lg:hidden">-->
  <label for="my-drawer" aria-label="open sidebar" class="btn btn-square btn-ghost flex-none lg:hidden text-neutral-content">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      class="inline-block h-6 w-6 stroke-current">
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M4 6h16M4 12h16M4 18h16"></path>
    </svg>
  </label>
  <!--</div>-->
</nav>

<nav class="navbar topics flex-none bg-neutral py-0 min-h-0 text-neutral-content">
  <!--<label for="my-drawer" aria-label="close sidebar" class="drawer-overlay"></label>-->
  <input id="my-drawer" type="checkbox" class="drawer-toggle" />
  <ul class="menu w-full h-0 l-g:-!h-auto p-0 menu-vertical lg:menu-horizontal lg:mx-auto">
    <!--<li class="dropdown">
      <div tabindex="0" class="menu-dropdown-toggle" on:click={_dropdown} class="m-1">
        <a href="/" class="btn btn-sm">Kezdőlap</a>
      </div>
    </li>-->
    <li class="w-full lg:w-min lg:dropdown lg:dropdown-right">
      <div role="button" tabindex="0" class="menu-dropdown-toggle" on:click={_dropdown}>Kezelés</div>
        <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
        <ul tabindex="0" class="menu-dropdown lg:dropdown-content z-[1] menu p-2 w-full lg:w-56 bg-neutral">
          <!-- svelte-ignore a11y-missing-attribute -->
          <li><a><s>Inzulinok</s></a></li>
          <!-- svelte-ignore a11y-missing-attribute -->
          <li><a><s>Gyógyszerek</s></a></li>
          <!-- svelte-ignore a11y-missing-attribute -->
          <li><a><s>Technikai eszközök</s></a></li>
          <li><a href="/orvos-beteg">Orvos–beteg kapcsolat</a></li>
          <li><a href="/önellenőrzés">Önmenedzselés</a></li>
        </ul>
    </li>
    <li class="w-full lg:w-min">
      <div tabindex="0" class="menu-dropdown-toggle" on:click={_dropdown}>Életmód</div>
        <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
        <ul tabindex="0" class="menu-dropdown lg:dropdown-content z-[1] menu p-2 w-full lg:w-56 bg-neutral">
          <li><a href="/recept">Receptek</a></li>
          <li><a href="/táplálkozás">Táplálkozás</a></li>
          <li><a href="/testmozgás">Testmozgás</a></li>
          <li><a href="/psziché">Psziché</a></li>
          <li><a href="/jog">Jogi útmutatók</a></li>
        </ul>
    </li>
    <li class="w-full lg:w-min">
      <div tabindex="0" class="menu-dropdown-toggle" on:click={_dropdown}>Szövődmények</div>
        <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
        <ul tabindex="0" class="menu-dropdown z-[1] menu p-2 w-full lg:w-56 bg-neutral">
          <li><a href="/idegrendszer">Idegrendszer</a></li>
          <li><a href="/vese">Vese</a></li>
          <li><a href="/látás">Látás</a></li>
          <li><a href="/végtag">Végtagok</a></li>
          <li><a href="/hypertonia">Szív-érrendszer</a></li>
          <li><a href="/társbetegségek">Társbetegségek</a></li>
        </ul>
    </li>
    <li class="w-full lg:w-min">
      <div tabindex="0" class="menu-dropdown-toggle" on:click={_dropdown}>Közösségi élet</div>
        <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
        <ul tabindex="0" class="menu-dropdown z-[1] menu p-2 w-full lg:w-56 bg-neutral">
          <li><a href="/egyesület">Egyesületek</a></li>
          <li><a href="/közösség">Közösség</a></li>
          <li><a href="/esemény">Események</a></li>
          <li><a href="/rendezvény">Rendezvények</a></li>
        </ul>
    </li>
    <li class="w-full lg:w-min">
      <div tabindex="0" class="menu-dropdown-toggle" on:click={_dropdown}>Portrék</div>
        <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
        <ul tabindex="0" class="menu-dropdown z-[1] menu p-2 w-full lg:w-56 bg-neutral">
          <li><a href="/portrék">Gyógyítók</a></li>
          <li><a href="/sorstársak">Sorstársak</a></li>
        </ul>
    </li>
    <li class="w-full lg:w-min">
      <div tabindex="0" class="menu-dropdown-toggle" on:click={_dropdown}>Gyermekvállalás</div>
        <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
        <ul tabindex="0" class="menu-dropdown z-[1] menu p-2 w-full lg:w-56 bg-neutral">
          <!-- svelte-ignore a11y-missing-attribute -->
          <li><a><s>Gesztációs diabétesz</s></a></li>
          <!-- svelte-ignore a11y-missing-attribute -->
          <li><a><s>Várandósság cukorbetegséggel</s></a></li>
        </ul>
    </li>
    <li class="w-full lg:w-min">
      <div tabindex="0" class="menu-dropdown-toggle" on:click={_dropdown}>Impresszum</div>
        <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
        <ul tabindex="0" class="menu-dropdown z-[1] menu p-2 w-full lg:w-56 bg-neutral">
          <!-- svelte-ignore a11y-missing-attribute -->
          <li><a><s>Alapítvány a Cukorbetegekért</s></a></li>
          <!-- svelte-ignore a11y-missing-attribute -->
          <li><a><s>Tudomány Kiadó</s></a></li>
          <!-- svelte-ignore a11y-missing-attribute -->
          <li><a><s>Portmed</s></a></li>
        </ul>
    </li>
  </ul>
</nav>

<style>
  nav.topics {
  }
  /*nav.topics {
    position: sticky;
    top: 0;
    z-index: 1;
    overflow-x: scroll;
  }*/
  #my-drawer + ul {
    transition: height 0.5s ease-in;
    overflow: hidden;
  }
  #my-drawer:checked + ul {
    height: calc-size(auto, size);
  }
  /*.menu-dropdown-toggle + ul {
    display: none;
  }*/
  /*.menu-dropdown-toggle:focus + ul, .menu-dropdown-toggle:focus-within + ul {
    display: flex;
  }*/
</style>