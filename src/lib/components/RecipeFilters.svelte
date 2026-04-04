<script lang="ts">
  import PaywallCTA from '$lib/components/PaywallCTA.svelte'

  type RecipeFiltersState = {
    maxEnergy: number
    maxCarbs: number
    minProtein: number
    ingredient: string
    sortBy: 'title' | 'energy' | 'protein' | 'carbs' | 'year'
  }

  let { filters = $bindable(), hasAccess = false }: { filters: RecipeFiltersState; hasAccess?: boolean } = $props()

  let expanded = $state(false)

  const presets = [
    { label: 'Alacsony kalória (<200 kcal)', action: () => { filters.maxEnergy = 200; filters.sortBy = 'energy' } },
    { label: 'Kevés szénhidrát (<20 g)', action: () => { filters.maxCarbs = 20; filters.sortBy = 'carbs' } },
    { label: 'Magas fehérje (>15 g)', action: () => { filters.minProtein = 15; filters.sortBy = 'protein' } },
  ]

  function resetFilters() {
    filters.maxEnergy = 0
    filters.maxCarbs = 0
    filters.minProtein = 0
    filters.ingredient = ''
    filters.sortBy = 'title'
  }

  const isFiltering = $derived(
    filters.maxEnergy > 0 || filters.maxCarbs > 0 || filters.minProtein > 0 || filters.ingredient.trim() !== ''
  )
</script>

<div class="max-w-3xl mx-auto px-4 mb-6">
  <div class="flex flex-wrap gap-2 justify-center mb-2">
    {#each presets as preset}
      <button
        class="btn btn-sm btn-outline"
        onclick={() => { expanded = true; preset.action() }}
        disabled={!hasAccess}
      >
        {preset.label}
        {#if !hasAccess}
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-3.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
          </svg>
        {/if}
      </button>
    {/each}
    <button
      class="btn btn-sm btn-ghost"
      onclick={() => expanded = !expanded}
    >
      {expanded ? 'Szűrők elrejtése' : 'Egyéni szűrők'}
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-4">
        <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
      </svg>
    </button>
  </div>

  {#if expanded}
    {#if hasAccess}
      <div class="card bg-base-200 p-4 mt-2">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label class="form-control">
            <span class="label-text text-xs">Max. energia (kcal) {filters.maxEnergy > 0 ? `≤ ${filters.maxEnergy}` : ''}</span>
            <input type="range" min="0" max="600" step="25" bind:value={filters.maxEnergy} class="range range-xs range-primary" />
          </label>

          <label class="form-control">
            <span class="label-text text-xs">Max. szénhidrát (g) {filters.maxCarbs > 0 ? `≤ ${filters.maxCarbs}` : ''}</span>
            <input type="range" min="0" max="80" step="5" bind:value={filters.maxCarbs} class="range range-xs range-primary" />
          </label>

          <label class="form-control">
            <span class="label-text text-xs">Min. fehérje (g) {filters.minProtein > 0 ? `≥ ${filters.minProtein}` : ''}</span>
            <input type="range" min="0" max="40" step="5" bind:value={filters.minProtein} class="range range-xs range-primary" />
          </label>

          <label class="form-control">
            <span class="label-text text-xs">Összetevő keresése</span>
            <input type="text" placeholder="pl. csirkemell" bind:value={filters.ingredient} class="input input-sm input-bordered" />
          </label>
        </div>

        <div class="flex flex-wrap gap-2 mt-4 items-center justify-between">
          <label class="form-control">
            <span class="label-text text-xs">Rendezés</span>
            <select bind:value={filters.sortBy} class="select select-sm select-bordered">
              <option value="title">Név (A–Z)</option>
              <option value="energy">Energia (növekvő)</option>
              <option value="protein">Fehérje (csökkenő)</option>
              <option value="carbs">Szénhidrát (növekvő)</option>
              <option value="year">Év (legújabb)</option>
            </select>
          </label>

          {#if isFiltering}
            <button class="btn btn-sm btn-ghost" onclick={resetFilters}>
              Szűrők törlése
            </button>
          {/if}
        </div>
      </div>
    {:else}
      <div class="mt-2">
        <PaywallCTA context="filter" />
      </div>
    {/if}
  {/if}
</div>

<style>
  .form-control {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
</style>
