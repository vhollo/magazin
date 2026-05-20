import { encodeDocPathId } from './doc-path-id.mjs'

/**
 * Patch relatedCards onto changed docs (merge write).
 *
 * @param {import('firebase-admin/firestore').Firestore} firestore
 * @param {Record<string, unknown>[]} listedDocs
 * @param {Map<number, Record<string, unknown>>} workingById
 * @param {Set<number>} changedIds
 * @param {{ docsByTags: Function, toThinCard: Function }} collectionsMod
 */
export async function updateRelatedCardsForChanged(
  firestore,
  listedDocs,
  workingById,
  changedIds,
  collectionsMod
) {
  const { docsByTags, toThinCard } = collectionsMod
  let updated = 0

  for (const id of changedIds) {
    const processed = workingById.get(id)
    if (!processed?.path || !processed?.tv?.tags?.length) continue

    const related = docsByTags(listedDocs, processed.tv.tags, processed.id).map((doc) =>
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
