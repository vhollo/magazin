<script lang="ts">
  import { browser } from '$app/environment'
  import NutritionTable from '$lib/components/NutritionTable.svelte'
  import PaywallCTA from '$lib/components/PaywallCTA.svelte'
  import { hasReceptsarokAccess, uid } from '$lib/authStore'
  import { firebaseAuth } from '$lib/firebase'
  import {
    MEAL_PLANNER_DAYS,
    type MealPlanByDay,
    type MealPlannerDay,
    mealPlanAddRecipe,
    mealPlanClearAll,
    mealPlanRefs,
    mealPlanRemoveRecipeRef,
    syncMealPlanStorage,
  } from '$lib/mealPlannerStore'
  import { recipeDetailPath, type Category, type Recipe, type RecipeLayoutEntry } from '$lib/receptsarok'
  import { get } from 'svelte/store'

  let {
    recipes: _layoutRecipes = [],
    categories = [],
  }: { recipes?: RecipeLayoutEntry[]; categories?: Category[] } = $props()

  const days = MEAL_PLANNER_DAYS

  let fullCatalog = $state<Recipe[] | null>(null)
  let catalogLoading = $state(false)
  let catalogError = $state(false)

  let planRefs = $state<MealPlanByDay>(get(mealPlanRefs))
  $effect(() => {
    return mealPlanRefs.subscribe((v) => {
      planRefs = v
    })
  })

  $effect(() => {
    if (!browser) return
    if (!$hasReceptsarokAccess || !$uid) {
      syncMealPlanStorage(undefined)
      return
    }
    syncMealPlanStorage($uid)
  })

  const plan = $derived.by(() => {
    const empty: Record<string, Recipe[]> = Object.fromEntries(days.map((d) => [d, [] as Recipe[]]))
    if (!fullCatalog) return empty
    const byKey = new Map(fullCatalog.map((r) => [`${r.year}:${r.id}`, r]))
    for (const day of days) {
      const refs = planRefs?.[day] ?? []
      empty[day] = refs
        .map((ref) => byKey.get(`${ref.year}:${ref.id}`))
        .filter((r): r is Recipe => !!r)
    }
    return empty
  })

  $effect(() => {
    if (!browser) return
    if (!$hasReceptsarokAccess) {
      fullCatalog = null
      catalogLoading = false
      catalogError = false
      return
    }
    if (!$uid) {
      catalogLoading = true
      fullCatalog = null
      catalogError = false
      return
    }
    let cancelled = false
    catalogLoading = true
    catalogError = false
    fullCatalog = null
    ;(async () => {
      try {
        const user = firebaseAuth.currentUser
        if (!user) {
          if (!cancelled) {
            catalogLoading = false
            catalogError = true
          }
          return
        }
        const token = await user.getIdToken()
        const res = await fetch('/api/receptsarok/recipes', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (cancelled) return
        if (res.ok) {
          const j = await res.json()
          fullCatalog = j.recipes as Recipe[]
        } else {
          catalogError = true
        }
      } catch {
        if (!cancelled) catalogError = true
      } finally {
        if (!cancelled) catalogLoading = false
      }
    })()
    return () => {
      cancelled = true
    }
  })

  function addToDay(day: string, recipe: Recipe) {
    mealPlanAddRecipe(day, { year: recipe.year, id: recipe.id })
  }

  function removeFromDay(day: string, recipe: Recipe) {
    mealPlanRemoveRecipeRef(day, { year: recipe.year, id: recipe.id })
  }

  const dayTotals = $derived(
    Object.fromEntries(days.map(day => {
      const totals = plan[day].reduce((acc, r) => ({
        // Missing values are stored as `null` now — treat them as 0 for totals.
        energy: acc.energy + (r.energy ?? 0),
        protein: acc.protein + (r.protein ?? 0),
        fat: acc.fat + (r.fat ?? 0),
        saturatedFat: acc.saturatedFat + (r.saturatedFat ?? 0),
        carbs: acc.carbs + (r.carbs ?? 0),
        fiber: acc.fiber + (r.fiber ?? 0),
      }), { energy: 0, protein: 0, fat: 0, saturatedFat: 0, carbs: 0, fiber: 0 })
      return [day, totals]
    }))
  )

  const usedDays = $derived(days.filter(d => plan[d].length > 0).length)

  /** Bevásárlólista csak a kiválasztott napra (`activeDay`). */
  const shoppingList = $derived.by(() => {
    const ingredients: Record<string, { amount: number; unit: string }> = {}
    for (const recipe of plan[activeDay]) {
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
    return Object.entries(ingredients)
      .sort(([a], [b]) => a.localeCompare(b, 'hu'))
      .map(([name, { amount, unit }]) => ({
        name,
        text: amount > 0 ? `${amount} ${unit} ${name}` : name
      }))
  })

  function normalizePlannerSearchInput(raw: string): string {
    return raw.trim().toLowerCase().replace(/\s+/g, ' ')
  }

  /** Accent-insensitive Hungarian match helper (category id + display names). */
  function foldHungarian(s: string): string {
    return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
  }

  function recipeMatchesPlannerCategory(r: Recipe, qFold: string, cats: Category[]): boolean {
    const idFold = foldHungarian(r.category)
    if (idFold.includes(qFold) || qFold.includes(idFold)) return true
    const cat = cats.find((c) => c.id === r.category)
    if (cat) {
      const nameFold = foldHungarian(cat.name)
      if (nameFold.includes(qFold) || qFold.includes(nameFold)) return true
    }
    return false
  }

  /** Pontos egyezés vagy [min,max] zárt tartomány (tápanyag szűrő). */
  type PlannerNutritionFilter =
    | { kind: 'exact'; value: number }
    | { kind: 'range'; min: number; max: number }

  const PLANNER_DASH = '[-\u2013]'

  const PLANNER_KCAL_RANGE_REGEXES = [
    new RegExp(`(\\d+[.,]?\\d*)\\s*${PLANNER_DASH}\\s*(\\d+[.,]?\\d*)\\s*kcal\\b`),
    new RegExp(`(\\d+[.,]?\\d*)\\s*${PLANNER_DASH}\\s*(\\d+[.,]?\\d*)kcal\\b`),
    new RegExp(`(\\d+[.,]?\\d*)\\s*${PLANNER_DASH}\\s*(\\d+[.,]?\\d*)\\s*kal[óo]r(?:ia)?\\b`),
    new RegExp(`(\\d+[.,]?\\d*)\\s*${PLANNER_DASH}\\s*(\\d+[.,]?\\d*)kal[óo]r(?:ia)?\\b`),
    new RegExp(`(\\d+[.,]?\\d*)\\s*${PLANNER_DASH}\\s*(\\d+[.,]?\\d*)\\s*kaloria\\b`),
    new RegExp(`(\\d+[.,]?\\d*)\\s*${PLANNER_DASH}\\s*(\\d+[.,]?\\d*)kaloria\\b`),
    new RegExp(`kcal\\s*(\\d+[.,]?\\d*)\\s*${PLANNER_DASH}\\s*(\\d+[.,]?\\d*)\\b`),
    new RegExp(`kal[óo]r(?:ia)?\\s*(\\d+[.,]?\\d*)\\s*${PLANNER_DASH}\\s*(\\d+[.,]?\\d*)\\b`),
    new RegExp(`kaloria\\s*(\\d+[.,]?\\d*)\\s*${PLANNER_DASH}\\s*(\\d+[.,]?\\d*)\\b`),
  ] as const

  const PLANNER_KCAL_REGEXES = [
    /(\d+[.,]?\d*)\s*kcal\b/,
    /(\d+[.,]?\d*)kcal\b/,
    /(\d+[.,]?\d*)\s*kal[óo]r(?:ia)?\b/,
    /(\d+[.,]?\d*)kal[óo]r(?:ia)?\b/,
    /(\d+[.,]?\d*)\s*kaloria\b/,
    /(\d+[.,]?\d*)kaloria\b/,
    /kcal\s*(\d+[.,]?\d*)\b/,
    /kal[óo]r(?:ia)?\s*(\d+[.,]?\d*)\b/,
    /kaloria\s*(\d+[.,]?\d*)\b/,
  ] as const

  const PLANNER_GRAM_RANGE_REGEXES = [
    new RegExp(`(\\d+[.,]?\\d*)\\s*${PLANNER_DASH}\\s*(\\d+[.,]?\\d*)\\s*gramm\\b`),
    new RegExp(`(\\d+[.,]?\\d*)\\s*${PLANNER_DASH}\\s*(\\d+[.,]?\\d*)gramm\\b`),
    new RegExp(`(\\d+[.,]?\\d*)\\s*${PLANNER_DASH}\\s*(\\d+[.,]?\\d*)\\s*gr\\b`),
    new RegExp(`(\\d+[.,]?\\d*)\\s*${PLANNER_DASH}\\s*(\\d+[.,]?\\d*)gr\\b`),
    new RegExp(`(\\d+[.,]?\\d*)\\s*${PLANNER_DASH}\\s*(\\d+[.,]?\\d*)\\s*g\\b`),
    new RegExp(`(\\d+[.,]?\\d*)\\s*${PLANNER_DASH}\\s*(\\d+[.,]?\\d*)g\\b`),
  ] as const

  const PLANNER_GRAM_REGEXES = [
    /(\d+[.,]?\d*)\s*gramm\b/,
    /(\d+[.,]?\d*)gramm\b/,
    /(\d+[.,]?\d*)\s*gr\b/,
    /(\d+[.,]?\d*)gr\b/,
    /(\d+[.,]?\d*)\s*g\b/,
    /(\d+[.,]?\d*)g\b/,
  ] as const

  function plannerParseNum(fragment: string): number {
    return parseFloat(fragment.replace(',', '.'))
  }

  function plannerNormalizeRange(a: number, b: number): { min: number; max: number } {
    return a <= b ? { min: a, max: b } : { min: b, max: a }
  }

  function stripPlannerRangeMatch(
    s: string,
    regexes: readonly RegExp[]
  ): { filter: PlannerNutritionFilter; rest: string } | null {
    for (const re of regexes) {
      const m = s.match(re)
      if (m?.[0] && m[1] !== undefined && m[2] !== undefined && m.index !== undefined) {
        const lo = plannerParseNum(m[1])
        const hi = plannerParseNum(m[2])
        if (!Number.isNaN(lo) && !Number.isNaN(hi)) {
          const { min, max } = plannerNormalizeRange(lo, hi)
          const rest = (s.slice(0, m.index) + ' ' + s.slice(m.index + m[0].length)).replace(/\s+/g, ' ').trim()
          return { filter: { kind: 'range', min, max }, rest }
        }
      }
    }
    return null
  }

  function stripFirstPlannerExactMatch(
    s: string,
    regexes: readonly RegExp[]
  ): { value: number | null; rest: string } {
    for (const re of regexes) {
      const m = s.match(re)
      if (m?.[0] && m[1] !== undefined && m.index !== undefined) {
        const num = plannerParseNum(m[1])
        if (!Number.isNaN(num)) {
          const rest = (s.slice(0, m.index) + ' ' + s.slice(m.index + m[0].length)).replace(/\s+/g, ' ').trim()
          return { value: num, rest }
        }
      }
    }
    return { value: null, rest: s }
  }

  function stripFirstPlannerKcal(s: string): { filter: PlannerNutritionFilter | null; rest: string } {
    const ranged = stripPlannerRangeMatch(s, PLANNER_KCAL_RANGE_REGEXES)
    if (ranged) return { filter: ranged.filter, rest: ranged.rest }
    const { value, rest } = stripFirstPlannerExactMatch(s, PLANNER_KCAL_REGEXES)
    if (value !== null) return { filter: { kind: 'exact', value }, rest }
    return { filter: null, rest: s }
  }

  function stripFirstPlannerGrams(s: string): { filter: PlannerNutritionFilter | null; rest: string } {
    const ranged = stripPlannerRangeMatch(s, PLANNER_GRAM_RANGE_REGEXES)
    if (ranged) return { filter: ranged.filter, rest: ranged.rest }
    const { value, rest } = stripFirstPlannerExactMatch(s, PLANNER_GRAM_REGEXES)
    if (value !== null) return { filter: { kind: 'exact', value }, rest }
    return { filter: null, rest: s }
  }

  /** Első kcal-, majd első g-minta kivágása; maradék = szöveges rész (szavankénti ÉS). */
  function extractPlannerNutritionAndTextRest(normalized: string): {
    energy: PlannerNutritionFilter | null
    carbs: PlannerNutritionFilter | null
    textRest: string
  } {
    const { filter: e1, rest: r1 } = stripFirstPlannerKcal(normalized)
    const { filter: c1, rest: r2 } = stripFirstPlannerGrams(r1)
    return { energy: e1, carbs: c1, textRest: r2 }
  }

  /** Legalább 2 karakteres „szavak”; szóköz = mind illeszkedjen (ÉS). */
  function plannerSearchTextTokens(textRest: string): string[] {
    return textRest.split(/\s+/).filter((t) => t.length >= 2)
  }

  function plannerTextTokenMatchesRecipe(r: Recipe, tokFold: string, cats: Category[]): boolean {
    return (
      foldHungarian(r.title).includes(tokFold) ||
      r.searchTerms?.some((t) => foldHungarian(t).includes(tokFold)) ||
      r.ingredientNames?.some((n) => foldHungarian(n).includes(tokFold)) ||
      recipeMatchesPlannerCategory(r, tokFold, cats)
    )
  }

  function plannerNutritionValuesEqual(stored: number, target: number): boolean {
    if (Number.isNaN(target)) return false
    if (Math.abs(stored - target) < 1e-6) return true
    if (Number.isInteger(target) && Math.round(stored) === target) return true
    return false
  }

  function recipeMatchesPlannerEnergyTarget(r: Recipe, num: number): boolean {
    if (typeof r.energy === 'number' && plannerNutritionValuesEqual(r.energy, num)) return true
    for (const tbl of r.nutritionTables ?? []) {
      if (typeof tbl.energy === 'number' && plannerNutritionValuesEqual(tbl.energy, num)) return true
    }
    return false
  }

  function recipeMatchesPlannerCarbsTarget(r: Recipe, num: number): boolean {
    if (typeof r.carbs === 'number' && plannerNutritionValuesEqual(r.carbs, num)) return true
    for (const tbl of r.nutritionTables ?? []) {
      if (typeof tbl.carbs === 'number' && plannerNutritionValuesEqual(tbl.carbs, num)) return true
    }
    return false
  }

  function recipePlannerEnergyInRange(r: Recipe, min: number, max: number): boolean {
    const ok = (v: number) => v >= min && v <= max
    if (typeof r.energy === 'number' && ok(r.energy)) return true
    for (const tbl of r.nutritionTables ?? []) {
      if (typeof tbl.energy === 'number' && ok(tbl.energy)) return true
    }
    return false
  }

  function recipePlannerCarbsInRange(r: Recipe, min: number, max: number): boolean {
    const ok = (v: number) => v >= min && v <= max
    if (typeof r.carbs === 'number' && ok(r.carbs)) return true
    for (const tbl of r.nutritionTables ?? []) {
      if (typeof tbl.carbs === 'number' && ok(tbl.carbs)) return true
    }
    return false
  }

  function recipeMatchesPlannerEnergyFilter(r: Recipe, f: PlannerNutritionFilter | null): boolean {
    if (f === null) return true
    if (f.kind === 'exact') return recipeMatchesPlannerEnergyTarget(r, f.value)
    return recipePlannerEnergyInRange(r, f.min, f.max)
  }

  function recipeMatchesPlannerCarbsFilter(r: Recipe, f: PlannerNutritionFilter | null): boolean {
    if (f === null) return true
    if (f.kind === 'exact') return recipeMatchesPlannerCarbsTarget(r, f.value)
    return recipePlannerCarbsInRange(r, f.min, f.max)
  }

  function plannerRecipeMatchesSearch(r: Recipe, raw: string, cats: Category[]): boolean {
    const normalized = normalizePlannerSearchInput(raw)
    if (normalized.length === 0) return false

    const { energy, carbs, textRest } = extractPlannerNutritionAndTextRest(normalized)
    const tokens = plannerSearchTextTokens(textRest)

    const nutritionOk =
      recipeMatchesPlannerEnergyFilter(r, energy) && recipeMatchesPlannerCarbsFilter(r, carbs)
    if (!nutritionOk) return false

    const hasNutritionFilter = energy !== null || carbs !== null
    if (tokens.length === 0) {
      return hasNutritionFilter
    }

    return tokens.every((tok) => plannerTextTokenMatchesRecipe(r, foldHungarian(tok), cats))
  }

  let searchQuery = $state('')
  const searchResults = $derived(
    !fullCatalog || normalizePlannerSearchInput(searchQuery).length === 0
      ? []
      : fullCatalog.filter((r) => plannerRecipeMatchesSearch(r, searchQuery, categories))
  )

  let activeDay = $state<MealPlannerDay>(days[0])
</script>

{#if !$hasReceptsarokAccess}
  <PaywallCTA context="planner" />
{:else if catalogLoading || !fullCatalog}
  <p class="text-center opacity-70 py-8 max-w-prose mx-auto px-4">
    {catalogError
      ? 'Nem sikerült betölteni az étlaptervezőt. Frissítsd az oldalt, vagy jelentkezz be újra.'
      : 'Étlaptervező betöltése…'}
  </p>
{:else}
  <div class="max-w-5xl mx-auto">
    <div class="flex flex-wrap gap-2 items-center justify-between mb-4">
      <h3 class="text-lg font-semibold">Heti étlaptervező</h3>
      {#if usedDays > 0}
        <button class="btn btn-ghost btn-sm" onclick={mealPlanClearAll}>Terv törlése</button>
      {/if}
    </div>

    <div class="mb-4">
      <input
        type="text"
        placeholder="Szóköz = ÉS. Pl. 100-200 kcal · 20-50 g · hal 350 kcal"
        bind:value={searchQuery}
        class="input input-bordered w-full"
      />
      {#if searchResults.length > 0}
        <div class="card bg-base-200 mt-1 max-h-[min(50vh,22rem)] overflow-y-auto overscroll-contain">
          {#each searchResults as recipe}
            <button
              class="flex items-center gap-2 p-2 hover:bg-base-300 w-full text-left"
              onclick={() => { addToDay(activeDay, recipe); searchQuery = '' }}
            >
              <span class="flex-1 truncate text-sm">{recipe.title}</span>
              <span class="text-xs opacity-50 shrink-0">
                {typeof recipe.energy === 'number' ? `${recipe.energy} kcal` : ''}
              </span>
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
            {#each plan[activeDay] as recipe}
              <div class="card card-side bg-base-200 p-2 rounded-sm">
                <div class="flex-1">
                  <a href={recipeDetailPath(recipe)} class="font-medium text-sm hover:underline">
                    {recipe.title}
                  </a>
                  <p class="text-xs opacity-50">
                    {typeof recipe.energy === 'number' ? `${recipe.energy} kcal` : '-'} ·
                    {typeof recipe.protein === 'number' ? `${recipe.protein}g F` : '-'} ·
                    {typeof recipe.carbs === 'number' ? `${recipe.carbs}g Sz` : '-'}
                  </p>
                </div>
                <button class="btn btn-ghost btn-xs" onclick={() => removeFromDay(activeDay, recipe)} aria-label="Törlés">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-4">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            {/each}
          </div>
        {/if}

      </div>

      <div>
        {#if usedDays > 0}
          <h4 class="font-medium mb-2">Napi összesítés · {activeDay}</h4>
          <div class="p-3 bg-base-200 rounded-sm mb-4">
            <NutritionTable compact table={{
              label: '',
              ...dayTotals[activeDay]
            }} />
          </div>

          {#if shoppingList.length > 0}
            <h4 class="font-medium mb-2">Bevásárlólista · {activeDay} ({shoppingList.length} tétel)</h4>
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
            <p>Adj hozzá recepteket a napi tervhez a napi összesítés és bevásárlólista megjelenítéséhez.</p>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}
