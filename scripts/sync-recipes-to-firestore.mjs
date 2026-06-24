/**
 * Upload src/lib/data/recipes.json to Firestore `recipes/{year}-{id}`.
 * Removes Firestore recipe docs that are no longer present in recipes.json (e.g. after year re-keys).
 *
 * Diff-based: per-recipe content hashes live in meta/recipesUpload, so only
 * new/changed recipes are written and orphans are derived from the hash map
 * without scanning the collection. A no-change run costs 1 read + 0 writes.
 * Pass --force to rewrite every doc and re-scan the collection for orphans
 * (use after manual Firestore edits, which the hash map cannot see).
 *
 * Usage:
 *   node scripts/sync-recipes-to-firestore.mjs           # dry run
 *   node scripts/sync-recipes-to-firestore.mjs --apply   # write + optional search rebuild
 *   node scripts/sync-recipes-to-firestore.mjs --apply --reindex
 *   node scripts/sync-recipes-to-firestore.mjs --apply --force
 */
import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { getFirestoreDb } from './lib/firebase-admin.mjs'
import { buildAndUploadSearchIndex } from './lib/search-index.mjs'
import { normalizeRecipeIngredientPunctuation } from './lib/normalize-ingredient-punctuation.mjs'
import { stringifyRecipesJson } from '../src/lib/recipesJsonFormat.js'
import {
  loadProjectionDocsForSync,
  uploadProjectionSnapshot,
} from './lib/firestore-docs.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const RECIPES_PATH = path.join(root, 'src/lib/data/recipes.json')
const CATEGORIES_PATH = path.join(root, 'src/lib/data/categories.json')

const apply = process.argv.includes('--apply')
const reindex = process.argv.includes('--reindex')
const force = process.argv.includes('--force')

/** Per-recipe upload hashes + catalogue revision (read by the dev server too). */
const RECIPES_UPLOAD_DOC = 'recipesUpload'

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function recipeDocId(recipe) {
  return `${recipe.year}-${recipe.id}`
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

function recipeHash(recipe) {
  return createHash('sha1').update(stableStringify(recipe)).digest('hex')
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

async function upsertRecipesById(firestore, recipesById, ids) {
  let batch = firestore.batch()
  let count = 0
  for (const docId of ids) {
    batch.set(firestore.collection('recipes').doc(docId), recipesById.get(docId))
    count += 1
    if (count % 400 === 0) {
      await batch.commit()
      batch = firestore.batch()
    }
  }
  if (count % 400 !== 0) await batch.commit()
  return count
}

async function deleteRecipeDocs(firestore, ids) {
  if (ids.length === 0) return 0
  let batch = firestore.batch()
  let count = 0
  for (const docId of ids) {
    batch.delete(firestore.collection('recipes').doc(docId))
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

  // Strip stray trailing list punctuation ("…,") from ingredient fields so it
  // never reaches Firestore; persist the cleaned file when anything changed.
  const normalizedCount = recipes.filter(normalizeRecipeIngredientPunctuation).length
  if (normalizedCount > 0) {
    console.log(`Normalized ingredient punctuation in ${normalizedCount} recipe(s)`)
    if (apply) {
      fs.writeFileSync(RECIPES_PATH, stringifyRecipesJson(recipes))
      console.log(`Rewrote ${path.relative(root, RECIPES_PATH)}`)
    }
  }

  /** docId → recipe (valid ids only) */
  const recipesById = new Map(
    recipes
      .filter((r) => r?.id && Number.isFinite(Number(r?.year)))
      .map((r) => [recipeDocId(r), r])
  )

  console.log(`recipes.json: ${recipes.length} recipes, ${recipesById.size} valid doc ids`)

  const firestore = getFirestoreDb()

  // Previous upload hashes — the diff baseline. Missing doc (first run) ⇒ full upload.
  const uploadSnap = await firestore.collection('meta').doc(RECIPES_UPLOAD_DOC).get()
  const prevHashes = (!force && uploadSnap.exists && uploadSnap.data()?.hashes) || {}
  const haveBaseline = !force && uploadSnap.exists && Object.keys(prevHashes).length > 0

  const nextHashes = {}
  const changedIds = []
  for (const [docId, recipe] of recipesById) {
    const hash = recipeHash(recipe)
    nextHashes[docId] = hash
    if (prevHashes[docId] !== hash) changedIds.push(docId)
  }

  // Orphans: from the hash map when we have a baseline, else from a collection scan.
  let orphanIds
  if (haveBaseline) {
    orphanIds = Object.keys(prevHashes).filter((id) => !recipesById.has(id))
  } else {
    const existingSnap = await firestore.collection('recipes').select().get()
    orphanIds = existingSnap.docs.filter((doc) => !recipesById.has(doc.id)).map((doc) => doc.id)
    console.log(`Firestore recipes now: ${existingSnap.size}`)
  }

  console.log(
    haveBaseline
      ? `Diff vs meta/${RECIPES_UPLOAD_DOC}: would upsert ${changedIds.length} changed/new`
      : `No upload baseline${force ? ' (--force)' : ''}: would upsert all ${recipesById.size}`
  )
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
  const upsertIds = haveBaseline ? changedIds : [...recipesById.keys()]
  const upserted = await upsertRecipesById(firestore, recipesById, upsertIds)
  const deleted = await deleteRecipeDocs(firestore, orphanIds)
  console.log(`Firestore recipes: upserted=${upserted}, deleted=${deleted}`)

  // Revision lets the dev server skip its full collection scan when nothing changed.
  const revision = createHash('sha1').update(stableStringify(nextHashes)).digest('hex')
  await firestore.collection('meta').doc(RECIPES_UPLOAD_DOC).set({
    hashes: nextHashes,
    revision,
    count: recipesById.size,
    generatedAt: new Date().toISOString(),
  })
  console.log(`wrote meta/${RECIPES_UPLOAD_DOC} (revision ${revision.slice(0, 12)}…)`)

  if (reindex) {
    const { docs: projectionDocs } = await loadProjectionDocsForSync(
      firestore,
      new Map(),
      [],
      { fullRebuild: true }
    )
    await uploadProjectionSnapshot(firestore, projectionDocs)
    const searchIndex = await buildAndUploadSearchIndex(firestore, projectionDocs, {
      fullRebuild: true,
      preferRecipesJson: true,
    })
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
