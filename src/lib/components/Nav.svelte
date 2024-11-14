<script>
  //export let data
</script>

<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<nav class="navbar">
  <ul class=" mx-auto">
    <li class="dropdown">
      <div tabindex="0" role="button" class="btn, m-1">
        <a href="/" class="menu">Kezdőlap</a>
      </div>
    </li>
    <li class="dropdown dropdown-start">
      <div tabindex="0" role="button" class="btn m-1">Kezelés</div>
        <ul tabindex="0" class="dropdown-content z-[1] menu p-2 shadow rounded-box w-56  bg-base-100">
          <li>Inzulinok</li>
          <li>Gyógyszerek</li>
          <li>Technikai eszközök</li>
          <li><a href="/családorvos">Orvos–beteg kapcsolat</a></li>
          <li><a href="/önellenőrzés">Önmenedzselés</a></li>
        </ul>
    </li>
    <li class="dropdown dropdown-start">
      <div tabindex="0" role="button" class="btn m-1">Életmód</div>
        <ul tabindex="0" class="dropdown-content z-[1] menu p-2 shadow rounded-box w-56  bg-base-100">
          <li><a href="/recept">Receptek</a></li>
          <li><a href="/táplálkozás">Táplálkozás</a></li>
          <li><a href="/testmozgás">Testmozgás</a></li>
          <li><a href="/jog">Jogi útmutatók</a></li>
        </ul>
    </li>
    <li class="dropdown dropdown-start">
      <div tabindex="0" role="button" class="btn m-1">Szövődmények</div>
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
      <div tabindex="0" role="button" class="btn m-1">Közösségi élet</div>
        <ul tabindex="0" class="dropdown-content z-[1] menu p-2 shadow rounded-box w-56  bg-base-100">
          <li><a href="/egyesület-klub">Egyesületek-klubok (felnőtt, gyerek)</a></li>
          <li><a href="/esemény">Események</a></li>
          <li><a href="/rendezvény">Rendezvények</a></li>
          <li></li>
          <li></li>
          <li></li>
        </ul>
    </li>
    <li class="dropdown dropdown-end">
      <div tabindex="0" role="button" class="btn m-1">Portrék</div>
        <ul tabindex="0" class="dropdown-content z-[1] menu p-2 shadow rounded-box w-56  bg-base-100">
          <li>Gyógyítók</li>
          <li>Példaképek</li>
        </ul>
    </li>
    <li class="dropdown dropdown-end">
      <div tabindex="0" role="button" class="btn m-1">Gyermekvállalás</div>
        <ul tabindex="0" class="dropdown-content z-[1] menu p-2 shadow rounded-box w-56  bg-base-100">
          <li>Gesztációs diabétesz</li>
          <li>Várandósság cukorbetegséggel</li>
        </ul>
    </li>
    <li class="dropdown dropdown-end">
      <div tabindex="0" role="button" class="btn m-1">Impresszum</div>
        <ul tabindex="0" class="dropdown-content z-[1] menu p-2 shadow rounded-box w-56  bg-base-100">
          <li>Alapítvány a Cukorbetegekért</li>
          <li>Tudomány Kiadó</li>
          <li>Portmed</li>
        </ul>
    </li>
  </ul>
</nav>

<style>
  /*nav {
    overflow: auto hidden;
  }*/
  /*nav ul {
    max-width: 100%;
    overflow-x: auto;

    height: auto;
  }*/
</style>