/**
 * Build Receptsarok UI collections from src/lib/data/recipes.json + categories.json
 * (canonical; pass --from-firestore to read the Firestore `recipes` + `categories`
 * collections instead — costs ~1 read per recipe):
 *
 *   collections/rs-home              → categories + per-category counts (≈5 KB)
 *   collections/rs-{categoryId}      → thin RecipeLayoutEntry cards per category
 *   collections/rs-teasers-{year}    → slim keres teasers keyed by recipe id (per year)
 *   collections/rs-teasers-index     → { years: number[] } for parallel SSR reads
 *   meta/stats                       → { recipeCount, freeCount } merged (root layout reads this)
 *   Storage receptsarok/catalog.json.gz → private slim catalog for the meal planner API
 *
 * Unchanged docs are skipped: content hashes live in meta/rsCollections (one read),
 * so a no-op run costs 1 read + 0 writes.
 *
 * Usage:
 *   node scripts/sync-receptsarok-collections.mjs           # dry run
 *   node scripts/sync-receptsarok-collections.mjs --apply   # write
 *
 * Env: FIREBASE_ADMIN_KEY (+ FIREBASE_STORAGE_BUCKET for the catalog upload)
 */
import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { gzipSync } from 'node:zlib'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { getFirestoreDb } from './lib/firebase-admin.mjs'
import { uploadPrivateFile } from './lib/firebase-storage.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

const RECIPES_PATH = path.join(root, 'src/lib/data/recipes.json')
const CATEGORIES_PATH = path.join(root, 'src/lib/data/categories.json')

const apply = process.argv.includes('--apply')
const fromFirestore = process.argv.includes('--from-firestore')

const COLLECTIONS = 'collections'
const RS_HOME_DOC = 'rs-home'
const RS_TEASERS_INDEX_DOC = 'rs-teasers-index'
/** @deprecated Monolithic doc — removed on apply when shards are written. */
const RS_TEASERS_LEGACY_DOC = 'rs-teasers'
/** Content hashes of all rs-* docs — read first so unchanged docs are skipped. */
const RS_HASHES_DOC = 'rsCollections'
export const RS_CATALOG_OBJECT_PATH = 'receptsarok/catalog.json.gz'

/** Firestore doc size / index-entry soft limits. */
const FIRESTORE_SOFT_LIMIT_BYTES = 900 * 1024
const FIRESTORE_INDEX_ENTRY_SOFT_LIMIT = 35_000

export function rsTeasersShardDocId(year) {
  return `rs-teasers-${year}`
}

function approxDocSize(value) {
  return Buffer.byteLength(JSON.stringify(value), 'utf8')
}

/** Rough index-entry estimate: one per scalar field path in the JSON tree. */
function estimateIndexEntries(value) {
  let n = 0
  const walk = (v) => {
    if (v === null || v === undefined) return
    if (Array.isArray(v)) {
      for (const item of v) walk(item)
      return
    }
    if (typeof v === 'object') {
      for (const key of Object.keys(v)) {
        n += 1
        walk(v[key])
      }
      return
    }
    n += 1
  }
  walk(value)
  return n
}

/** Deterministic stringify (sorted keys) so content hashes are stable. */
function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}

/** Hash of a doc's payload, ignoring the volatile generatedAt stamp. */
function contentHash(doc) {
  const { generatedAt: _ignored, ...rest } = doc
  return createHash('sha1').update(stableStringify(rest)).digest('hex')
}

