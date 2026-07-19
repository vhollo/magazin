<script lang="ts">
  import PaywallCTA from '$lib/components/PaywallCTA.svelte'

  type SortKey = 'title' | 'energy' | 'protein' | 'carbs' | 'year'
  type RecipeFiltersState = {
    maxEnergy: number
    maxCarbs: number
    minProtein: number
    ingredient: string
    sortBy: SortKey
  }
  type DimensionKey = 'maxEnergy' | 'maxCarbs' | 'minProtein'
  type Dimension = {
    key: DimensionKey
    name: string
    sliderLabel: string
    unit: string
    dir: '≤' | '≥'
    preset: number
    sort: SortKey
    max: number
    step: number
  }

  let { filters = $bindable(), hasAccess = false }: { filters: RecipeFiltersState; hasAccess?: boolean } = $props()

  let expanded = $state(false)
  let sortTouched = $state(false)

  const dimensions: Dimension[] = [
    { key: 'maxEnergy',  name: 'Kalória',    sliderLabel: 'Max. energia (kcal)',    unit: 'kcal', dir: '≤', preset: 200, sort: 'energy',  max: 600, step: 25 },
    { key: 'maxCarbs',   name: 'Szénhidrát', sliderLabel: 'Max. szénhidrát (g)',    unit: 'g',    dir: '≤', preset: 20,  sort: 'carbs',   max: 80,  step: 5 },
    { key: 'minProtein', name: 'Fehérje',    sliderLabel: 'Min. fehérje (g)',       unit: 'g',    dir: '≥', preset: 15,  sort: 'protein', max: 40,  step: 5 },
  ]

  function toggleDimension(dim: Dimension) {
    if (filters[dim.key] > 0) {
      filters[dim.key] = 0
      if (!sortTouched && filters.sortBy === dim.sort) {
        const other = dimensions.find((d) => d.key !== dim.key && filters[d.key] > 0)
        filters.sortBy = other ? other.sort : 'title'
      }
    } else {
      filters[dim.key] = dim.preset
      if (!sortTouched) filters.sortBy = dim.sort
    }
  }

  let dirty = $derived(
    filters.maxEnergy > 0 || filters.maxCarbs > 0 || filters.minProtein > 0 ||
    filters.ingredient.trim() !== '' || filters.sortBy !== 'title'
  )

  function resetFilters() {
    filters.maxEnergy = 0
    filters.maxCarbs = 0
    filters.minProtein = 0
    filters.ingredient = ''
    filters.sortBy = 'title'
    sortTouched = false
  }

</script>

<div class="mx-auto w-full max-w-4xl p-4 mb-6">
  <div class="flex flex-wrap gap-2 mb-2">
    {#each dimensions as dim (dim.key)}
      {@const active = filters[dim.key] > 0}
      <button
        class="btn btn-sm {active ? 'btn-primary' : 'btn-outline'}"
        aria-pressed={active}
        onclick={() => toggleDimension(dim)}
        disabled={!hasAccess}
      >
        {`${dim.name} ${dim.dir} ${active ? filters[dim.key] : dim.preset} ${dim.unit}`}
        {#if active}
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="size-3.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        {/if}
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
      <div class="card bg-base-300 p-4 mt-2">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="flex flex-col gap-4">
            {#each dimensions as dim (dim.key)}
              <label class="form-control">
                <span class="label-text text-xs">{dim.sliderLabel} {filters[dim.key] > 0 ? `${dim.dir} ${filters[dim.key]}` : ''}</span>
                <input type="range" min="0" max={dim.max} step={dim.step} bind:value={filters[dim.key]} class="range range-xs range-primary" />
              </label>
            {/each}
          </div>

          <div class="flex flex-col gap-4">
            <label class="form-control">
              <span class="label-text text-xs">Összetevő keresése</span>
              <input type="text" placeholder="pl. csirkemell" bind:value={filters.ingredient} class="input input-sm input-bordered" />
            </label>

            <label class="form-control">
              <span class="label-text text-xs">Rendezés</span>
              <select bind:value={filters.sortBy} onchange={() => sortTouched = true} class="select select-sm select-bordered">
                <option value="title">Név (A–Z)</option>
                <option value="energy">Energia (növekvő)</option>
                <option value="protein">Fehérje (csökkenő)</option>
                <option value="carbs">Szénhidrát (növekvő)</option>
                <option value="year">Év (legújabb)</option>
              </select>
            </label>

            <button class="btn btn-sm btn-ghost self-start" onclick={resetFilters} disabled={!dirty}>
              Szűrők törlése
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-4">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            </button>
          </div>
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
