import fs from 'node:fs'
import { gzipSync } from 'node:zlib'
import MiniSearch from 'minisearch'
import { pathToFileURL } from 'node:url'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { encodeDocPathId, normalizeArticlePath } from './doc-path-id.mjs'
import { uploadPublicFile } from './firebase-storage.mjs'
import { downloadGzipJson } from './storage-gzip-json.mjs'
import { loadRecipesFromJson } from './receptsarok-redirect-match.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '../..')
const RECIPES_JSON_PATH = path.join(root, 'src/lib/data/recipes.json')

const SEARCH_BATCH_SIZE = 200

const SEARCH_FIELDS = ['szerzo', 'longtitle', 'description', 'ellipsis', 'content']
const SEARCH_STORE_FIELDS = [
  'id',
  'path',
  'title',
  'longtitle',
  'description',
  'ellipsis',
  'content',
  'img',
  'tv',
  'szerzo',
  'free',
  'recipeTeaser',
]

const RECIPE_SEARCH_FIELDS = [
  'id',
  'year',
  'title',
  'author',
  'description',
  'ingredientNames',
  'searchTerms',
  'image',
  'img',
  'video',
  'nutritionTables',
  'servings',
  'hasSubRecipes',
  'free',
  'published',
  'energy',
  'protein',
  'fat',
  'saturatedFat',
  'carbs',
  'fiber',
  'category',
]

/** MiniSearch document id — path is unique; MODX id is not (folders vs articles). */
function searchDocId(doc, hints = {}) {
  const fromDoc = typeof doc.path === 'string' ? normalizeArticlePath(doc.path) : ''
  const fromHint = typeof hints.path === 'string' ? normalizeArticlePath(hints.path) : ''
  const pathKey = fromDoc || fromHint
  if (pathKey) return pathKey
  if (typeof doc.id === 'string' && doc.id.trim()) return doc.id.trim()
  if (doc.id != null && doc.id !== '') return `modx-${doc.id}`
  if (typeof hints.firestoreId === 'string' && hints.firestoreId.trim()) {
    return `fs-${hints.firestoreId.trim()}`
  }
  return null
}

function createMiniSearch() {
  return new MiniSearch({
    fields: SEARCH_FIELDS,
    storeFields: SEARCH_STORE_FIELDS,
    extractField: (document, fieldName) => {
      if (fieldName === 'szerzo') {
        if (typeof document.szerzo === 'string') return document.szerzo
        const authors = document.tv?.szerzo
        if (Array.isArray(authors)) {
          return authors.map((a) => a?.name).filter(Boolean).join(' ')
        }
        return null
      }
      return document[fieldName]
    },
  })
}

/**
 * Slim teaser embedded in search index (keres cards; not meal planner).
 * @param {Record<string, unknown>} r
 */
export function buildKeresRecipeTeaser(r) {
  const t = r.nutritionTables?.[0]
  const num = (v) => (typeof v === 'number' ? v : null)
  return {
    id: r.id,
    year: r.year,
    title: r.title,
    author: r.author ?? '',
    category: r.category ?? '',
    energy: num(r.energy) ?? num(t?.energy),
    protein: num(r.protein) ?? num(t?.protein),
    fat: num(r.fat) ?? num(t?.fat),
    carbs: num(r.carbs) ?? num(t?.carbs),
    fiber: num(r.fiber) ?? num(t?.fiber),
    img: r.img ?? null,
    free: r.free === true,
  }
}

/**
 * @param {Record<string, unknown>} doc
 * @param {{ path?: string, firestoreId?: string }} [hints]
 * @returns {Record<string, unknown> | null}
 */
