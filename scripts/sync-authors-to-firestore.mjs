/**
 * Import the extracted author records into Firestore and rebuild the read path.
 *
 *   authors/{slug}        the editable source of truth (FireCMS edits these)
 *   collections/authors   one aggregate doc the site reads (memory-cached, 1 read)
 *
 * The import is **create-only**: once a record exists, the CMS owns it and this
 * script never overwrites it (`--force` is the deliberate escape hatch, e.g. to
 * re-import after fixing the extractor). The aggregate, by contrast, is always
 * rebuilt from `authors/*` — run `--collection-only` after editing in the CMS.
 *
 * Usage:
 *   npm run sync:authors                  # dry run (no writes)
 *   npm run sync:authors:apply            # create missing docs + rebuild aggregate
 *   npm run sync:authors:collection       # rebuild the aggregate only
 *   node scripts/sync-authors-to-firestore.mjs --apply --force   # re-import over the CMS
 *
 * Env: FIREBASE_ADMIN_KEY
 */
import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { getFirestoreDb } from './lib/firebase-admin.mjs'

const apply = process.argv.includes('--apply')
const force = process.argv.includes('--force')
const collectionOnly = process.argv.includes('--collection-only')

const AUTHORS_PATH = path.resolve(process.cwd(), 'scripts/data/authors.json')
const AUTHORS_COLLECTION = 'authors'
const TARGET_DOC = 'collections/authors'

const FIRESTORE_SOFT_LIMIT_BYTES = 900 * 1024
const BATCH_LIMIT = 400

/** Fields the aggregate carries — everything the site renders, plus the token map. */
const AGGREGATE_FIELDS = [
  'slug',
  'name',
  'prefix',
  'displayName',
  'title',
  'affiliations',
  'cv',
  'quote',
  'photo',
  'links',
  'email',
  'support',
  'role',
  'published',
  'articleCount',
  'legacyTokens',
]

function pickAggregateFields(author) {
  const out = {}
  for (const field of AGGREGATE_FIELDS) {
    const value = author[field]
    if (value === undefined) continue
    out[field] = value
  }
  return out
}

function approxDocSize(value) {
  return Buffer.byteLength(JSON.stringify(value), 'utf8')
}

/** @param {import('firebase-admin/firestore').Firestore} firestore */
async function rebuildAggregate(firestore) {
  const snapshot = await firestore.collection(AUTHORS_COLLECTION).get()
  const authors = snapshot.docs
    .map((doc) => pickAggregateFields(doc.data()))
    .filter((author) => typeof author.slug === 'string' && author.slug)
    .sort((a, b) => String(a.name).localeCompare(String(b.name), 'hu'))

  const target = {
    authors,
    count: authors.length,
    generatedAt: new Date().toISOString(),
  }
  const size = approxDocSize(target)
  const flag = size > FIRESTORE_SOFT_LIMIT_BYTES ? ' ⚠ NEAR 1 MiB' : ''
  console.log(`${TARGET_DOC}: ${authors.length} szerző, ≈ ${size} bájt${flag}`)

  if (!apply) {
    console.log('Dry run — az aggregátum nem íródott ki.')
    return
  }
  const [collectionId, docId] = TARGET_DOC.split('/')
  await firestore.collection(collectionId).doc(docId).set(target)
  console.log(`írva: ${TARGET_DOC}`)
}

async function main() {
  const firestore = getFirestoreDb()

  if (collectionOnly) {
    await rebuildAggregate(firestore)
    return
  }

  const authors = JSON.parse(fs.readFileSync(AUTHORS_PATH, 'utf8'))
  if (!Array.isArray(authors)) throw new Error('authors.json must be an array')

  const existing = new Set(
    (await firestore.collection(AUTHORS_COLLECTION).select().get()).docs.map((doc) => doc.id)
  )

  const toWrite = []
  const skipped = []
  for (const author of authors) {
    if (!author?.slug) throw new Error(`author record without slug: ${JSON.stringify(author)}`)
    if (existing.has(author.slug) && !force) {
      skipped.push(author.slug)
      continue
    }
    toWrite.push({
      ...author,
      updatedon: new Date().toISOString(),
      source: author.source ?? 'modx-chunk',
    })
  }

  console.log(
    `authors.json: ${authors.length} rekord · Firestore-ban már: ${existing.size} · ` +
      `${force ? 'felülírandó' : 'létrehozandó'}: ${toWrite.length} · érintetlen (CMS): ${skipped.length}`
  )
  for (const author of toWrite.slice(0, 10)) console.log(`   + ${author.slug}`)
  if (toWrite.length > 10) console.log(`   … +${toWrite.length - 10}`)

  if (!apply) {
    console.log('\nDry run — írás nélkül. `--apply` írja ki.')
    await rebuildAggregate(firestore)
    return
  }

  for (let index = 0; index < toWrite.length; index += BATCH_LIMIT) {
    const batch = firestore.batch()
    for (const author of toWrite.slice(index, index + BATCH_LIMIT)) {
      batch.set(firestore.collection(AUTHORS_COLLECTION).doc(author.slug), author, { merge: force })
    }
    await batch.commit()
  }
  console.log(`írva: ${toWrite.length} db authors/{slug}`)

  await rebuildAggregate(firestore)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
