<script lang="ts">
  import { authUser } from '$lib/authStore'
  export let context: 'recipe' | 'filter' | 'planner' = 'recipe'

  const messages = {
    recipe: {
      title: 'Prémium recept',
      body: 'A hozzávalók és az elkészítés megtekintéséhez előfizetés szükséges.',
      cta: 'Előfizetés'
    },
    filter: {
      title: 'Prémium szűrők',
      body: 'A tápanyag-szűrés és az összetevő-keresés előfizetőknek érhető el.',
      cta: 'Előfizetés'
    },
    planner: {
      title: 'Étlaptervező',
      body: 'A heti étlaptervező és a bevásárlólista előfizetőknek érhető el.',
      cta: 'Előfizetés'
    }
  }

  $: msg = messages[context]
</script>

<div class="card bg-base-300 shadow-md">
  <div class="card-body items-center text-center gap-4 py-8">
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-10 opacity-40">
      <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
    </svg>
    <h3 class="text-lg font-semibold">{msg.title}</h3>
    <p class="max-w-sm">{msg.body}</p>
    {#if !$authUser}
      <p class="text-sm opacity-60">Először jelentkezzen be, majd fizessen elő.</p>
    {/if}
    <a href="/elofizetes" class="btn btn-primary">{msg.cta}</a>
    <p class="text-xs opacity-50">A Receptsarok 2025 receptjei ingyenesen elérhetők.</p>
  </div>
</div>