export function articleToSearchDoc(doc, hints = {}) {
  const authors = doc.tv?.szerzo
  let szerzo = ''
  if (Array.isArray(authors)) {
    szerzo = authors.map((a) => a?.name || a?.val || '').filter(Boolean).join(' ')
  }
  const canonicalPath =
    (typeof doc.path === 'string' && normalizeArticlePath(doc.path)) ||
    (typeof hints.path === 'string' && normalizeArticlePath(hints.path)) ||
    ''
  const id = searchDocId(doc, hints)
  if (!id) return null
  return {
    id,
    modxId: doc.id,
    path: canonicalPath || doc.path,
    title: doc.title,
    longtitle: doc.longtitle,
    description: doc.description,
    ellipsis: doc.ellipsis,
    content: doc.content,
    img: doc.img,
    tv: doc.tv,
    szerzo,
  }
}

/**
 * @param {import('firebase-admin/firestore').Firestore} firestore
 * @param {{ preferJson?: boolean }} [options]
 */
export async function loadRecipesForSearch(firestore, { preferJson = false } = {}) {
  if (preferJson && fs.existsSync(RECIPES_JSON_PATH)) {
    return loadRecipesFromJson(RECIPES_JSON_PATH)
      .filter((r) => r.published !== false)
      .map((r) => pickRecipeFields(r))
  }

  const snap = await firestore.collection('recipes').select(...RECIPE_SEARCH_FIELDS).get()
  if (snap.empty) {
    try {
      const data = fs.readFileSync(RECIPES_JSON_PATH, 'utf8')
      const parsed = JSON.parse(data)
      return Array.isArray(parsed)
        ? parsed
            .filter((r) => r.published !== false)
            .map((r) => pickRecipeFields(r))
        : []
    } catch {
      return []
    }
  }
  return snap.docs
    .map((d) => pickRecipeFields(d.data()))
    .filter((r) => r.published !== false)
}

/**
 * @param {Record<string, unknown>} r
 */
function pickRecipeFields(r) {
  /** @type {Record<string, unknown>} */
  const out = {}
  for (const field of RECIPE_SEARCH_FIELDS) {
    if (r[field] !== undefined) out[field] = r[field]
  }
  return out
}

/**
 * @param {Record<string, unknown>} r
 */
export function recipeToSearchDoc(r) {
  const ing = (r.ingredientNames ?? []).join(' ')
  const terms = (r.searchTerms ?? []).join(' ')
  const pathKey = `receptsarok/${r.year}/${r.id}`
  return {
    id: `rs-${r.year}-${r.id}`,
    path: pathKey,
    title: r.title,
    longtitle: r.title,
    description: r.description ?? '',
    ellipsis: r.description ?? '',
    szerzo: r.author ?? '',
    content: `${terms} ${ing} ${r.title} ${r.author ?? ''}`.trim(),
    img: r.image,
    tv: { tags: ['recept'] },
    free: r.free === true,
    recipeTeaser: buildKeresRecipeTeaser(r),
  }
}

/**
 * @param {import('firebase-admin/firestore').Firestore} firestore
 * @param {string[]} listedPaths unique canonical article paths
 * @param {MiniSearch} miniSearch
 * @param {Set<string>} seenIds
 * @returns {Promise<{ indexed: number, reads: number }>}
 */
async function addArticlesInBatches(firestore, listedPaths, miniSearch, seenIds) {
  let indexed = 0
  let skipped = 0
  let reads = 0

  for (let i = 0; i < listedPaths.length; i += SEARCH_BATCH_SIZE) {
    const pathBatch = listedPaths.slice(i, i + SEARCH_BATCH_SIZE)
    const batchIds = pathBatch.map((p) => encodeDocPathId(p))
    const refs = batchIds.map((id) => firestore.collection('docs').doc(id))
    const snaps = await firestore.getAll(...refs)
    reads += snaps.length

    for (let j = 0; j < snaps.length; j++) {
      const snap = snaps[j]
      if (!snap.exists) continue
      const doc = snap.data()
      if (doc.redirect) continue

      const searchDoc = articleToSearchDoc(doc, {
        path: pathBatch[j],
        firestoreId: snap.id,
      })
      if (!searchDoc) {
        skipped++
        continue
      }
      if (miniSearch.has(searchDoc.id)) {
        miniSearch.discard(searchDoc.id)
      } else if (seenIds.has(searchDoc.id)) {
        skipped++
        continue
      }
      seenIds.add(searchDoc.id)
      miniSearch.add(searchDoc)
      indexed++
    }

    const done = Math.min(i + SEARCH_BATCH_SIZE, listedPaths.length)
    if (done === listedPaths.length || done % 1000 === 0) {
      console.log(`  search index: indexed ${done}/${listedPaths.length} article paths`)
    }
  }

  if (skipped > 0) {
    console.log(`  search index: skipped ${skipped} articles (duplicate or missing id)`)
  }

  return { indexed, reads }
}

