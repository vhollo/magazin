/**
 * Spot-check Firestore magazine backfill.
 * Usage: node scripts/verify-firestore-magazine.mjs
 */
import 'dotenv/config'
import { getFirestoreDb } from './lib/firebase-admin.mjs'
import { encodeDocPathId } from './lib/doc-path-id.mjs'
import { collectionQueries } from '../src/lib/modx/collections.ts'

const KEY_ROUTES = [
  { label: 'home collection', ref: ['collections', 'home'], expectCards: true },
  { label: 'hirek collection', ref: ['collections', 'hirek'], expectCards: true },
  { label: 'receptek collection', ref: ['collections', 'receptek'], expectCards: true },
  { label: 'meta/search', ref: ['meta', 'search'], expectIndexUrl: true },
  { label: 'meta/stats', ref: ['meta', 'stats'], expectStats: true },
]

const SAMPLE_ARTICLE_PATHS = ['hirek', 'receptek', 's-o-s']

async function getDoc(firestore, [col, id]) {
  const snap = await firestore.collection(col).doc(id).get()
  return snap.exists ? snap.data() : null
}

async function main() {
  const firestore = getFirestoreDb()
  const docsSnap = await firestore.collection('docs').get()
  const collectionsSnap = await firestore.collection('collections').get()

  console.log('=== Firestore magazine spot check ===')
  console.log(`docs/* count: ${docsSnap.size}`)
  console.log(`collections/* count: ${collectionsSnap.size} (expected ${Object.keys(collectionQueries).length + 1} incl. home)`)

  let ok = true
  for (const check of KEY_ROUTES) {
    const data = await getDoc(firestore, check.ref)
    if (!data) {
      console.log(`FAIL ${check.label}: missing`)
      ok = false
      continue
    }
    if (check.expectCards && !(Array.isArray(data.cards) && data.cards.length > 0)) {
      console.log(`FAIL ${check.label}: no cards`)
      ok = false
    } else if (check.expectIndexUrl && !data.indexUrl) {
      console.log(`FAIL ${check.label}: no indexUrl`)
      ok = false
    } else if (check.expectStats && data.articleCount == null) {
      console.log(`FAIL ${check.label}: no articleCount`)
      ok = false
    } else {
      const extra =
        check.expectCards ? ` (${data.cards?.length ?? 0} cards)` :
        check.expectIndexUrl ? ` v${data.version}` :
        check.expectStats ? ` articles=${data.articleCount}` : ''
      console.log(`OK   ${check.label}${extra}`)
    }
  }

  for (const slug of SAMPLE_ARTICLE_PATHS) {
    if (collectionQueries[slug]) {
      const col = await getDoc(firestore, ['collections', slug])
      console.log(
        col?.cards?.length
          ? `OK   collection /${slug} → ${col.cards.length} cards, first: ${col.cards[0]?.path}`
          : `FAIL collection /${slug}`
      )
      if (!col?.cards?.length) ok = false
    }
  }

  const home = await getDoc(firestore, ['collections', 'home'])
  if (home?.cards?.[0]?.path) {
    const samplePath = home.cards[0].path
    const article = await getDoc(firestore, ['docs', encodeDocPathId(samplePath)])
    console.log(
      article?.title
        ? `OK   sample article docs/${encodeDocPathId(samplePath)} → "${article.title}"`
        : `FAIL sample article ${samplePath}`
    )
    if (!article?.title) ok = false
  }

  const search = await getDoc(firestore, ['meta', 'search'])
  if (search?.indexUrl) {
    try {
      const resp = await fetch(search.indexUrl, { method: 'HEAD' })
      console.log(
        resp.ok
          ? `OK   search index URL reachable (${resp.status})`
          : `FAIL search index URL HTTP ${resp.status}`
      )
      if (!resp.ok) ok = false
    } catch (e) {
      console.log(`FAIL search index URL fetch: ${e.message}`)
      ok = false
    }
  }

  console.log(ok ? '\nAll spot checks passed.' : '\nSome checks failed.')
  process.exit(ok ? 0 : 1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
