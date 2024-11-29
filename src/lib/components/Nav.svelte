<script>
  import { PUBLIC_BASE_URL } from '$env/static/public'
  //export let data
</script>

<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<nav class="navbar bg-neutral pt-1 pb-0 min-h-0">
  <ul class="mx-auto">
    <li class="dropdown">
      <div tabindex="0" role="button" class="btn btn-md m-1 btn-ghost">
        <a href="/"><img class="h-7" src={`${PUBLIC_BASE_URL}assets/templates/magazine/images/logo-diabetes2.svg`} alt="diabetes.hu"></a>
      </div>
    </li>
    <!--<li class="dropdown dropdown-start">
      <div tabindex="0" role="button" class="btn btn-sm m-1">Kezelés</div>
        <ul tabindex="0" class="dropdown-content z-[1] menu p-2 shadow rounded-box w-56  bg-base-100">
          <li>Inzulinok</li>
          <li>Gyógyszerek</li>
          <li>Technikai eszközök</li>
          <li><a href="/orvos-beteg">Orvos–beteg kapcsolat</a></li>
          <li><a href="/önellenőrzés">Önmenedzselés</a></li>
        </ul>
    </li>-->
  </ul>
</nav>
<nav class="navbar topics bg-neutral py-1 min-h-0">
  <ul class="mx-auto">
    <!--<li class="dropdown">
      <div tabindex="0" role="button" class="m-1">
        <a href="/" class="btn btn-sm">Kezdőlap</a>
      </div>
    </li>-->
    <li class="dropdown dropdown-start">
      <div tabindex="0" role="button" class="btn btn-sm m-1">Kezelés</div>
        <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
        <ul tabindex="0" class="dropdown-content z-[1] menu p-2 shadow rounded-box w-56  bg-base-100">
          <li>Inzulinok</li>
          <li>Gyógyszerek</li>
          <li>Technikai eszközök</li>
          <li><a href="/orvos-beteg">Orvos–beteg kapcsolat</a></li>
          <li><a href="/önellenőrzés">Önmenedzselés</a></li>
        </ul>
    </li>
    <li class="dropdown dropdown-start">
      <div tabindex="0" role="button" class="btn btn-sm m-1">Életmód</div>
        <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
        <ul tabindex="0" class="dropdown-content z-[1] menu p-2 shadow rounded-box w-56  bg-base-100">
          <li><a href="/recept">Receptek</a></li>
          <li><a href="/táplálkozás">Táplálkozás</a></li>
          <li><a href="/testmozgás">Testmozgás</a></li>
          <li><a href="/psziché">Psziché</a></li>
          <li><a href="/jog">Jogi útmutatók</a></li>
        </ul>
    </li>
    <li class="dropdown dropdown-start">
      <div tabindex="0" role="button" class="btn btn-sm m-1">Szövődmények</div>
        <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
        <ul tabindex="0" class="dropdown-content z-[1] menu p-2 shadow rounded-box w-56  bg-base-100">
          <li><a href="/idegrendszer">Idegrendszer</a></li>
          <li><a href="/vese">Vese</a></li>
          <li><a href="/látás">Látás</a></li>
          <li><a href="/végtag">Végtagok</a></li>
          <li><a href="/hypertonia">Szív-érrendszer</a></li>
          <li><a href="/társbetegségek">Társbetegségek</a></li>
        </ul>
    </li>
    <li class="dropdown dropdown-center">
      <div tabindex="0" role="button" class="btn btn-sm m-1">Közösségi élet</div>
        <ul tabindex="0" class="dropdown-content z-[1] menu p-2 shadow rounded-box w-56  bg-base-100">
          <li><a href="/egyesület">Egyesületek</a></li>
          <li><a href="/közösség">Közösség</a></li>
          <li><a href="/esemény">Események</a></li>
          <li><a href="/rendezvény">Rendezvények</a></li>
        </ul>
    </li>
    <li class="dropdown dropdown-end">
      <div tabindex="0" role="button" class="btn btn-sm m-1">Portrék</div>
        <ul tabindex="0" class="dropdown-content z-[1] menu p-2 shadow rounded-box w-56  bg-base-100">
          <li><a href="/portrék">Gyógyítók</a></li>
          <li><a href="/sorstársak">Sorstársak</a></li>
        </ul>
    </li>
    <li class="dropdown dropdown-end">
      <div tabindex="0" role="button" class="btn btn-sm m-1">Gyermekvállalás</div>
        <ul tabindex="0" class="dropdown-content z-[1] menu p-2 shadow rounded-box w-56  bg-base-100">
          <li>Gesztációs diabétesz</li>
          <li>Várandósság cukorbetegséggel</li>
        </ul>
    </li>
    <li class="dropdown dropdown-end">
      <div tabindex="0" role="button" class="btn btn-sm m-1">Impresszum</div>
        <ul tabindex="0" class="dropdown-content z-[1] menu p-2 shadow rounded-box w-56  bg-base-100">
          <li>Alapítvány a Cukorbetegekért</li>
          <li>Tudomány Kiadó</li>
          <li>Portmed</li>
        </ul>
    </li>
  </ul>
</nav>

<style>
  nav.topics {
    position: sticky;
    top: 0;
    z-index: 1;
  }
  /*nav {
    overflow: auto hidden;
  }*/
  /*nav ul {
    max-width: 100%;
    overflow-x: auto;

    height: auto;
  }*/
</style>