const MINISEARCH_LOAD_OPTIONS = {
  fields: SEARCH_FIELDS,
  storeFields: SEARCH_STORE_FIELDS,
  extractField: (document, fieldName) => {
    if (fieldName === 'szerzo') {
      if (typeof document.szerzo === 'string') return document.szerzo
      const authors = document.tv?.szerzo
      if (Array.isArray(authors)) {
        return authors.map((a) => a?.name).filter(Boolean).join(' ')
      }
      return null
    }
    return document[fieldName]
  },
}

/**
 * @param {MiniSearch} miniSearch
 */
function discardRecipeSearchDocs(miniSearch) {
  const stored = miniSearch.toJSON()
  const ids = Object.keys(stored.documentStore ?? {})
  let count = 0
  for (const id of ids) {
    if (!String(id).startsWith('rs-')) continue
    try {
      miniSearch.discard(id)
      count++
    } catch {
      /* already gone */
    }
  }
  return count
}

/**
 * @param {import('firebase-admin/firestore').Firestore} firestore
 */
async function loadPreviousMiniSearch(firestore) {
  const snap = await firestore.collection('meta').doc('search').get()
  if (!snap.exists) return { miniSearch: createMiniSearch(), reads: 1, loaded: false }
  const indexUrl = snap.data()?.indexUrl
  if (typeof indexUrl !== 'string' || !indexUrl.trim()) {
    return { miniSearch: createMiniSearch(), reads: 1, loaded: false }
  }
  try {
    const stored = await downloadGzipJson(indexUrl.trim())
    const miniSearch = MiniSearch.loadJSON(JSON.stringify(stored), MINISEARCH_LOAD_OPTIONS)
    return { miniSearch, reads: 1, loaded: true }
  } catch (err) {
    console.warn(`search index: could not load previous (${err.message})`)
    return { miniSearch: createMiniSearch(), reads: 1, loaded: false }
  }
}

/**
 * @param {Record<string, unknown>[]} projectionDocs slim docs (no HTML bodies)
 */
export function listedPathsFromProjection(projectionDocs, isListedDoc) {
  const paths = new Set()
  for (const doc of projectionDocs) {
    if (!isListedDoc(doc)) continue
    const p = typeof doc.path === 'string' ? normalizeArticlePath(doc.path) : ''
    if (p) paths.add(p)
  }
  return [...paths]
}

/**
 * Listed paths for changed MODX rows (for incremental search content fetch).
 *
 * @param {Map<number, Record<string, unknown>>} workingById
 * @param {Set<number>} changedIds
 * @param {(doc: Record<string, unknown>) => boolean} isListedDoc
 */
export function changedListedPaths(workingById, changedIds, isListedDoc) {
  const paths = new Set()
  for (const id of changedIds) {
    const doc = workingById.get(id)
    if (!doc || !isListedDoc(doc)) continue
    const p = typeof doc.path === 'string' ? normalizeArticlePath(doc.path) : ''
    if (p) paths.add(p)
  }
  return [...paths]
}

/**
 * @param {import('firebase-admin/firestore').Firestore} firestore
 * @param {Record<string, unknown>[]} projectionDocs slim docs for stats + path list
 * @param {{
 *   changedPaths?: string[]
 *   removedPaths?: string[]
 *   fullRebuild?: boolean
 *   preferRecipesJson?: boolean
 * }} [options]
 */
