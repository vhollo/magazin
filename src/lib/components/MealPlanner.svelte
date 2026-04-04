<script lang="ts">
  import NutritionTable from '$lib/components/NutritionTable.svelte'
  import PaywallCTA from '$lib/components/PaywallCTA.svelte'
  import { hasReceptsarokAccess } from '$lib/authStore'
  import type { Recipe } from '$lib/receptsarok'

  let { recipes = [] }: { recipes?: Recipe[] } = $props()

  const days = ['Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat', 'Vasárnap']

  let plan = $state<Record<string, Recipe[]>>(
    Object.fromEntries(days.map((d) => [d, [] as Recipe[]]))
  )

  function addToDay(day: string, recipe: Recipe) {
    if (!plan[day].find((r: Recipe) => r.id === recipe.id && r.year === recipe.year)) {
      plan[day] = [...plan[day], recipe]
    }
  }

  function removeFromDay(day: string, index: number) {
    plan[day] = plan[day].filter((_: Recipe, i: number) => i !== index)
  }

  function clearPlan() {
    for (const day of days) {
      plan[day] = []
    }
  }

  const dayTotals = $derived(
    Object.fromEntries(days.map(day => {
      const totals = plan[day].reduce((acc, r) => ({
        energy: acc.energy + r.energy,
        protein: acc.protein + r.protein,
        fat: acc.fat + r.fat,
        saturatedFat: acc.saturatedFat + r.saturatedFat,
        carbs: acc.carbs + r.carbs,
        fiber: acc.fiber + r.fiber,
      }), { energy: 0, protein: 0, fat: 0, saturatedFat: 0, carbs: 0, fiber: 0 })
      return [day, totals]
    }))
  )

  const weekTotal = $derived(
    Object.values(dayTotals).reduce((acc, d) => ({
      energy: acc.energy + d.energy,
      protein: acc.protein + d.protein,
      fat: acc.fat + d.fat,
      saturatedFat: acc.saturatedFat + d.saturatedFat,
      carbs: acc.carbs + d.carbs,
      fiber: acc.fiber + d.fiber,
    }), { energy: 0, protein: 0, fat: 0, saturatedFat: 0, carbs: 0, fiber: 0 })
  )

  const usedDays = $derived(days.filter(d => plan[d].length > 0).length)

  const shoppingList = $derived.by(() => {
    const ingredients: Record<string, { amount: number; unit: string }> = {}
    for (const day of days) {
      for (const recipe of plan[day]) {
        for (const group of recipe.ingredientGroups || []) {
          for (const item of group.items) {
            const key = item.name.toLowerCase()
            if (!ingredients[key]) {
              ingredients[key] = { amount: 0, unit: item.unit || '' }
            }
            if (item.amount) {
              ingredients[key].amount += item.amount
            }
          }
        }
      }
    }
    return Object.entries(ingredients)
      .sort(([a], [b]) => a.localeCompare(b, 'hu'))
      .map(([name, { amount, unit }]) => ({
        name,
        text: amount > 0 ? `${amount} ${unit} ${name}` : name
      }))
  })

  let searchQuery = $state('')
  const searchResults = $derived(
    searchQuery.length < 2
      ? []
      : recipes
          .filter(r => r.title.toLowerCase().includes(searchQuery.toLowerCase())
            || r.searchTerms?.some(t => t.includes(searchQuery.toLowerCase()))
          )
          .slice(0, 8)
  )

  let activeDay = $state(days[0])
</script>

{#if !$hasReceptsarokAccess}
  <PaywallCTA context="planner" />
{:else}
  <div class="max-w-5xl mx-auto">
    <div class="flex flex-wrap gap-2 items-center justify-between mb-4">
      <h3 class="text-lg font-semibold">Heti étlaptervező</h3>
      {#if usedDays > 0}
        <button class="btn btn-ghost btn-sm" onclick={clearPlan}>Terv törlése</button>
      {/if}
    </div>

    <div class="mb-4">
      <input
        type="text"
        placeholder="Recept keresése hozzáadáshoz..."
        bind:value={searchQuery}
        class="input input-bordered w-full"
      />
      {#if searchResults.length > 0}
        <div class="card bg-base-200 mt-1 max-h-48 overflow-y-auto">
          {#each searchResults as recipe}
            <button
              class="flex items-center gap-2 p-2 hover:bg-base-300 w-full text-left"
              onclick={() => { addToDay(activeDay, recipe); searchQuery = '' }}
            >
              <span class="flex-1 truncate text-sm">{recipe.title}</span>
              <span class="text-xs opacity-50">{recipe.energy} kcal</span>
              <span class="text-xs opacity-40">+ {activeDay}</span>
            </button>
          {/each}
        </div>
      {/if}
    </div>

    <div class="flex gap-1 mb-4 overflow-x-auto">
      {#each days as day}
        <button
          class="btn btn-sm"
          class:btn-primary={activeDay === day}
          class:btn-ghost={activeDay !== day}
          onclick={() => activeDay = day}
        >
          {day}
          {#if plan[day].length > 0}
            <span class="badge badge-xs">{plan[day].length}</span>
          {/if}
        </button>
      {/each}
    </div>

    <div class="grid md:grid-cols-2 gap-4">
      <div>
        <h4 class="font-medium mb-2">{activeDay} receptjei</h4>
        {#if plan[activeDay].length === 0}
          <p class="text-sm opacity-50 py-4">Még nincs hozzáadott recept. Keress fent és adj hozzá!</p>
        {:else}
          <div class="flex flex-col gap-2">
            {#each plan[activeDay] as recipe, i}
              <div class="card card-side bg-base-200 p-2 rounded-sm">
                <div class="flex-1">
                  <a href="/receptsarok/{recipe.category}/{recipe.year}-{recipe.id}" class="font-medium text-sm hover:underline">
                    {recipe.title}
                  </a>
                  <p class="text-xs opacity-50">{recipe.energy} kcal · {recipe.protein}g F · {recipe.carbs}g Sz</p>
                </div>
                <button class="btn btn-ghost btn-xs" onclick={() => removeFromDay(activeDay, i)} aria-label="Törlés">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-4">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            {/each}
          </div>
        {/if}

        {#if plan[activeDay].length > 0}
          <div class="mt-4 p-3 bg-base-200 rounded-sm">
            <p class="text-sm font-medium mb-1">{activeDay} összesen:</p>
            <NutritionTable compact table={{
              label: '',
              ...dayTotals[activeDay]
            }} />
          </div>
        {/if}
      </div>

      <div>
        {#if usedDays > 0}
          <h4 class="font-medium mb-2">Heti összesítés</h4>
          <div class="p-3 bg-base-200 rounded-sm mb-4">
            <NutritionTable compact table={{
              label: '',
              ...weekTotal
            }} />
            {#if usedDays > 0}
              <p class="text-xs opacity-50 mt-2">Napi átlag: {Math.round(weekTotal.energy / usedDays)} kcal</p>
            {/if}
          </div>

          {#if shoppingList.length > 0}
            <h4 class="font-medium mb-2">Bevásárlólista ({shoppingList.length} tétel)</h4>
            <div class="p-3 bg-base-200 rounded-sm max-h-64 overflow-y-auto">
              <ul class="text-sm space-y-0.5">
                {#each shoppingList as item}
                  <li>{item.text}</li>
                {/each}
              </ul>
            </div>
          {/if}
        {:else}
          <div class="text-center py-8 opacity-40">
            <p>Adj hozzá recepteket a napi tervhez a heti összesítés és bevásárlólista megjelenítéséhez.</p>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}
