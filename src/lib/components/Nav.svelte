<script>
  //export let data
</script>

<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<nav class="navbar">
  <ul class=" mx-auto">
    <li class="dropdown">
      <div tabindex="0" role="button" class="btn, m-1">
        <a href="/" class="menu menu-lg">Kezdőlap</a>
      </div>
    </li>
    <li class="dropdown dropdown-start">
      <div tabindex="0" role="button" class="btn m-1">Kezelés</div>
        <ul tabindex="0" class="dropdown-content z-[1] menu menu-lg p-2 shadow rounded-box w-56  bg-base-100">
          <li>Inzulinok</li>
          <li>Gyógyszerek</li>
          <li>Technikai eszközök</li>
          <li>Orvos–beteg kapcsolat</li>
          <li>Önmenedzselés</li>
        </ul>
    </li>
    <li class="dropdown dropdown-start">
      <div tabindex="0" role="button" class="btn m-1">Életmód</div>
        <ul tabindex="0" class="dropdown-content z-[1] menu menu-lg p-2 shadow rounded-box w-56  bg-base-100">
          <li>Étkezés</li>
          <li>Receptek</li>
          <li>Testmozgás</li>
          <li>Jogi útmutató</li>
        </ul>
    </li>
    <li class="dropdown dropdown-start">
      <div tabindex="0" role="button" class="btn m-1">Szövődmények</div>
        <ul tabindex="0" class="dropdown-content z-[1] menu menu-lg p-2 shadow rounded-box w-56  bg-base-100">
          <li>Idegrendszer</li>
          <li>Vese</li>
          <li>Látás</li>
          <li>Végtagok</li>
          <li>Szív-érrendszer</li>
          <li>Társbetegségek</li>
        </ul>
    </li>
    <li class="dropdown dropdown-center">
      <div tabindex="0" role="button" class="btn m-1">Közösségi élet</div>
        <ul tabindex="0" class="dropdown-content z-[1] menu menu-lg p-2 shadow rounded-box w-56  bg-base-100">
          <li>Egyesületek-klubok (felnőtt, gyerek)</li>
          <li>Események</li>
          <li>Rendezvények</li>
        </ul>
    </li>
    <li class="dropdown dropdown-end">
      <div tabindex="0" role="button" class="btn m-1">Portrék</div>
        <ul tabindex="0" class="dropdown-content z-[1] menu menu-lg p-2 shadow rounded-box w-56  bg-base-100">
          <li>Gyógyítók</li>
          <li>Példaképek</li>
        </ul>
    </li>
    <li class="dropdown dropdown-end">
      <div tabindex="0" role="button" class="btn m-1">Gyermekvállalás</div>
        <ul tabindex="0" class="dropdown-content z-[1] menu menu-lg p-2 shadow rounded-box w-56  bg-base-100">
          <li>Gesztációs diabétesz</li>
          <li>Terhesség cukorbetegséggel</li>
        </ul>
    </li>
    <li class="dropdown dropdown-end">
      <div tabindex="0" role="button" class="btn m-1">Impresszum</div>
        <ul tabindex="0" class="dropdown-content z-[1] menu menu-lg p-2 shadow rounded-box w-56  bg-base-100">
          <li>Alapítvány a Cukorbetegekért</li>
          <li>Tudomány Kiadó</li>
          <li>Portmed</li>
        </ul>
    </li>
  </ul>
</nav>

<style>
  nav {
    overflow: auto hidden;
  }
  /*nav ul {
    max-width: 100%;
    overflow-x: auto;

    height: auto;
  }*/
</style>