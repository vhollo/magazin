import { encodeDocPathId } from './doc-path-id.mjs'
import { emptyContentFolderPaths } from './empty-folders.mjs'

const byPublishedonDesc = (a, b) => Number(b.publishedon ?? 0) - Number(a.publishedon ?? 0)

/** Parent path of a doc path (`a/b/c` → `a/b`), or null for a top-level path. */
function parentPathOf(path) {
  const i = String(path ?? '').lastIndexOf('/')
  return i < 0 ? null : String(path).slice(0, i)
}

/**
 * Patch relatedCards onto docs (merge write).
 *
 * Folder-structured content overrides the tag-based "similar articles":
 *   1. A matching folder → its direct children (newest first).
 *   2. A leaf under a matching folder → that parent + all direct siblings.
 *   3. Otherwise → top tag-matched cards from the doc's best-matching collection.
 * Rule 1 wins for a folder that is itself a child (e.g. a year sub-folder). Parent /
 * child / sibling links are derived from paths over the *listed* docs, so untagged
 * pages are not surfaced as relations.
 *
 * A folder whose stored (post-`alapjav`) content is empty is a pure container: it is
 * never shown as a related card — it is replaced by its children (recursively). So a
 * leaf under an empty parent relates to its siblings only, and a hub of empty folders
 * relates straight to the leaf articles.
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

  // Path-based structure maps over the listed docs: each folder hub ↔ its children.
  const byPath = new Map()
  const childrenByParentPath = new Map()
  for (const doc of listedDocs) {
    if (!doc?.path) continue
    byPath.set(doc.path, doc)
    const pp = parentPathOf(doc.path)
    if (pp == null) continue
    let arr = childrenByParentPath.get(pp)
    if (!arr) childrenByParentPath.set(pp, (arr = []))
    arr.push(doc)
  }

  // Empty-content folders are pure containers: hidden as related cards, replaced by children.
  const emptyFolderPaths = await emptyContentFolderPaths(firestore, listedDocs)

  // Expand a list of docs into related cards: empty-content folders are replaced by
  // their children (recursively); the doc being related to, and duplicates, are dropped.
  const expandRelated = (docs, selfId) => {
    const out = []
    const seen = new Set()
    const visit = (doc, depth) => {
      if (depth > 8) return
      if (doc.isfolder && emptyFolderPaths.has(doc.path)) {
        for (const kid of childrenByParentPath.get(doc.path) ?? []) visit(kid, depth + 1)
        return
      }
      const key = String(doc.id)
      if (key === String(selfId) || seen.has(key)) return
      seen.add(key)
      out.push(doc)
    }
    for (const doc of docs) visit(doc, 0)
    return out.sort(byPublishedonDesc)
  }

  let updated = 0
  for (const id of idsToUpdate) {
    const processed = workingById.get(id)
    if (!processed?.path || !processed?.tv?.tags?.length) continue

    let related
    if (processed.isfolder) {
      // Rule 1: a matching folder → its direct children (empty sub-folders flattened).
      const children = childrenByParentPath.get(processed.path) ?? []
      related = expandRelated(children, processed.id).map((c) => toThinCard(c))
    } else {
      const parent = byPath.get(parentPathOf(processed.path))
      if (parent?.isfolder) {
        // Rule 2: a leaf under a matching folder → parent + direct siblings. A non-empty
        // parent leads; an empty parent is hidden, leaving only its children (siblings).
        const siblings = expandRelated(childrenByParentPath.get(parent.path) ?? [], processed.id)
        const ordered = emptyFolderPaths.has(parent.path) ? siblings : [parent, ...siblings]
        related = ordered.map((c) => toThinCard(c))
      } else {
        // Rule 3: tag-based similar — best-matching collection, falling back to own tags.
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
        related = docsByTags(listedDocs, queryTags ?? [], processed.id).map((doc) =>
          toThinCard(doc, doc.rank)
        )
      }
    }

    await firestore
      .collection('docs')
      .doc(encodeDocPathId(processed.path))
      .set({ relatedCards: related }, { merge: true })

    processed.relatedCards = related
    updated++
  }

  return updated
}
