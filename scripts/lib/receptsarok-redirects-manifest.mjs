import fs from 'node:fs'

/**
 * @param {string} manifestPath
 * @returns {{ generatedAt?: string; sourceDocs?: string; sourceRecipes?: string; entries: object[] }}
 */
export function loadRedirectsManifest(manifestPath) {
  try {
    const parsed = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
    const entries = Array.isArray(parsed?.entries) ? parsed.entries : []
    return { ...parsed, entries }
  } catch {
    return { entries: [] }
  }
}

/**
 * Merge new redirect entries by modxContentId (new wins on conflict).
 *
 * @param {object[]} existing
 * @param {object[]} additions
 */
export function mergeRedirectEntries(existing, additions) {
  const byId = new Map()
  for (const entry of existing) {
    const id = Number(entry?.modxContentId)
    if (Number.isFinite(id)) byId.set(id, entry)
  }
  let added = 0
  for (const entry of additions) {
    const id = Number(entry?.modxContentId)
    if (!Number.isFinite(id) || !entry?.path || !entry?.year || !entry?.id) continue
    const prev = byId.get(id)
    const normalized = {
      modxContentId: id,
      path: String(entry.path),
      year: Number(entry.year),
      id: String(entry.id),
    }
    if (
      !prev ||
      prev.path !== normalized.path ||
      prev.year !== normalized.year ||
      prev.id !== normalized.id
    ) {
      if (!prev) added += 1
      byId.set(id, normalized)
    }
  }
  const entries = [...byId.values()].sort((a, b) => String(a.path).localeCompare(String(b.path)))
  return { entries, added }
}

/**
 * @param {string} manifestPath
 * @param {object[]} newEntries
 * @returns {number} count of newly added entries
 */
export function appendRedirectsManifest(manifestPath, newEntries) {
  if (!newEntries.length) return 0
  const manifest = loadRedirectsManifest(manifestPath)
  const { entries, added } = mergeRedirectEntries(manifest.entries, newEntries)
  if (added === 0) return 0
  const payload = {
    generatedAt: new Date().toISOString(),
    sourceDocs: 'sync worker (dynamic match + existing manifest)',
    sourceRecipes: 'src/lib/data/recipes.json',
    entries,
  }
  fs.writeFileSync(manifestPath, `${JSON.stringify(payload, null, 2)}\n`)
  return added
}

/**
 * Register dynamic entries in in-memory redirect maps for the current sync run.
 *
 * @param {import('../../src/lib/modx/transform.ts').ReceptsarokRedirectMaps} redirectMaps
 * @param {object[]} entries
 */
export function registerRedirectEntries(redirectMaps, entries) {
  for (const entry of entries) {
    const id = Number(entry?.modxContentId)
    const pathKey = String(entry?.path ?? '')
      .trim()
      .replace(/^\/+/, '')
    const year = Number(entry?.year)
    const recipeId = String(entry?.id ?? '').trim()
    if (!Number.isFinite(id) || !pathKey || !Number.isFinite(year) || !recipeId) continue
    const target = `/receptsarok/${year}/${encodeURIComponent(recipeId)}`
    redirectMaps.byContentId.set(id, target)
    redirectMaps.byPath.set(pathKey, target)
  }
}
