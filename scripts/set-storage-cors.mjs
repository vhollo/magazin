/**
 * Apply CORS rules on the Firebase Storage bucket (required for browser search index fetch).
 * Usage: npm run storage:cors
 */
import 'dotenv/config'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getStorage } from 'firebase-admin/storage'
import { getFirestoreDb } from './lib/firebase-admin.mjs'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))

function resolveBucketName() {
  if (process.env.FIREBASE_STORAGE_BUCKET) return process.env.FIREBASE_STORAGE_BUCKET
  const raw = process.env.FIREBASE_ADMIN_KEY
  if (raw) {
    const projectId = JSON.parse(raw).project_id
    if (projectId) return `${projectId}.firebasestorage.app`
  }
  throw new Error('FIREBASE_STORAGE_BUCKET or FIREBASE_ADMIN_KEY project_id required')
}

async function syncStaticSearchMeta(firestore) {
  const snap = await firestore.collection('meta').doc('search').get()
  if (!snap.exists) {
    console.warn('meta/search missing — static/search-meta.json not updated')
    return
  }
  const { indexUrl, version, articleCount, recipeCount } = snap.data()
  if (!indexUrl) {
    console.warn('meta/search.indexUrl missing — static/search-meta.json not updated')
    return
  }
  const staticMetaPath = path.join(root, 'static', 'search-meta.json')
  writeFileSync(
    staticMetaPath,
    JSON.stringify({ indexUrl, version, articleCount, recipeCount }, null, 2) + '\n'
  )
  console.log(`static/search-meta.json updated (v${version})`)
}

async function main() {
  const corsPath = path.join(root, 'scripts', 'storage-cors.json')
  const cors = JSON.parse(readFileSync(corsPath, 'utf8'))

  const firestore = getFirestoreDb()
  const bucketName = resolveBucketName()
  const bucket = getStorage().bucket(bucketName)

  await bucket.setCorsConfiguration(cors)
  console.log(`CORS applied to gs://${bucketName}`)
  console.log(JSON.stringify(cors, null, 2))

  await syncStaticSearchMeta(firestore)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
