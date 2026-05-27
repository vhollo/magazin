/**
 * Upload src/lib/data/recipes.json to Firestore `recipes/{year}-{id}`.
 * Removes Firestore recipe docs that are no longer present in recipes.json (e.g. after year re-keys).
 *
 * Usage:
 *   node scripts/sync-recipes-to-firestore.mjs           # dry run
 *   node scripts/sync-recipes-to-firestore.mjs --apply   # write + optional search rebuild
 *   node scripts/sync-recipes-to-firestore.mjs --apply --reindex
 */
import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { getFirestoreDb } from './lib/firebase-admin.mjs'
import { buildAndUploadSearchIndex } from './lib/search-index.mjs'
import { loadProjectionDocs } from './lib/firestore-docs.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const RECIPES_PATH = path.join(root, 'src/lib/data/recipes.json')
const CATEGORIES_PATH = path.join(root, 'src/lib/data/categories.json')

const apply = process.argv.includes('--apply')
const reindex = process.argv.includes('--reindex')

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function recipeDocId(recipe) {
  return `${recipe.year}-${recipe.id}`
}

async function seedCategoriesIfEmpty(firestore) {
  const snap = await firestore.collection('categories').limit(1).get()
  if (!snap.empty) return 0

  if (!fs.existsSync(CATEGORIES_PATH)) {
    console.warn('categories collection empty and no categories.json — skip seed')
    return 0
  }

  const categories = readJson(CATEGORIES_PATH)
  if (!Array.isArray(categories)) throw new Error('categories.json must be an array')

  let batch = firestore.batch()
  let count = 0
  for (const category of categories) {
    const id = String(category?.id ?? '').trim()
    if (!id) continue
    batch.set(firestore.collection('categories').doc(id), {
      name: category.name,
      image: category.image,
      order: category.order,
      recipeCount: category.recipeCount ?? 0,
    })
    count += 1
    if (count % 400 === 0) {
      await batch.commit()
      batch = firestore.batch()
    }
  }
  if (count % 400 !== 0) await batch.commit()
  console.log(`Seeded ${count} category documents`)
  return count
}

async function upsertRecipes(firestore, recipes) {
  let batch = firestore.batch()
  let count = 0
  for (const recipe of recipes) {
    const docId = recipeDocId(recipe)
    batch.set(firestore.collection('recipes').doc(docId), recipe)
    count += 1
    if (count % 400 === 0) {
      await batch.commit()
      batch = firestore.batch()
    }
  }
  if (count % 400 !== 0) await batch.commit()
  return count
}

async function deleteOrphanRecipes(firestore, keepIds) {
  const snap = await firestore.collection('recipes').select().get()
  const orphans = snap.docs.filter((doc) => !keepIds.has(doc.id))
  if (orphans.length === 0) return 0

  let batch = firestore.batch()
  let count = 0
  for (const doc of orphans) {
    batch.delete(doc.ref)
    count += 1
    if (count % 400 === 0) {
      await batch.commit()
      batch = firestore.batch()
    }
  }
  if (count % 400 !== 0) await batch.commit()
  return count
}

async function main() {
  if (!fs.existsSync(RECIPES_PATH)) {
    throw new Error(`Missing ${RECIPES_PATH}`)
  }

  const recipes = readJson(RECIPES_PATH)
  if (!Array.isArray(recipes)) throw new Error('recipes.json must be an array')

  const keepIds = new Set(
    recipes
      .filter((r) => r?.id && Number.isFinite(Number(r?.year)))
      .map((r) => recipeDocId(r))
  )

  console.log(`recipes.json: ${recipes.length} recipes, ${keepIds.size} valid doc ids`)

  const firestore = getFirestoreDb()
  const existingSnap = await firestore.collection('recipes').select().get()
  const orphanIds = existingSnap.docs.filter((doc) => !keepIds.has(doc.id)).map((doc) => doc.id)

  console.log(`Firestore recipes now: ${existingSnap.size}`)
  console.log(`Would upsert: ${keepIds.size}`)
  console.log(`Would delete orphans: ${orphanIds.length}`)
  if (orphanIds.length > 0 && orphanIds.length <= 20) {
    console.log('  orphans:', orphanIds.join(', '))
  } else if (orphanIds.length > 20) {
    console.log('  orphans (first 20):', orphanIds.slice(0, 20).join(', '), '…')
  }

  if (!apply) {
    console.log('\nDry run — pass --apply to write. Add --reindex to rebuild search index after upload.')
    return
  }

  await seedCategoriesIfEmpty(firestore)
  const upserted = await upsertRecipes(firestore, recipes)
  const deleted = await deleteOrphanRecipes(firestore, keepIds)
  console.log(`Firestore recipes: upserted=${upserted}, deleted=${deleted}`)

  if (reindex) {
    const projectionDocs = await loadProjectionDocs(firestore)
    const searchIndex = await buildAndUploadSearchIndex(firestore, projectionDocs)
    console.log(
      `Search index rebuilt: v${searchIndex.version} (${searchIndex.articleCount} articles, ${searchIndex.recipeCount} recipes)`
    )
  } else {
    console.log('Tip: run npm run sync:modx:finish (or --reindex) to refresh search index recipe paths/years.')
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
