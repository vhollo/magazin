/**
 * Recipe-group "related" computation for the MODX→Firestore sync and the recipe
 * backfill. A *group* is a set of Receptsarok recipes cross-linked from one
 * editorial hub article (a `<ul>` of recipe links, e.g.
 * `cikkek/hypertonia/1601/nyari-gyumolcsok`) or from each recipe's own
 * "További receptek" footer list.
 *
 * Two persisted, uniform fields hold the group's recipe keys (`{year}-{id}`):
 *   - magazine doc  → `doc.related`        (resolved + rendered as recipe cards)
 *   - recipe        → `recipe.relatedCards`
 * Both override the tag-based / title-similarity fallback when present.
 *
 * Resolution paths differ by what data is available:
 *   - recipe side uses `sourceModxId` + the redirect manifest (`buildRecipeKeyByModxId`);
 *   - magazine side uses each linked doc's `redirect` (`/receptsarok/{year}/{id}`),
 *     since the projection snapshot carries `redirect` but not `parent`/`linkedModxIds`.
 */
import fs from 'node:fs'
import { stringifyRecipesJson } from '../../src/lib/recipesJsonFormat.js'
import { encodeDocPathId } from './doc-path-id.mjs'
import { parseReceptsarokRedirectPath } from './receptsarok-modx-free-sync.mjs'

const recipeKey = (year, id) => `${year}-${id}`

