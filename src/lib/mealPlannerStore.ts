import { writable } from 'svelte/store'
import { browser } from '$app/environment'

export const MEAL_PLANNER_DAYS = [
  'Hétfő',
  'Kedd',
  'Szerda',
  'Csütörtök',
  'Péntek',
  'Szombat',
  'Vasárnap',
] as const

export type MealPlannerDay = (typeof MEAL_PLANNER_DAYS)[number]

export type MealPlanRef = { year: number; id: string }

export type MealPlanByDay = Record<string, MealPlanRef[]>

const STORAGE_VERSION = 1
const STORAGE_PREFIX = 'receptsarok.mealPlan'

function emptyPlan(): MealPlanByDay {
  return Object.fromEntries(MEAL_PLANNER_DAYS.map((d) => [d, []])) as MealPlanByDay
}

function storageKey(uid: string) {
  return `${STORAGE_PREFIX}.v${STORAGE_VERSION}:${uid}`
}

function checkedStorageKey(uid: string) {
  return `${STORAGE_PREFIX}.checked.v${STORAGE_VERSION}:${uid}`
}

function normalizePlan(raw: unknown): MealPlanByDay {
  const base = emptyPlan()
  if (!raw || typeof raw !== 'object') return base
  const o = raw as Record<string, unknown>
  for (const day of MEAL_PLANNER_DAYS) {
    const arr = o[day]
    if (!Array.isArray(arr)) continue
    base[day] = arr
      .filter(
        (x): x is MealPlanRef =>
          !!x &&
          typeof x === 'object' &&
          typeof (x as MealPlanRef).year === 'number' &&
          typeof (x as MealPlanRef).id === 'string'
      )
      .map((x) => ({ year: x.year, id: x.id }))
  }
  return base
}

function persist(plan: MealPlanByDay) {
  if (!browser || !activeStorageUid) return
  try {
    localStorage.setItem(storageKey(activeStorageUid), JSON.stringify(plan))
  } catch {
    /* ignore quota / private mode */
  }
}

let activeStorageUid: string | undefined

export const mealPlanRefs = writable<MealPlanByDay>(emptyPlan())

/**
 * Shopping-list checkbox state, keyed by ingredient name. Uid-scoped and
 * persisted alongside the plan so ticked-off items survive reloads and
 * navigation between recipe pages.
 */
export const mealPlanChecked = writable<Record<string, boolean>>({})

function normalizeChecked(raw: unknown): Record<string, boolean> {
  if (!raw || typeof raw !== 'object') return {}
  const out: Record<string, boolean> = {}
  for (const [name, v] of Object.entries(raw as Record<string, unknown>)) {
    if (v === true) out[name] = true
  }
  return out
}

function persistChecked(map: Record<string, boolean>) {
  if (!browser || !activeStorageUid) return
  try {
    localStorage.setItem(checkedStorageKey(activeStorageUid), JSON.stringify(map))
  } catch {
    /* ignore quota / private mode */
  }
}

/** Toggle a shopping-list item's checked state and persist. */
export function setMealPlanChecked(name: string, checked: boolean) {
  mealPlanChecked.update((map) => {
    const next = { ...map }
    if (checked) next[name] = true
    else delete next[name]
    persistChecked(next)
    return next
  })
}

/** Call when subscriber uid is known (or undefined on logout). Loads / clears persisted plan. */
export function syncMealPlanStorage(uid: string | undefined) {
  activeStorageUid = uid
  if (!browser || !uid) {
    mealPlanRefs.set(emptyPlan())
    mealPlanChecked.set({})
    return
  }
  try {
    const raw = localStorage.getItem(storageKey(uid))
    mealPlanRefs.set(raw ? normalizePlan(JSON.parse(raw)) : emptyPlan())
  } catch {
    mealPlanRefs.set(emptyPlan())
  }
  try {
    const rawChecked = localStorage.getItem(checkedStorageKey(uid))
    mealPlanChecked.set(rawChecked ? normalizeChecked(JSON.parse(rawChecked)) : {})
  } catch {
    mealPlanChecked.set({})
  }
}

export function mealPlanAddRecipe(day: string, ref: MealPlanRef) {
  mealPlanRefs.update((plan) => {
    const list = plan[day] ?? []
    if (list.some((r) => r.year === ref.year && r.id === ref.id)) return plan
    const next = { ...plan, [day]: [...list, ref] }
    persist(next)
    return next
  })
}

export function mealPlanRemoveRecipeRef(day: string, ref: MealPlanRef) {
  mealPlanRefs.update((plan) => {
    const list = plan[day] ?? []
    const nextList = list.filter((r) => !(r.year === ref.year && r.id === ref.id))
    if (nextList.length === list.length) return plan
    const next = { ...plan, [day]: nextList }
    persist(next)
    return next
  })
}

export function mealPlanClearAll() {
  const next = emptyPlan()
  mealPlanRefs.set(next)
  persist(next)
}

const PLANNER_OPEN_KEY = `${STORAGE_PREFIX}.open.v${STORAGE_VERSION}`

function readPlannerOpen(): boolean {
  if (!browser) return false
  try {
    return localStorage.getItem(PLANNER_OPEN_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * Whether the meal planner panel is expanded. Shared across the Receptsarok
 * index and every recipe page, and persisted, so navigating between recipes
 * (each a fresh page mount) doesn't collapse it — it "ne záródjon be magától".
 */
export const plannerOpen = writable<boolean>(readPlannerOpen())

plannerOpen.subscribe((open) => {
  if (!browser) return
  try {
    localStorage.setItem(PLANNER_OPEN_KEY, open ? '1' : '0')
  } catch {
    /* ignore quota / private mode */
  }
})
