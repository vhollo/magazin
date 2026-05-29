/**
 * Build Receptsarok UI collections from Firestore `recipes` + `categories`:
 *
 *   collections/rs-home              → categories + per-category counts (≈5 KB)
 *   collections/rs-{categoryId}      → thin RecipeLayoutEntry cards per category
 *   collections/rs-teasers-{year}      → slim keres teasers keyed by recipe id (per year)
 *   collections/rs-teasers-index       → { years: number[] } for parallel SSR reads
 *
 * Usage:
 *   node scripts/sync-receptsarok-collections.mjs           # dry run
 *   node scripts/sync-receptsarok-collections.mjs --apply   # write
 *
 * Env: FIREBASE_ADMIN_KEY
 */
import 'dotenv/config'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { getFirestoreDb } from './lib/firebase-admin.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

const apply = process.argv.includes('--apply')

const COLLECTIONS = 'collections'
const RS_HOME_DOC = 'rs-home'
const RS_TEASERS_INDEX_DOC = 'rs-teasers-index'
/** @deprecated Monolithic doc — removed on apply when shards are written. */
const RS_TEASERS_LEGACY_DOC = 'rs-teasers'

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

function isPublished(recipe) {
  return recipe?.published !== false
}

async function loadRecipes(firestore) {
  const snap = await firestore.collection('recipes').get()
  return snap.docs.map((d) => d.data())
}

async function loadCategories(firestore) {
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

  console.log('loading recipes + categories from Firestore…')
  const [allRecipes, categories] = await Promise.all([
    loadRecipes(firestore),
    loadCategories(firestore),
  ])
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

  console.log(
    `\n${RS_HOME_DOC}: ${rsHome.categories.length} cats, totalRecipes=${rsHome.totalRecipes}, totalFree=${rsHome.totalFree}`
  )
  console.log(`  size ≈ ${approxDocSize(rsHome)} bytes`)

  let oversized = 0
  for (const [id, doc] of Object.entries(rsCategories)) {
    const size = approxDocSize(doc)
    const flag = size > FIRESTORE_SOFT_LIMIT_BYTES ? ' ⚠ NEAR 1 MiB' : ''
    if (size > FIRESTORE_SOFT_LIMIT_BYTES) oversized += 1
    console.log(`  collections/rs-${id}: ${doc.count} cards, ≈ ${size} bytes${flag}`)
  }

  let totalTeasers = 0
  for (const year of years) {
    const doc = {
      year,
      teasersByKey: teaserShards[year],
      count: Object.keys(teaserShards[year]).length,
      generatedAt: new Date().toISOString(),
    }
    totalTeasers += doc.count
    const size = approxDocSize(doc)
    const entries = estimateIndexEntries(doc)
    const flags = []
    if (size > FIRESTORE_SOFT_LIMIT_BYTES) flags.push('NEAR 1 MiB')
    if (entries > FIRESTORE_INDEX_ENTRY_SOFT_LIMIT) flags.push('INDEX RISK')
    if (flags.length) oversized += 1
    console.log(
      `  collections/${rsTeasersShardDocId(year)}: ${doc.count} teasers, ≈ ${size} bytes, ~${entries} index entries${flags.length ? ` ⚠ ${flags.join(', ')}` : ''}`
    )
  }
  console.log(`  ${RS_TEASERS_INDEX_DOC}: years=[${years.join(', ')}], totalTeasers=${totalTeasers}`)

  if (oversized > 0) {
    console.warn(`\n${oversized} doc(s) flagged — check size or index-entry estimates.`)
  }

  if (!apply) {
    console.log('\nDry run — pass --apply to write.')
    return
  }

  let written = 0

  await firestore.collection(COLLECTIONS).doc(RS_HOME_DOC).set(rsHome)
  written += 1
  console.log(`wrote collections/${RS_HOME_DOC}`)

  for (const [id, doc] of Object.entries(rsCategories)) {
    await firestore.collection(COLLECTIONS).doc(`rs-${id}`).set(doc)
    written += 1
    console.log(`wrote collections/rs-${id} (${doc.count} cards)`)
  }

  for (const year of years) {
    const doc = {
      year,
      teasersByKey: teaserShards[year],
      count: Object.keys(teaserShards[year]).length,
      generatedAt: new Date().toISOString(),
    }
    await firestore.collection(COLLECTIONS).doc(rsTeasersShardDocId(year)).set(doc)
    written += 1
    console.log(`wrote collections/${rsTeasersShardDocId(year)} (${doc.count} teasers)`)
  }

  await firestore.collection(COLLECTIONS).doc(RS_TEASERS_INDEX_DOC).set({
    years,
    totalTeasers,
    generatedAt: new Date().toISOString(),
  })
  written += 1
  console.log(`wrote collections/${RS_TEASERS_INDEX_DOC}`)

  try {
    await firestore.collection(COLLECTIONS).doc(RS_TEASERS_LEGACY_DOC).delete()
    console.log(`deleted legacy collections/${RS_TEASERS_LEGACY_DOC}`)
  } catch {
    /* optional */
  }

  console.log(`\ndone: ${written} docs written`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