export async function buildAndUploadSearchIndex(firestore, projectionDocs, options = {}) {
  const {
    changedPaths = [],
    removedPaths = [],
    fullRebuild = false,
    preferRecipesJson = true,
  } = options

  const collectionsMod = await import(
    pathToFileURL(path.join(root, 'src/lib/modx/collections.ts')).href
  )
  const { isListedDoc } = collectionsMod

  const listedPaths = listedPathsFromProjection(projectionDocs, isListedDoc)
  const listedCount = projectionDocs.filter(isListedDoc).length

  let miniSearch = createMiniSearch()
  let searchMetaReads = 0
  let articleReads = 0
  let recipeReads = 0

  const prev = await loadPreviousMiniSearch(firestore)
  searchMetaReads = prev.reads
  const canIncremental = !fullRebuild && prev.loaded

  if (canIncremental) {
    miniSearch = prev.miniSearch
    console.log('search index: incremental patch')

    for (const p of removedPaths) {
      const norm = normalizeArticlePath(p)
      if (!norm) continue
      try {
        miniSearch.discard(norm)
      } catch {
        /* not in index */
      }
    }

    const pathsToFetch = changedPaths.map((p) => normalizeArticlePath(p)).filter(Boolean)
    if (pathsToFetch.length > 0) {
      const { indexed, reads } = await addArticlesInBatches(
        firestore,
        pathsToFetch,
        miniSearch,
        new Set()
      )
      articleReads = reads
      console.log(`  search index: patched ${indexed} article(s), ${pathsToFetch.length} path(s)`)
    }

    discardRecipeSearchDocs(miniSearch)
  } else {
    miniSearch = createMiniSearch()
    console.log(
      fullRebuild
        ? 'search index: full rebuild'
        : 'search index: full rebuild (no previous index)'
    )
    const { reads } = await addArticlesInBatches(
      firestore,
      listedPaths,
      miniSearch,
      new Set()
    )
    articleReads = reads
  }

  let recipes
  if (preferRecipesJson && fs.existsSync(RECIPES_JSON_PATH)) {
    recipes = loadRecipesFromJson(RECIPES_JSON_PATH)
      .filter((r) => r.published !== false)
      .map((r) => pickRecipeFields(r))
    recipeReads = 0
  } else {
    recipes = await loadRecipesForSearch(firestore, { preferJson: false })
    recipeReads = recipes.length
  }

  let recipeCount = 0
  for (const recipe of recipes) {
    const searchDoc = recipeToSearchDoc(recipe)
    if (miniSearch.has(searchDoc.id)) miniSearch.discard(searchDoc.id)
    miniSearch.add(searchDoc)
    recipeCount++
  }

  const version = Date.now()
  const json = JSON.stringify(miniSearch.toJSON())
  miniSearch.removeAll()
  const gzipped = gzipSync(Buffer.from(json, 'utf8'))

  const objectPath = `search/index-${version}.json.gz`
  const indexUrl = await uploadPublicFile(objectPath, gzipped, 'application/gzip')

  const articleCount = listedPaths.length

  await firestore.collection('meta').doc('search').set({
    indexUrl,
    version,
    generatedAt: new Date().toISOString(),
    articleCount,
    recipeCount,
  })

  await firestore.collection('meta').doc('stats').set({
    articleCount,
    listedCount,
    recipeCount,
    updatedAt: new Date().toISOString(),
  })

  const staticMetaPath = path.join(root, 'static', 'search-meta.json')
  fs.mkdirSync(path.dirname(staticMetaPath), { recursive: true })
  fs.writeFileSync(
    staticMetaPath,
    JSON.stringify({ indexUrl, version, articleCount, recipeCount }, null, 2)
  )

  console.log(
    `search index: ${objectPath} (${(gzipped.length / 1024 / 1024).toFixed(2)} MiB gzip), articles=${articleCount}, recipes=${recipeCount}, reads={articles:${articleReads},recipes:${recipeReads},meta:${searchMetaReads}}`
  )

  return {
    indexUrl,
    version,
    articleCount,
    recipeCount,
    listedCount,
    reads: {
      searchArticles: articleReads,
      searchRecipes: recipeReads,
      searchMeta: searchMetaReads,
    },
  }
}