function arraysEqual(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

const pathParentOf = (p) => {
  const s = String(p ?? '')
  const i = s.lastIndexOf('/')
  return i < 0 ? '' : s.slice(0, i)
}

// ── Recipe side ─────────────────────────────────────────────────────────────

/**
 * Map MODX doc id → published recipe key. Recipes' own `sourceModxId` first
 * (first match wins), then the redirect manifest overrides — it maps article ids
 * to the recipe the live site redirects to (covers dedupe-variant docs).
 *
 * @param {Record<string, any>[]} recipes
 * @param {{ modxContentId?: number; year?: number; id?: string }[]} manifestEntries
 */
export function buildRecipeKeyByModxId(recipes, manifestEntries = []) {
  const byModxId = new Map()
  const publishedKeys = new Set()
  /** MODX article id → keys of the recipes split out of it (multi-recipe collections). */
  const bySourceModxId = new Map()
  for (const r of recipes) {
    if (r?.published === false) continue
    const key = recipeKey(r.year, r.id)
    publishedKeys.add(key)
    const src = Number(r.sourceModxId)
    if (Number.isFinite(src)) {
      if (!byModxId.has(src)) byModxId.set(src, key)
      const arr = bySourceModxId.get(src)
      if (arr) arr.push(key)
      else bySourceModxId.set(src, [key])
    }
  }
  for (const e of manifestEntries) {
    const modxId = Number(e?.modxContentId)
    const year = Number(e?.year)
    const id = typeof e?.id === 'string' ? e.id : ''
    if (!Number.isFinite(modxId) || !Number.isFinite(year) || !id) continue
    const key = recipeKey(year, id)
    if (publishedKeys.has(key)) byModxId.set(modxId, key)
  }
  return { byModxId, publishedKeys, bySourceModxId }
}

/**
 * Related recipe keys for a recipe (published, deduped, minus self):
 *   1. its own `linkedModxIds` ("További receptek" curated links), then
 *   2. co-derived siblings — recipes split out of the same collection article
 *      (same `sourceModxId`), so e.g. the 5 dishes of `recept-sarok` (or the 22 of
 *      `nagy-margit-…`) mutually relate even though none carries a link list.
 */
export function recipeRelatedKeys(recipe, byModxId, publishedKeys, bySourceModxId) {
  const selfKey = recipeKey(recipe.year, recipe.id)
  const out = []
  const seen = new Set([selfKey])
  const push = (key) => {
    if (key && publishedKeys.has(key) && !seen.has(key)) {
      seen.add(key)
      out.push(key)
    }
  }
  for (const mid of Array.isArray(recipe?.linkedModxIds) ? recipe.linkedModxIds : []) {
    push(byModxId.get(Number(mid)))
  }
  const src = Number(recipe?.sourceModxId)
  if (Number.isFinite(src) && bySourceModxId) {
    for (const key of bySourceModxId.get(src) ?? []) push(key)
  }
  return out
}

/**
 * Recompute `relatedCards` for every recipe in place from its `linkedModxIds`.
 * Returns the keys whose `relatedCards` changed.
 *
 * @returns {{ changed: string[] }}
 */
export function computeRecipeRelatedChanges(recipes, manifestEntries = []) {
  const { byModxId, publishedKeys, bySourceModxId } = buildRecipeKeyByModxId(recipes, manifestEntries)
  const changed = []
  for (const r of recipes) {
    // Unpublished recipes (e.g. dedupe losers) never render — keep relatedCards off them.
    const next = r.published === false ? [] : recipeRelatedKeys(r, byModxId, publishedKeys, bySourceModxId)
    const prev = Array.isArray(r.relatedCards) ? r.relatedCards : []
    if (arraysEqual(prev, next)) continue
    if (next.length) r.relatedCards = next
    else if ('relatedCards' in r) delete r.relatedCards
    changed.push(recipeKey(r.year, r.id))
  }
  return { changed }
}

/**
 * Recompute recipe `relatedCards` and (when `apply`) write changed recipes to
 * `recipes.json` + Firestore `recipes/*` (merge). Diff-based: a no-op run writes
 * nothing. Mirrors `applyModxLinkedRecipeFreeFlags`.
 *
 * @returns {Promise<{ updated: number; keys: string[] }>}
 */
export async function syncRecipeRelatedCards({
  recipes,
  manifestEntries = [],
  recipesJsonPath,
  firestore,
  apply,
}) {
  const { changed } = computeRecipeRelatedChanges(recipes, manifestEntries)
  if (changed.length === 0) return { updated: 0, keys: [] }
  if (!apply) return { updated: changed.length, keys: changed }

  const byKey = new Map(recipes.map((r) => [recipeKey(r.year, r.id), r]))
  let batch = firestore.batch()
  let n = 0
  for (const key of changed) {
    const r = byKey.get(key)
    const patch = { relatedCards: Array.isArray(r?.relatedCards) ? r.relatedCards : [] }
    batch.set(firestore.collection('recipes').doc(key), patch, { merge: true })
    if (++n % 400 === 0) {
      await batch.commit()
      batch = firestore.batch()
    }
  }
  if (n % 400 !== 0) await batch.commit()
  fs.writeFileSync(recipesJsonPath, stringifyRecipesJson(recipes))
  return { updated: changed.length, keys: changed }
}

// ── Magazine doc side ───────────────────────────────────────────────────────

const recipeKeyFromDoc = (d) => {
  const parsed = parseReceptsarokRedirectPath(d?.redirect)
  return parsed ? recipeKey(parsed.year, parsed.id) : null
}

const isReceptRedirect = (d) =>
  Array.isArray(d?.tv?.tags) &&
  d.tv.tags.includes('recept') &&
  String(d?.redirect ?? '').startsWith('/receptsarok/')

/** Index the full projection corpus by MODX id and by path-parent. */
function buildDocIndex(projectionDocs) {
  const docsById = new Map()
  const byPathParent = new Map()
  for (const d of projectionDocs) {
    if (d?.id != null) docsById.set(Number(d.id), d)
    const pp = pathParentOf(d?.path)
    if (!byPathParent.has(pp)) byPathParent.set(pp, [])
    byPathParent.get(pp).push(d)
  }
  return { docsById, byPathParent }
}

/**
 * Related recipe keys for a non-redirecting magazine doc, mirroring the runtime
 * priority of `[...path]/+page.server.ts`:
 *   0. dishes split out of THIS article (`recipe.sourceModxId == doc.id`) — a
 *      multi-recipe "gyűjtőcikk" whose own body became several Receptsarok recipes
 *      (e.g. `cikkek/diabetes/1503/recept-sarok`). The most direct relationship.
 *   1. own `linkedModxIds` (heading-announced footer list), else
 *   2. folder → child `recept` docs (structural), else
 *   3. a leaf that *links to* its `recept` siblings in its own body
 *      (e.g. an editorial hub with a `<h2>Receptek:</h2>` list `extractLinkedModxIds`
 *      misses) → those siblings.
 * Children/siblings must be `recept`-tagged and redirect into `/receptsarok/`.
 *
 * Tier 3 requires the doc's `content` to reference each sibling's path, so a doc
 * that merely shares a folder with recipes (but lists none) is not treated as a
 * hub. `content` is present for processed docs (full sync + changed rows); a
 * projection-only neighbour without it yields no tier-3 match (refreshed on the
 * next full sync / hub re-save).
 */
export function docRelatedKeys(srcDoc, { docsById, byPathParent, publishedKeys, bySourceModxId }) {
  if (!srcDoc?.path) return []

  // Tier 0: the article's own dishes (recipes parsed out of its body).
  const derived = bySourceModxId?.get(Number(srcDoc.id)) ?? []
  if (derived.length) {
    const selfKey = recipeKeyFromDoc(srcDoc)
    const out = []
    const seen = new Set()
    for (const key of derived) {
      if (!publishedKeys.has(key) || key === selfKey || seen.has(key)) continue
      seen.add(key)
      out.push(key)
    }
    if (out.length) return out
  }

  let linkedDocs = []
  const ownLinked = Array.isArray(srcDoc.linkedModxIds) ? srcDoc.linkedModxIds : []
  if (ownLinked.length) {
    linkedDocs = ownLinked.map((mid) => docsById.get(Number(mid))).filter(Boolean)
  } else if (srcDoc.isfolder === true || Number(srcDoc.isfolder) === 1) {
    linkedDocs = (byPathParent.get(srcDoc.path) ?? [])
      .filter(isReceptRedirect)
      .sort((a, b) => Number(a.id) - Number(b.id))
  } else {
    const content = typeof srcDoc.content === 'string' ? srcDoc.content : ''
    if (!content) return []
    linkedDocs = (byPathParent.get(pathParentOf(srcDoc.path)) ?? [])
      .filter((d) => Number(d.id) !== Number(srcDoc.id) && isReceptRedirect(d) && content.includes(d.path))
      .sort((a, b) => Number(a.id) - Number(b.id))
  }

  const selfKey = recipeKeyFromDoc(srcDoc)
  const out = []
  const seen = new Set()
  for (const d of linkedDocs) {
    const key = recipeKeyFromDoc(d)
    if (!key || !publishedKeys.has(key) || key === selfKey || seen.has(key)) continue
    seen.add(key)
    out.push(key)
  }
  return out
}

/**
 * MODX ids whose `doc.related` should be (re)computed this run.
 * Full sync: every non-redirecting doc. Incremental: changed docs plus their
 * path-parent neighbours (and, for changed folders, their children) so that
 * re-saving one group member refreshes the hub and its siblings.
 */
export function relatedWriteIds({ changedIds, projectionDocs, workingById, isFullSync }) {
  if (isFullSync) {
    return new Set(
      projectionDocs
        .filter((d) => d?.path && !d.redirect)
        .map((d) => Number(d.id))
        .filter(Number.isFinite)
    )
  }
  const byPathParent = new Map()
  for (const d of projectionDocs) {
    const pp = pathParentOf(d?.path)
    if (!byPathParent.has(pp)) byPathParent.set(pp, [])
    byPathParent.get(pp).push(d)
  }
  const ids = new Set()
  for (const id of changedIds) {
    ids.add(Number(id))
    const p = workingById.get(Number(id))?.path
    if (!p) continue
    for (const nb of byPathParent.get(pathParentOf(p)) ?? []) if (nb?.id != null) ids.add(Number(nb.id))
    for (const nb of byPathParent.get(p) ?? []) if (nb?.id != null) ids.add(Number(nb.id))
  }
  return ids
}

/**
 * Compute and merge-write `doc.related` (recipe keys) for the given ids.
 * Redirecting docs (recipe articles) are skipped — their magazine page never renders.
 *
 * @returns {Promise<number>} docs updated
 */
export async function updateDocRelatedRecipes({
  firestore,
  projectionDocs,
  workingById,
  idsToWrite,
  publishedKeys,
  bySourceModxId,
}) {
  const { docsById, byPathParent } = buildDocIndex(projectionDocs)
  let updated = 0
  let batch = firestore.batch()
  let n = 0
  for (const id of idsToWrite) {
    const srcDoc = workingById.get(Number(id)) ?? docsById.get(Number(id))
    if (!srcDoc?.path || String(srcDoc.redirect ?? '').length > 0) continue
    const keys = docRelatedKeys(srcDoc, { docsById, byPathParent, publishedKeys, bySourceModxId })
    if (!keys.length) continue
    batch.set(
      firestore.collection('docs').doc(encodeDocPathId(srcDoc.path)),
      { related: keys },
      { merge: true }
    )
    const working = workingById.get(Number(id))
    if (working) working.related = keys
    updated++
    if (++n % 400 === 0) {
      await batch.commit()
      batch = firestore.batch()
    }
  }
  if (n % 400 !== 0) await batch.commit()
  return updated
}
