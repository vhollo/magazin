import { encodeDocPathId } from './doc-path-id.mjs'

/**
 * Patch relatedCards onto docs (merge write).
 *
 * @param {import('firebase-admin/firestore').Firestore} firestore
 * @param {Record<string, unknown>[]} listedDocs
 * @param {Map<number, Record<string, unknown>>} workingById
 * @param {Set<number>} idsToUpdate
 * @param {{ docsByTags: Function, toThinCard: Function, rankDocByTags: Function, collectionQueries: Record<string, string[]> }} collectionsMod
 */
export async function updateRelatedCards(
  firestore,
  listedDocs,
  workingById,
  idsToUpdate,
  collectionsMod
) {
  const { docsByTags, toThinCard, rankDocByTags, collectionQueries } = collectionsMod
  let updated = 0

  for (const id of idsToUpdate) {
    const processed = workingById.get(id)
    if (!processed?.path || !processed?.tv?.tags?.length) continue

    const articleTags = processed.tv.tags
    let bestSlug = null
    let bestScore = 0
    for (const [slug, queryTags] of Object.entries(collectionQueries)) {
      if (slug === 'all') continue
      const score = rankDocByTags(processed, queryTags)
      if (score > bestScore) {
        bestScore = score
        bestSlug = slug
      }
    }

    const queryTags = bestSlug ? collectionQueries[bestSlug] : articleTags
    const related = docsByTags(listedDocs, queryTags ?? [], processed.id).map((doc) =>
      toThinCard(doc, doc.rank)
    )

    await firestore
      .collection('docs')
      .doc(encodeDocPathId(processed.path))
      .set({ relatedCards: related }, { merge: true })

    processed.relatedCards = related
    updated++
  }

  return updated
}
