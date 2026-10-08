/**
 * Precompute the site config the root layout renders — the `config/site` SEO
 * fields plus its `top_banners` / `side_banners` references resolved to banner
 * objects (`config/site/banners/{id}`, edited in FireCMS) — and store it in
 * `meta/stats` as the `siteConf` field.
 *
 * Why `meta/stats`: the root layout already reads that one doc on every SSR render
 * (`getSiteStats`, 60 s per-instance cache), so the banners cost no extra runtime
 * Firestore read. The join (config/site + one read per referenced banner) runs
 * here, once per edit, instead of on the site.
 *
 * Run by the FireCMS „Bannerek és oldalbeállítások frissítése” button
 * (cms-sync.yml target `site-conf`), which then waits out the 60 s caches and
 * purges the CDN so cached pages re-render with the new banners.
 *
 * `mergeFields` replaces `siteConf` as a whole (a plain `merge: true` would deep-merge
 * it and keep fields removed in FireCMS) and leaves the other `meta/stats` fields
 * (counts written by the search-index builder and sync:rs-collections) untouched.
 *
 * Usage:
 *   node scripts/sync-site-conf.mjs           # dry run
 *   node scripts/sync-site-conf.mjs --apply   # write meta/stats.siteConf
 *
 * Env: FIREBASE_ADMIN_KEY
 */
import 'dotenv/config'
import { getFirestoreDb } from './lib/firebase-admin.mjs'
import { normalizeSiteConf } from '../src/lib/siteConfShape.js'

const apply = process.argv.includes('--apply')

const SOURCE_DOC = 'config/site'
const TARGET_DOC = 'meta/stats'

/** @param {unknown} list */
const refsOf = (list) => (Array.isArray(list) ? list.filter((r) => typeof r?.path === 'string') : [])

async function main() {
  const firestore = getFirestoreDb()

  const confSnap = await firestore.doc(SOURCE_DOC).get()
  if (!confSnap.exists) throw new Error(`${SOURCE_DOC} does not exist`)
  const data = confSnap.data()

  const topRefs = refsOf(data.top_banners)
  const sideRefs = refsOf(data.side_banners)
  const unique = [...new Map([...topRefs, ...sideRefs].map((r) => [r.path, r])).values()]
  const snaps = unique.length ? await firestore.getAll(...unique) : []
  const byPath = new Map(snaps.filter((s) => s.exists).map((s) => [s.ref.path, s.data()]))
  const resolve = (refs) => refs.flatMap((r) => byPath.get(r.path) ?? [])

  // JSON round-trip: plain values only (no Timestamps / references) in the stored copy.
  const siteConf = normalizeSiteConf(
    JSON.parse(
      JSON.stringify({ ...data, top_banners: resolve(topRefs), side_banners: resolve(sideRefs) })
    )
  )

  console.log(`read ${SOURCE_DOC} + ${unique.length} referenced banner doc(s)`)
  const missing = unique.filter((r) => !byPath.has(r.path)).map((r) => r.path)
  if (missing.length) console.log(`  ⚠ skipped, referenced but deleted: ${missing.join(', ')}`)
  for (const key of ['top_banners', 'side_banners']) {
    console.log(`  ${key}: ${siteConf[key].map((b) => b.name + (b.prominent ? ' (prominent)' : '')).join(' | ') || '—'}`)
  }
  console.log(`  ≈ ${Buffer.byteLength(JSON.stringify(siteConf), 'utf8')} bytes`)

  if (!apply) {
    console.log('\nDry run — pass --apply to write.')
    return
  }

  await firestore
    .doc(TARGET_DOC)
    .set(
      { siteConf, siteConfGeneratedAt: new Date().toISOString() },
      { mergeFields: ['siteConf', 'siteConfGeneratedAt'] }
    )
  console.log(`wrote ${TARGET_DOC}.siteConf`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
