import { gzipSync } from 'node:zlib'
import MiniSearch from 'minisearch'
import { pathToFileURL } from 'node:url'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { encodeDocPathId, normalizeArticlePath } from './doc-path-id.mjs'
import { uploadPublicFile } from './firebase-storage.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '../..')

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
  const path = fromDoc || fromHint
  if (path) return path
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
 */
export async function loadRecipesForSearch(firestore) {
  const snap = await firestore.collection('recipes').select(...RECIPE_SEARCH_FIELDS).get()
  if (snap.empty) {
    try {
      const fs = await import('node:fs')
      const data = fs.readFileSync(path.join(root, 'src/lib/data/recipes.json'), 'utf8')
      const parsed = JSON.parse(data)
      return Array.isArray(parsed)
        ? parsed.filter((r) => r.published !== false).map((r) => pickRecipeFields(r))
        : []
    } catch {
      return []
    }
  }
  return snap.docs
    .map((d) => ({ id: d.id, ...pickRecipeFields(d.data()) }))
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
  const path = `receptsarok/${r.year}/${r.id}`
  return {
    id: `rs-${r.year}-${r.id}`,
    path,
    title: r.title,
    longtitle: r.title,
    description: r.description ?? '',
    ellipsis: r.description ?? '',
    szerzo: r.author ?? '',
    content: `${terms} ${ing} ${r.title} ${r.author ?? ''}`.trim(),
    img: r.image,
    tv: { tags: ['recept'] },
    free: r.free === true,
    recipeTeaser: (() => {
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
        saturatedFat: num(r.saturatedFat) ?? num(t?.saturatedFat),
        carbs: num(r.carbs) ?? num(t?.carbs),
        fiber: num(r.fiber) ?? num(t?.fiber),
        image: r.image ?? null,
        img: r.img ?? null,
        video: r.video,
        servings:
          r.servings && typeof r.servings.amount === 'number'
            ? r.servings
            : { amount: 0, unit: '' },
        hasSubRecipes: Boolean(r.hasSubRecipes),
        free: r.free === true,
      }
    })(),
  }
}

/**
 * Index listed articles in batches so we never hold every full HTML body in memory.
 *
 * @param {import('firebase-admin/firestore').Firestore} firestore
 * @param {string[]} listedPaths unique article paths
 * @param {MiniSearch} miniSearch
 */
/**
 * @param {import('firebase-admin/firestore').Firestore} firestore
 * @param {string[]} listedPaths unique canonical article paths
 * @param {MiniSearch} miniSearch
 * @param {Set<string>} seenIds
 */
async function addArticlesInBatches(firestore, listedPaths, miniSearch, seenIds) {
  let indexed = 0
  let skipped = 0

  for (let i = 0; i < listedPaths.length; i += SEARCH_BATCH_SIZE) {
    const pathBatch = listedPaths.slice(i, i + SEARCH_BATCH_SIZE)
    const batchIds = pathBatch.map((p) => encodeDocPathId(p))
    const refs = batchIds.map((id) => firestore.collection('docs').doc(id))
    const snaps = await firestore.getAll(...refs)

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
      if (seenIds.has(searchDoc.id)) {
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

  return indexed
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
 * @param {import('firebase-admin/firestore').Firestore} firestore
 * @param {Record<string, unknown>[]} projectionDocs slim docs for stats + path list
 */
export async function buildAndUploadSearchIndex(firestore, projectionDocs) {
  const collectionsMod = await import(
    pathToFileURL(path.join(root, 'src/lib/modx/collections.ts')).href
  )
  const { isListedDoc } = collectionsMod

  const listedPaths = listedPathsFromProjection(projectionDocs, isListedDoc)
  const listedCount = projectionDocs.filter(isListedDoc).length

  const miniSearch = createMiniSearch()
  const seenIds = new Set()
  const articleCount = await addArticlesInBatches(firestore, listedPaths, miniSearch, seenIds)

  const recipes = await loadRecipesForSearch(firestore)
  let recipeCount = 0
  for (const recipe of recipes) {
    const searchDoc = recipeToSearchDoc(recipe)
    if (seenIds.has(searchDoc.id)) continue
    seenIds.add(searchDoc.id)
    miniSearch.add(searchDoc)
    recipeCount++
  }

  const version = Date.now()
  const json = JSON.stringify(miniSearch.toJSON())
  miniSearch.removeAll()
  const gzipped = gzipSync(Buffer.from(json, 'utf8'))

  const objectPath = `search/index-${version}.json.gz`
  const indexUrl = await uploadPublicFile(objectPath, gzipped, 'application/gzip')

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
  const fs = await import('node:fs')
  fs.mkdirSync(path.dirname(staticMetaPath), { recursive: true })
  fs.writeFileSync(
    staticMetaPath,
    JSON.stringify({ indexUrl, version, articleCount, recipeCount }, null, 2)
  )

  console.log(
    `search index: ${objectPath} (${(gzipped.length / 1024 / 1024).toFixed(2)} MiB gzip), articles=${articleCount}, recipes=${recipeCount}`
  )

  return { indexUrl, version, articleCount, recipeCount, listedCount }
}
