import fs from 'node:fs'
import path from 'node:path'
import { chooseWinner, pickRedirectTarget } from '../../src/lib/receptsarokDedupeShared.js'
import {
  isDescriptionAuthorCompatible,
  normalizeText,
  parseYearFromMagazinPath,
} from '../../src/lib/modxToRsParser.js'

function tokenize(value) {
  return normalizeText(value).split(/\s+/).filter(Boolean)
}

function titleMatchScore(doc, recipe) {
  const docTitle = normalizeText(doc.longtitle || doc.title || '')
  const recipeTitle = normalizeText(recipe.title || '')
  if (!docTitle || !recipeTitle) return 0
  if (docTitle === recipeTitle) return 100
  if (recipeTitle.includes(docTitle) || docTitle.includes(recipeTitle)) return 80
  const docWords = tokenize(docTitle).filter((w) => w.length > 3)
  if (!docWords.length) return 0
  const overlap = docWords.filter((w) => recipeTitle.includes(w)).length
  return Math.round((overlap / docWords.length) * 50)
}

/** Same gate as receptsarokDedupePipeline: single `recept` tag only. */
export function isMagazineRecipeDoc(doc) {
  const tags = Array.isArray(doc?.tv?.tags) ? doc.tv.tags : []
  return tags.length === 1 && normalizeText(tags[0]) === 'recept'
}

/**
 * Match a magazine `recept` doc to a Receptsarok recipe (same rules as dedupe pipeline).
 *
 * @param {Record<string, unknown>} doc — processed MODX doc (with tv, path, alias, title…)
 * @param {Record<string, unknown>[]} recipes — published Receptsarok recipes
 * @returns {{ year: number; id: string; reason: string } | null}
 */
export function matchReceptsarokRedirectTarget(doc, recipes) {
  if (!isMagazineRecipeDoc(doc)) return null

  const published = recipes.filter((r) => r.published !== false)
  const aliasNorm = normalizeText(doc.alias)

  const scored = published
    .filter((recipe) => isDescriptionAuthorCompatible(doc?.description, recipe?.author))
    .map((recipe) => ({
      recipe,
      score: titleMatchScore(doc, recipe) + (normalizeText(recipe.id) === aliasNorm && aliasNorm ? 40 : 0),
    }))
    .filter((entry) => entry.score >= 60)
    .sort((a, b) => b.score - a.score)

  if (scored.length > 0) {
    const candidates = scored.map((entry) => entry.recipe)
    const { winner: contentWinner, reason } = chooseWinner(candidates)
    const redirectTarget = pickRedirectTarget(candidates, contentWinner)
    if (redirectTarget?.year != null && redirectTarget?.id) {
      return {
        year: Number(redirectTarget.year),
        id: String(redirectTarget.id),
        reason: reason ?? 'match',
      }
    }
  }

  const id = String(doc.alias || '').trim()
  if (id && aliasNorm) {
    const byAlias = published.filter((recipe) => normalizeText(recipe.id) === aliasNorm)
    if (byAlias.length > 0) {
      const { winner: contentWinner } = chooseWinner(byAlias)
      const redirectTarget = pickRedirectTarget(byAlias, contentWinner)
      if (redirectTarget) {
        return {
          year: Number(redirectTarget.year),
          id: String(redirectTarget.id),
          reason: 'alias-id',
        }
      }
    }
  }

  const year = parseYearFromMagazinPath(doc.path)
  if (id && published.some((r) => Number(r.year) === year && String(r.id) === id)) {
    return { year, id, reason: 'alias-year' }
  }

  return null
}

export function redirectPathForTarget({ year, id }) {
  return `/receptsarok/${year}/${encodeURIComponent(id)}`
}

/**
 * @param {string} recipesJsonPath
 * @returns {Record<string, unknown>[]}
 */
export function loadRecipesFromJson(recipesJsonPath) {
  const raw = fs.readFileSync(recipesJsonPath, 'utf8')
  const parsed = JSON.parse(raw)
  return Array.isArray(parsed) ? parsed : []
}

/**
 * Resolve redirect for sync: static manifest first, then live recipe match.
 *
 * @param {Record<string, unknown>} doc — in-progress MODX doc (before docFields)
 * @param {import('../../src/lib/modx/transform.ts').ReceptsarokRedirectMaps} redirectMaps
 * @param {Record<string, unknown>[]} recipes
 * @param {string | undefined} fallbackRedirect
 * @returns {{ redirect?: string; dynamicEntry?: { modxContentId: number; path: string; year: number; id: string } }}
 */
export function resolveReceptsarokRedirect(doc, redirectMaps, recipes, fallbackRedirect) {
  const byId =
    Number.isFinite(doc.id) ? redirectMaps.byContentId.get(Number(doc.id)) : undefined
  const pathKey = String(doc.path ?? '')
    .trim()
    .replace(/^\/+/, '')
  const byPath = pathKey ? redirectMaps.byPath.get(pathKey) : undefined
  const staticTarget = byId || byPath || fallbackRedirect
  if (typeof staticTarget === 'string' && staticTarget.trim()) {
    return { redirect: staticTarget.trim() }
  }

  const match = matchReceptsarokRedirectTarget(doc, recipes)
  if (!match || !doc.path) return {}

  const redirect = redirectPathForTarget(match)
  return {
    redirect,
    dynamicEntry: {
      modxContentId: Number(doc.id),
      path: pathKey,
      year: match.year,
      id: match.id,
    },
  }
}