function isPublished(recipe) {
  return recipe?.published !== false
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

async function loadRecipesFromFirestore(firestore) {
  const snap = await firestore.collection('recipes').get()
  return snap.docs.map((d) => d.data())
}

async function loadCategoriesFromFirestore(firestore) {
  const snap = await firestore.collection('categories').get()
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}

function buildRsHome(recipes, categories, helpers) {
  const { isRecipeFree } = helpers
  const recipeCounts = {}
  const freeCountsByCategory = {}
  let totalFree = 0

  for (const r of recipes) {
    recipeCounts[r.category] = (recipeCounts[r.category] || 0) + 1
    if (isRecipeFree(r)) {
      freeCountsByCategory[r.category] = (freeCountsByCategory[r.category] || 0) + 1
      totalFree += 1
    }
  }

  const enriched = categories.map((cat) => ({
    ...cat,
    recipeCount: recipeCounts[cat.id] || 0,
  }))

  return {
    categories: enriched,
    totalRecipes: recipes.length,
    totalFree,
    freeCountsByCategory,
    generatedAt: new Date().toISOString(),
  }
}

function buildRsCategoryDocs(recipes, categoryIds, helpers) {
  const { toLayoutRecipe } = helpers
  /** @type {Record<string, { category: string, cards: object[], count: number, generatedAt: string }>} */
  const out = {}
  const generatedAt = new Date().toISOString()

  for (const id of categoryIds) {
    const cards = recipes.filter((r) => r.category === id).map(toLayoutRecipe)
    out[id] = { category: id, cards, count: cards.length, generatedAt }
  }
  return out
}

/**
 * @param {Record<string, unknown>[]} recipes
 * @param {{ toKeresTeaser: (r: unknown) => object }} helpers
 */
function buildRsTeaserShards(recipes, helpers) {
  const { toKeresTeaser } = helpers
  /** @type {Record<number, Record<string, object>>} */
  const byYear = {}
  for (const r of recipes) {
    const year = Number(r.year)
    if (!Number.isFinite(year)) continue
    if (!byYear[year]) byYear[year] = {}
    byYear[year][String(r.id)] = toKeresTeaser(r)
  }
  return byYear
}

async function main() {
  const helpersUrl = pathToFileURL(path.join(root, 'src/lib/receptsarok.ts')).href
  const { isRecipeFree, toLayoutRecipe, toKeresTeaser } = await import(helpersUrl)
  const helpers = { isRecipeFree, toLayoutRecipe, toKeresTeaser }

  const firestore = getFirestoreDb()

  let allRecipes
  let categories
  if (fromFirestore) {
    console.log('loading recipes + categories from Firestore…')
    ;[allRecipes, categories] = await Promise.all([
      loadRecipesFromFirestore(firestore),
      loadCategoriesFromFirestore(firestore),
    ])
  } else {
    console.log('loading recipes + categories from src/lib/data (pass --from-firestore to override)…')
    allRecipes = readJson(RECIPES_PATH)
    categories = readJson(CATEGORIES_PATH).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  }
  console.log(
    `  recipes: ${allRecipes.length} (${allRecipes.filter(isPublished).length} published), categories: ${categories.length}`
  )

  const recipes = allRecipes.filter(isPublished)
  const categoryIds = categories.map((c) => c.id)

  const rsHome = buildRsHome(recipes, categories, helpers)
  const rsCategories = buildRsCategoryDocs(recipes, categoryIds, helpers)
  const teaserShards = buildRsTeaserShards(recipes, helpers)
  const years = Object.keys(teaserShards)
    .map(Number)
    .filter(Number.isFinite)
    .sort((a, b) => b - a)

  /** Every Firestore doc this sync owns: id → payload. */
  const docs = new Map()
  docs.set(RS_HOME_DOC, rsHome)
  for (const [id, doc] of Object.entries(rsCategories)) docs.set(`rs-${id}`, doc)
  let totalTeasers = 0
  for (const year of years) {
    const shard = {
      year,
      teasersByKey: teaserShards[year],
      count: Object.keys(teaserShards[year]).length,
      generatedAt: new Date().toISOString(),
    }
    totalTeasers += shard.count
    docs.set(rsTeasersShardDocId(year), shard)
  }
  docs.set(RS_TEASERS_INDEX_DOC, {
    years,
    totalTeasers,
    generatedAt: new Date().toISOString(),
  })

  // Slim meal-planner catalog (layout entries only — no instructions/subRecipes).
  const catalogEntries = recipes.map(toLayoutRecipe)
  const catalogJson = JSON.stringify({ recipes: catalogEntries })
  const catalogGz = gzipSync(Buffer.from(catalogJson, 'utf8'))
  const catalogHash = createHash('sha1').update(catalogJson).digest('hex')

  console.log(
    `\n${RS_HOME_DOC}: ${rsHome.categories.length} cats, totalRecipes=${rsHome.totalRecipes}, totalFree=${rsHome.totalFree}`
  )
  console.log(`  size ≈ ${approxDocSize(rsHome)} bytes`)

  let oversized = 0
  for (const [id, doc] of docs) {
    if (id === RS_HOME_DOC || id === RS_TEASERS_INDEX_DOC) continue
    const size = approxDocSize(doc)
    const entries = estimateIndexEntries(doc)
    const flags = []
    if (size > FIRESTORE_SOFT_LIMIT_BYTES) flags.push('NEAR 1 MiB')
    if (id.startsWith('rs-teasers-') && entries > FIRESTORE_INDEX_ENTRY_SOFT_LIMIT)
      flags.push('INDEX RISK')
    if (flags.length) oversized += 1
    const count = doc.count ?? ''
    console.log(
      `  collections/${id}: ${count} item(s), ≈ ${size} bytes${flags.length ? ` ⚠ ${flags.join(', ')}` : ''}`
    )
  }
  console.log(`  ${RS_TEASERS_INDEX_DOC}: years=[${years.join(', ')}], totalTeasers=${totalTeasers}`)
  console.log(
    `  catalog: ${catalogEntries.length} entries, ${catalogJson.length} bytes raw, ${catalogGz.length} bytes gz`
  )

  if (oversized > 0) {
    console.warn(`\n${oversized} doc(s) flagged — check size or index-entry estimates.`)
  }

  // Previous content hashes → skip unchanged docs (1 read for the whole run).
  const hashesSnap = await firestore.collection('meta').doc(RS_HASHES_DOC).get()
  const prevHashes = (hashesSnap.exists && hashesSnap.data()?.hashes) || {}
  const nextHashes = {}
  const changed = []
  for (const [id, doc] of docs) {
    const hash = contentHash(doc)
    nextHashes[id] = hash
    if (prevHashes[id] !== hash) changed.push(id)
  }
  const catalogChanged = prevHashes.catalog !== catalogHash
  nextHashes.catalog = catalogHash

  console.log(
    `\nchanged: ${changed.length}/${docs.size} doc(s)${changed.length ? ` → ${changed.join(', ')}` : ''}; catalog ${catalogChanged ? 'changed' : 'unchanged'}`
  )

  if (!apply) {
    console.log('\nDry run — pass --apply to write.')
    return
  }

  let written = 0
  for (const id of changed) {
    await firestore.collection(COLLECTIONS).doc(id).set(docs.get(id))
    written += 1
    console.log(`wrote collections/${id}`)
  }

  if (catalogChanged) {
    try {
      await uploadPrivateFile(RS_CATALOG_OBJECT_PATH, catalogGz, 'application/gzip', {
        recipeCount: String(catalogEntries.length),
        contentHash: catalogHash,
      })
      console.log(`uploaded ${RS_CATALOG_OBJECT_PATH} (${catalogGz.length} bytes)`)
    } catch (error) {
      console.warn(`catalog upload skipped: ${error.message}`)
      delete nextHashes.catalog // retry next run
    }
  }

  // Counts for the root layout — merged so sync:modx's articleCount survives.
  await firestore.collection('meta').doc('stats').set(
    {
      recipeCount: rsHome.totalRecipes,
      freeCount: rsHome.totalFree,
      rsGeneratedAt: new Date().toISOString(),
    },
    { merge: true }
  )
  console.log('merged meta/stats { recipeCount, freeCount }')

  await firestore.collection('meta').doc(RS_HASHES_DOC).set({
    hashes: nextHashes,
    generatedAt: new Date().toISOString(),
  })

  try {
    await firestore.collection(COLLECTIONS).doc(RS_TEASERS_LEGACY_DOC).delete()
  } catch {
    /* optional */
  }

  console.log(`\ndone: ${written} collection doc(s) written, ${docs.size - written} unchanged`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
