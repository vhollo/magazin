/**
 * `meta/recipesUpload.revision` is the change marker a dev server (and a local build)
 * checks before reusing its gitignored `src/lib/data/.recipes-cache.json`
 * (`getRecipes()` in `src/lib/siteConf.ts`): same revision → the cache is reused, no
 * scan of `recipes/*`.
 *
 * `sync:recipes:apply` sets it from the upload hashes, but the MODX sync writes
 * recipes too — created recipes, re-derived content (e.g. a new pageimage),
 * `free`, `relatedCards`, `authorSlug` — with merges that left the revision alone,
 * so a dev server kept serving the old data (and image URLs that no longer exist)
 * until someone ran `sync:recipes:apply`. Bump it whenever such a write happened.
 *
 * Only the revision changes; the per-recipe `hashes` stay as they are, so the next
 * `sync:recipes:apply` still sees the same diffs and recomputes its own revision.
 */
import { createHash } from 'node:crypto'

/**
 * @param {import('firebase-admin/firestore').Firestore} firestore
 * @param {string[]} keys recipe keys (`{year}-{id}`) written by this run
 * @param {string} reason short label for the log / doc
 * @returns {Promise<string>} the new revision
 */
export async function bumpRecipesRevision(firestore, keys, reason) {
  const revision = createHash('sha1')
    .update(`${Date.now()}|${reason}|${[...keys].sort().join(',')}`)
    .digest('hex')
  await firestore.collection('meta').doc('recipesUpload').set(
    { revision, revisedAt: new Date().toISOString(), revisedBy: reason },
    { merge: true }
  )
  return revision
}
