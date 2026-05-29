/**
 * Aggregate every pharmacy doc in `tables/elofizetok/patika` into a single
 * `collections/patika` document so SSR `/patika` does one Firestore `.get()`
 * per request instead of reading the whole subcollection.
 *
 * Only the fields the UI actually consumes (`patika`, `irsz`, `varos`, `cim`,
 * `email`, `cegnev`) are kept — internal billing fields are dropped.
 *
 * Usage:
 *   node scripts/sync-patika-collection.mjs           # dry run
 *   node scripts/sync-patika-collection.mjs --apply   # write
 *
 * Env: FIREBASE_ADMIN_KEY
 */
import 'dotenv/config'
import { getFirestoreDb } from './lib/firebase-admin.mjs'

const apply = process.argv.includes('--apply')

const SOURCE_COLLECTION = 'tables/elofizetok/patika'
const TARGET_DOC = 'collections/patika'

const FIRESTORE_SOFT_LIMIT_BYTES = 900 * 1024

/** Fields exposed to the UI. Keep tight to avoid leaking billing/contact data. */
const PUBLIC_FIELDS = ['patika', 'irsz', 'varos', 'cim', 'email', 'cegnev']

function pickPublic(raw) {
  const out = {}
  for (const field of PUBLIC_FIELDS) {
    const value = raw?.[field]
    if (value === undefined || value === null || value === '') continue
    out[field] = typeof value === 'number' ? String(value) : value
  }
  return out
}

function approxDocSize(value) {
  return Buffer.byteLength(JSON.stringify(value), 'utf8')
}

async function main() {
  const firestore = getFirestoreDb()

  console.log(`reading ${SOURCE_COLLECTION}…`)
  const snap = await firestore.collection(SOURCE_COLLECTION).get()
  const all = snap.docs.map((d) => d.data())
  console.log(`  ${all.length} pharmacy docs`)

  const patikas = all
    .map(pickPublic)
    .filter((p) => typeof p.patika === 'string' && p.patika.trim().length > 0)
    .sort((a, b) => (a.patika || '').localeCompare(b.patika || '', 'hu'))

  const target = {
    patikas,
    count: patikas.length,
    generatedAt: new Date().toISOString(),
  }

  const size = approxDocSize(target)
  const flag = size > FIRESTORE_SOFT_LIMIT_BYTES ? ' ⚠ NEAR 1 MiB' : ''
  console.log(
    `${TARGET_DOC}: ${patikas.length} entries, ≈ ${size} bytes${flag}`
  )

  if (!apply) {
    console.log('\nDry run — pass --apply to write.')
    return
  }

  const [colId, docId] = TARGET_DOC.split('/')
  await firestore.collection(colId).doc(docId).set(target)
  console.log(`wrote ${TARGET_DOC}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
