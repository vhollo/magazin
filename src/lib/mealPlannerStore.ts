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

/** Call when subscriber uid is known (or undefined on logout). Loads / clears persisted plan. */
export function syncMealPlanStorage(uid: string | undefined) {
  activeStorageUid = uid
  if (!browser) {
    mealPlanRefs.set(emptyPlan())
    return
  }
  if (!uid) {
    mealPlanRefs.set(emptyPlan())
    return
  }
  try {
    const raw = localStorage.getItem(storageKey(uid))
    if (raw) {
      mealPlanRefs.set(normalizePlan(JSON.parse(raw)))
      return
    }
  } catch {
    /* ignore */
  }
  mealPlanRefs.set(emptyPlan())
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
