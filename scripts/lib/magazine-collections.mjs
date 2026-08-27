import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { emptyContentFolderPaths } from './empty-folders.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

export const COLLECTIONS_COLLECTION = 'collections'
export const HOME_COLLECTION_ID = 'home'

/**
 * Recompute and write `collections/{slug}` for every tag-collection query plus
 * `collections/home`. One Firestore write per collection.
 *
 * Shared by `sync:modx*` (which has just rebuilt the projection from MODX rows)
 * and `sync:modx:finish` (which rebuilds the projection from Firestore only) —
 * the latter is what the FireCMS "Szinkron" button runs, so a doc edited in the
 * CMS reaches the gyűjtőoldalak without a MODX round trip.
 *
 * @param {import('firebase-admin/firestore').Firestore} firestore
 * @param {Record<string, unknown>[]} projectionDocs slim docs (no HTML bodies)
 */
export async function writeCollections(firestore, projectionDocs) {
  const collectionsMod = await import(
    pathToFileURL(path.join(root, 'src/lib/modx/collections.ts')).href
  )
  const {
    collectionQueries,
    docsByTags,
    homeDocs,
    expertDocs,
    isListedDoc,
    toThinCard,
    COLLECTION_LIMIT,
  } = collectionsMod

  const listedDocs = projectionDocs.filter(isListedDoc)

  // Drop empty-content container folders (post-alapjav `content` blank) — they admit
  // no real card. Non-empty folders (e.g. the diaeuro-futsal hub + year folders) stay.
  const emptyFolderPaths = await emptyContentFolderPaths(firestore, listedDocs)
  const collectionDocs = listedDocs.filter((d) => !(d.isfolder && emptyFolderPaths.has(d.path)))
  console.log(
    `collections: scanning ${collectionDocs.length}/${projectionDocs.length} docs ` +
      `(${listedDocs.length} listed − ${listedDocs.length - collectionDocs.length} empty folders), limit=${COLLECTION_LIMIT}`
  )

  const generatedAt = new Date().toISOString()
  const slugs = Object.keys(collectionQueries)
  let written = 0

  for (const slug of slugs) {
    const queryTags = collectionQueries[slug]
    // Admit content-tagged folders into every collection a tag of theirs matches
    // (e.g. the `diaeuro-futsal` hub + year folders), not just leaf articles.
    const matched = docsByTags(collectionDocs, queryTags, '0', { includeFolders: true })
    const cards = matched.map((doc) => toThinCard(doc, doc.rank))
    await firestore.collection(COLLECTIONS_COLLECTION).doc(slug).set({
      slug,
      queryTags,
      cards,
      count: cards.length,
      generatedAt,
    })
    written++
    console.log(`  wrote ${COLLECTIONS_COLLECTION}/${slug} (${cards.length} cards)`)
  }

  const homeCards = homeDocs(collectionDocs).map((doc) => toThinCard(doc))
  const expertCards = expertDocs(collectionDocs).map((doc) => toThinCard(doc))
  await firestore.collection(COLLECTIONS_COLLECTION).doc(HOME_COLLECTION_ID).set({
    slug: HOME_COLLECTION_ID,
    cards: homeCards,
    count: homeCards.length,
    expertCards,
    generatedAt,
  })
  written++
  console.log(
    `  wrote ${COLLECTIONS_COLLECTION}/${HOME_COLLECTION_ID} (${homeCards.length} cards, ${expertCards.length} expertCards)`
  )

  return written
}
