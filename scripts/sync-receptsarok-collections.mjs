/**
 * Build Receptsarok UI collections from Firestore `recipes` + `categories`:
 *
 *   collections/rs-home              → categories + per-category counts (≈5 KB)
 *   collections/rs-{categoryId}      → thin RecipeLayoutEntry cards per category
 *   collections/rs-teasers           → all teasers keyed by `${year}/${id}` (for /keres)
 *
 * Each SSR route in src/routes/receptsarok then does a single `.get()` per
 * request instead of reading the whole collection.
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
const RS_TEASERS_DOC = 'rs-teasers'

/** Firestore doc size limit (1 MiB); we warn well before that. */
const FIRESTORE_SOFT_LIMIT_BYTES = 900 * 1024

function approxDocSize(value) {
  return Buffer.byteLength(JSON.stringify(value), 'utf8')
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

function buildRsTeasers(recipes, helpers) {
  const { toTeaser } = helpers
  /** @type {Record<string, object>} */
  const teasersByKey = {}
  for (const r of recipes) {
    teasersByKey[`${r.year}/${r.id}`] = toTeaser(r)
  }
  return {
    teasersByKey,
    generatedAt: new Date().toISOString(),
  }
}

async function main() {
  const helpersUrl = pathToFileURL(path.join(root, 'src/lib/receptsarok.ts')).href
  const { isRecipeFree, toLayoutRecipe, toTeaser } = await import(helpersUrl)
  const helpers = { isRecipeFree, toLayoutRecipe, toTeaser }

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
  const rsTeasers = buildRsTeasers(recipes, helpers)

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
  const teaserSize = approxDocSize(rsTeasers)
  const teaserFlag = teaserSize > FIRESTORE_SOFT_LIMIT_BYTES ? ' ⚠ NEAR 1 MiB' : ''
  if (teaserSize > FIRESTORE_SOFT_LIMIT_BYTES) oversized += 1
  console.log(
    `  collections/${RS_TEASERS_DOC}: ${Object.keys(rsTeasers.teasersByKey).length} teasers, ≈ ${teaserSize} bytes${teaserFlag}`
  )

  if (oversized > 0) {
    console.warn(
      `\n${oversized} doc(s) are within ${(FIRESTORE_SOFT_LIMIT_BYTES / 1024).toFixed(0)} KiB of the 1 MiB Firestore limit — consider chunking.`
    )
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

  await firestore.collection(COLLECTIONS).doc(RS_TEASERS_DOC).set(rsTeasers)
  written += 1
  console.log(`wrote collections/${RS_TEASERS_DOC}`)

  console.log(`\ndone: ${written} docs written`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
