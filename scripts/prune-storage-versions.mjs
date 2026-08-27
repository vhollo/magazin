/**
 * Delete superseded versioned artifacts from Firebase Storage.
 *
 * Every magazine sync uploads a fresh `search/index-<ms>.json.gz` (~10 MiB) and
 * `projections/slim-<ms>.json.gz` (~1-2 MiB) and never removes the previous one,
 * so the bucket grows by 10-100 MiB a day. `sync:modx*` now prunes as part of each
 * upload; this script cleans the accumulated backlog and can be re-run any time.
 *
 * Nothing the live site points at is ever deleted: `meta/search.indexUrl`,
 * `meta/projections.snapshotUrl` and the committed `static/search-meta.json`
 * fallback are pinned, as are the newest --keep versions of each prefix.
 *
 * Usage:
 *   node scripts/prune-storage-versions.mjs                     # dry run (report only)
 *   node scripts/prune-storage-versions.mjs --apply             # delete
 *   node scripts/prune-storage-versions.mjs --max-age-days=3 --keep=2 --apply
 *
 * Env: FIREBASE_ADMIN_KEY, FIREBASE_STORAGE_BUCKET
 */
import 'dotenv/config'
import { getFirestoreDb } from './lib/firebase-admin.mjs'
import { deployedStaticIndexUrl } from './lib/search-index.mjs'
import {
  getStorageBucket,
  listVersionedObjects,
  pruneVersionedObjects,
  STORAGE_PRUNE_KEEP_MIN,
  STORAGE_PRUNE_MAX_AGE_DAYS,
} from './lib/firebase-storage.mjs'

const apply = process.argv.includes('--apply')

function numericFlag(name, fallback) {
  const prefix = `--${name}=`
  const arg = process.argv.find((a) => a.startsWith(prefix))
  if (!arg) return fallback
  const value = Number(arg.slice(prefix.length))
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`--${name} must be a non-negative number`)
  }
  return value
}

const maxAgeDays = numericFlag('max-age-days', STORAGE_PRUNE_MAX_AGE_DAYS)
const keepMin = numericFlag('keep', STORAGE_PRUNE_KEEP_MIN)

const PREFIXES = ['search/', 'projections/']

function mib(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MiB`
}

async function liveUrls() {
  const firestore = getFirestoreDb()
  const [search, projections] = await Promise.all([
    firestore.collection('meta').doc('search').get(),
    firestore.collection('meta').doc('projections').get(),
  ])
  return {
    indexUrl: search.data()?.indexUrl ?? null,
    snapshotUrl: projections.data()?.snapshotUrl ?? null,
    staticIndexUrl: deployedStaticIndexUrl(),
  }
}

async function reportBucket() {
  const bucket = getStorageBucket()
  const [metadata] = await bucket.getMetadata()
  console.log(`bucket: ${bucket.name}`)
  if (metadata?.versioning?.enabled) {
    console.warn(
      'WARNING: object versioning is enabled — noncurrent generations of overwritten ' +
        'objects (e.g. receptsarok/catalog.json.gz) also consume quota and are not listed here'
    )
  }

  const [all] = await bucket.getFiles()
  let otherCount = 0
  let otherBytes = 0
  let totalBytes = 0
  for (const file of all) {
    const size = Number(file.metadata?.size ?? 0) || 0
    totalBytes += size
    if (PREFIXES.some((prefix) => file.name.startsWith(prefix))) continue
    otherCount++
    otherBytes += size
  }
  console.log(`bucket total: ${all.length} objects, ${mib(totalBytes)}`)
  console.log(`outside ${PREFIXES.join(' / ')}: ${otherCount} objects, ${mib(otherBytes)} (untouched)`)
}

async function main() {
  const urls = await liveUrls()
  console.log(`mode: ${apply ? 'APPLY' : 'dry run'} (max-age-days=${maxAgeDays}, keep=${keepMin})`)
  console.log(`pinned meta/search.indexUrl:        ${urls.indexUrl ?? '(none)'}`)
  console.log(`pinned meta/projections.snapshotUrl: ${urls.snapshotUrl ?? '(none)'}`)
  console.log(`pinned static/search-meta.json:      ${urls.staticIndexUrl ?? '(none)'}`)
  console.log('')

  await reportBucket()
  console.log('')

  let freed = 0
  for (const prefix of PREFIXES) {
    const before = await listVersionedObjects(prefix)
    const beforeBytes = before.reduce((sum, entry) => sum + entry.size, 0)
    console.log(`${prefix} before: ${before.length} objects, ${mib(beforeBytes)}`)

    const result = await pruneVersionedObjects(prefix, {
      maxAgeDays,
      keepMin,
      keepUrls: [urls.indexUrl, urls.snapshotUrl, urls.staticIndexUrl],
      dryRun: !apply,
    })
    freed += result.freedBytes
    console.log(`${prefix} kept: ${result.keptNames.join(', ') || '(none)'}`)
    console.log('')
  }

  console.log(`${apply ? 'freed' : 'would free'}: ${mib(freed)}`)
  if (!apply) console.log('Dry run — re-run with --apply to delete.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
