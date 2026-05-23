/**
 * Finish backfill after docs/collections are written: search index, relatedCards, meta/sync.
 * Usage: node scripts/finish-modx-sync.mjs
 */
import 'dotenv/config'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { getFirestoreDb } from './lib/firebase-admin.mjs'
import { buildAndUploadSearchIndex } from './lib/search-index.mjs'
import { updateRelatedCards } from './lib/related-cards.mjs'
import { loadProjectionDocs } from './lib/firestore-docs.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const META_SYNC_DOC = 'sync'

async function main() {
  const firestore = getFirestoreDb()
  const projectionDocs = await loadProjectionDocs(firestore)
  console.log(`loaded ${projectionDocs.length} projection docs from Firestore`)

  const searchIndex = await buildAndUploadSearchIndex(firestore, projectionDocs)

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

  const lastEdit = projectionDocs.reduce(
    (max, doc) => (Number(doc.editedon) > max ? Number(doc.editedon) : max),
    0
  )
  await firestore.collection('meta').doc(META_SYNC_DOC).set(
    { lastEdit, syncedAt: new Date().toISOString() },
    { merge: true }
  )

  console.log(
    `finish complete: docs=${projectionDocs.length}, listed=${listedDocs.length}, relatedCards=${relatedUpdated}, search v${searchIndex.version}, lastEdit=${lastEdit}`
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
