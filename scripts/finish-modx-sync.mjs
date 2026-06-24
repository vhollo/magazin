/**
 * Finish backfill after docs/collections are written: search index, relatedCards, projection snapshot, meta/sync.
 * Usage: node scripts/finish-modx-sync.mjs
 */
import 'dotenv/config'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { getFirestoreDb } from './lib/firebase-admin.mjs'
import { buildAndUploadSearchIndex } from './lib/search-index.mjs'
import { updateRelatedCards } from './lib/related-cards.mjs'
import {
  loadProjectionDocsForSync,
  uploadProjectionSnapshot,
} from './lib/firestore-docs.mjs'
import { loadRecipesFromJson } from './lib/receptsarok-redirect-match.mjs'
import { loadRedirectsManifest } from './lib/receptsarok-redirects-manifest.mjs'
import {
  buildRecipeKeyByModxId,
  syncRecipeRelatedCards,
  relatedWriteIds,
  updateDocRelatedRecipes,
} from './lib/related-recipe-cards.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const RS_REDIRECTS_PATH = path.join(root, 'src/lib/data/receptsarok-redirects.json')
const RECIPES_JSON_PATH = path.join(root, 'src/lib/data/recipes.json')
const META_SYNC_DOC = 'sync'

async function main() {
  const firestore = getFirestoreDb()
  const projectionResult = await loadProjectionDocsForSync(
    firestore,
    new Map(),
    [],
    { fullRebuild: true }
  )
  const projectionDocs = projectionResult.docs
  console.log(`loaded ${projectionDocs.length} projection docs (full rebuild)`)

  await uploadProjectionSnapshot(firestore, projectionDocs)

  const searchIndex = await buildAndUploadSearchIndex(firestore, projectionDocs, {
    fullRebuild: true,
    preferRecipesJson: true,
  })

  const collectionsMod = await import(
    pathToFileURL(path.join(root, 'src/lib/modx/collections.ts')).href
  )
  const { isListedDoc } = collectionsMod
  const listedDocs = projectionDocs.filter(isListedDoc)
  const workingById = new Map(listedDocs.map((d) => [d.id, d]))
  const idsForRelated = new Set(listedDocs.map((d) => d.id).filter(Boolean))

  const relatedUpdated = await updateRelatedCards(
    firestore,
    listedDocs,
    workingById,
    idsForRelated,
    collectionsMod
  )

  // Recipe-group related fields (uniform with sync:modx).
  const recipes = loadRecipesFromJson(RECIPES_JSON_PATH)
  const manifestEntries = loadRedirectsManifest(RS_REDIRECTS_PATH).entries
  const relatedCardsSync = await syncRecipeRelatedCards({
    recipes,
    manifestEntries,
    recipesJsonPath: RECIPES_JSON_PATH,
    firestore,
    apply: true,
  })
  const { publishedKeys, bySourceModxId } = buildRecipeKeyByModxId(recipes, manifestEntries)
  const docRelatedUpdated = await updateDocRelatedRecipes({
    firestore,
    projectionDocs,
    workingById,
    idsToWrite: relatedWriteIds({ changedIds: new Set(), projectionDocs, workingById, isFullSync: true }),
    publishedKeys,
    bySourceModxId,
  })

  const lastEdit = projectionDocs.reduce(
    (max, doc) => (Number(doc.editedon) > max ? Number(doc.editedon) : max),
    0
  )
  await firestore.collection('meta').doc(META_SYNC_DOC).set(
    { lastEdit, syncedAt: new Date().toISOString() },
    { merge: true }
  )

  console.log(
    `finish complete: docs=${projectionDocs.length}, listed=${listedDocs.length}, relatedCards=${relatedUpdated}, recipeRelated=${relatedCardsSync.updated}, docRelated=${docRelatedUpdated}, search v${searchIndex.version}, lastEdit=${lastEdit}`
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
