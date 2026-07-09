/**
 * Concurrency-safe merge of the sync's committed data files with a newer remote
 * (e.g. `origin/main`). Two `modx-doc-save` runs can each append a different new
 * recipe; a plain `git push` from the loser is rejected and its commit is lost.
 * Instead of a git text merge (which conflicts on the appended JSON lines), this
 * merges each file **by key** (union, dedup) so both runs' additions survive.
 *
 * Usage (from the workflow, on push rejection):
 *   node scripts/merge-sync-data-files.mjs <ref>
 * Reads each data file from the working tree (this run's version) and from
 * `git show <ref>:<path>` (the remote), writes the union back to the working tree.
 *
 * @module
 */
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { stringifyRecipesJson } from '../src/lib/recipesJsonFormat.js'
import { mergeRedirectEntries } from './lib/receptsarok-redirects-manifest.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

const RECIPES_PATH = 'src/lib/data/recipes.json'
const REDIRECTS_PATH = 'src/lib/data/receptsarok-redirects.json'
const CATEGORY_REVIEW_PATH = 'scripts/data/magazin-recipe-category-review.json'

function parseJsonOr(text, fallback) {
  if (!text || !text.trim()) return fallback
  try {
    return JSON.parse(text)
  } catch {
    return fallback
  }
}

/** Recipe key — same as the Firestore doc id. */
function recipeKey(recipe) {
  return `${recipe?.year}-${recipe?.id}`
}

/**
 * Union of two recipe arrays by `${year}-${id}` (local/new wins on collision),
 * keeping remote order and appending local-only recipes.
 * @returns {string} canonical recipes.json text
 */
export function mergeRecipesJson(remoteText, localText) {
  const remote = Array.isArray(parseJsonOr(remoteText, [])) ? parseJsonOr(remoteText, []) : []
  const local = Array.isArray(parseJsonOr(localText, [])) ? parseJsonOr(localText, []) : []
  const localByKey = new Map(local.map((r) => [recipeKey(r), r]))
  const seen = new Set()
  const merged = []
  for (const remoteRecipe of remote) {
    const key = recipeKey(remoteRecipe)
    seen.add(key)
    merged.push(localByKey.has(key) ? localByKey.get(key) : remoteRecipe)
  }
  for (const localRecipe of local) {
    const key = recipeKey(localRecipe)
    if (!seen.has(key)) {
      seen.add(key)
      merged.push(localRecipe)
    }
  }
  return stringifyRecipesJson(merged)
}

/**
 * Union of two category-review files by `${year}-${id}`; a non-empty `category`
 * (a human-filled override, possibly on the remote) always wins over an empty one.
 * @returns {string} pretty JSON text (trailing newline)
 */
export function mergeCategoryReview(remoteText, localText) {
  const remote = parseJsonOr(remoteText, { entries: [] })
  const local = parseJsonOr(localText, { entries: [] })
  const remoteEntries = Array.isArray(remote?.entries) ? remote.entries : []
  const localEntries = Array.isArray(local?.entries) ? local.entries : []
  const byKey = new Map()
  const order = []
  const put = (entry) => {
    const key = `${Number(entry?.year)}-${String(entry?.id ?? '').trim()}`
    const prev = byKey.get(key)
    if (!prev) {
      order.push(key)
      byKey.set(key, entry)
      return
    }
    // Prefer the entry that carries a resolved category.
    const prevCat = String(prev?.category ?? '').trim()
    const nextCat = String(entry?.category ?? '').trim()
    if (!prevCat && nextCat) byKey.set(key, entry)
  }
  for (const e of remoteEntries) put(e)
  for (const e of localEntries) put(e)
  const merged = { ...remote, entries: order.map((key) => byKey.get(key)) }
  return `${JSON.stringify(merged, null, 2)}\n`
}

/**
 * Union of two redirect manifests by `modxContentId` (reuses the sync's own
 * `mergeRedirectEntries`, new/local wins on conflict).
 * @returns {string} pretty JSON text (trailing newline)
 */
export function mergeRedirectsManifest(remoteText, localText) {
  const remote = parseJsonOr(remoteText, { entries: [] })
  const local = parseJsonOr(localText, { entries: [] })
  const remoteEntries = Array.isArray(remote?.entries) ? remote.entries : []
  const localEntries = Array.isArray(local?.entries) ? local.entries : []
  const { entries } = mergeRedirectEntries(remoteEntries, localEntries)
  const payload = {
    generatedAt: new Date().toISOString(),
    sourceDocs: local?.sourceDocs ?? remote?.sourceDocs ?? 'sync worker (dynamic match + existing manifest)',
    sourceRecipes: local?.sourceRecipes ?? remote?.sourceRecipes ?? 'src/lib/data/recipes.json',
    entries,
  }
  return `${JSON.stringify(payload, null, 2)}\n`
}

function gitShow(ref, relPath) {
  try {
    return execFileSync('git', ['show', `${ref}:${relPath}`], { cwd: root, encoding: 'utf8' })
  } catch {
    return '' // file absent at ref → treat as empty
  }
}

function readWorkingTree(relPath) {
  const abs = path.join(root, relPath)
  return fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : ''
}

function writeWorkingTree(relPath, text) {
  fs.writeFileSync(path.join(root, relPath), text)
}

function main() {
  const ref = process.argv[2]
  if (!ref) {
    console.error('usage: node scripts/merge-sync-data-files.mjs <ref>')
    process.exit(2)
  }
  const jobs = [
    [RECIPES_PATH, mergeRecipesJson],
    [REDIRECTS_PATH, mergeRedirectsManifest],
    [CATEGORY_REVIEW_PATH, mergeCategoryReview],
  ]
  for (const [relPath, mergeFn] of jobs) {
    const local = readWorkingTree(relPath)
    if (!local.trim()) continue // this run did not touch the file
    const remote = gitShow(ref, relPath)
    writeWorkingTree(relPath, mergeFn(remote, local))
    console.log(`merged ${relPath} with ${ref}`)
  }
}

// Only run when invoked directly (not when imported by a test).
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main()
}
