/**
 * Aggregate every pharmacy doc in `tables/elofizetok/patika` into a single
 * `collections/patika` document so SSR `/patika` does one Firestore `.get()`
 * per request instead of reading the whole subcollection.
 *
 * Only the fields the UI actually consumes (`id`, `patika`, `irsz`, `varos`,
 * `cim`, `email`, `cegnev`) are kept — internal billing fields are dropped.
 *
 * `id` is the source document's own Firestore id, carried through so the list
 * has a key that survives a rename or a re-sort. Pharmacy names are not unique
 * (chains like "KORONA PATIKA" have branches in several towns), so without it
 * `/patika` has nothing stable to key its search index on.
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
const PUBLIC_FIELDS = ['id', 'patika', 'irsz', 'varos', 'cim', 'email', 'cegnev']

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
  // `d.data()` alone drops `d.id`, which is the only stable key these rows have.
  const all = snap.docs.map((d) => ({ ...d.data(), id: d.id }))
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

  // How many rows the name alone cannot tell apart — the reason `id` exists.
  const sharedNames = patikas.length - new Set(patikas.map((p) => p.patika)).size
  console.log(`  ${sharedNames} of ${patikas.length} entries share a name with another`)

  // `id` is part of the published payload, so a dry run shows it: confirm these
  // are opaque document keys and not something like a customer number before
  // `--apply` puts them in front of the public.
  const withoutId = patikas.filter((p) => !p.id).length
  console.log(`  sample ids: ${patikas.slice(0, 3).map((p) => p.id ?? '(none)').join(', ')}`)
  if (withoutId) console.log(`  ⚠ ${withoutId} entries have no source id — they fall back to a derived key`)

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
