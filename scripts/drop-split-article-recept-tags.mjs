/**
 * Drop the `recept` tag from the magazine docs (Firestore `docs/`) of articles whose
 * body was split into ≥2 Receptsarok recipes (recipe.sourceModxId == doc id) — see
 * `lib/split-article-recept-tag.mjs`. The sync applies the same rule on every save;
 * run this after the offline splitter (`recipes:dedupe:manual:create-local` +
 * `sync:recipes:apply`) created recipes for articles that are not re-saved, then
 * `npm run sync:modx:finish` to rebuild collections, projection and search index.
 *
 * Reads: one `docs` query per 30 split articles. MODX is not touched.
 *
 * Usage: node scripts/drop-split-article-recept-tags.mjs          (dry run)
 *        node scripts/drop-split-article-recept-tags.mjs --apply  (write Firestore)
 */
import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getFirestoreDb } from './lib/firebase-admin.mjs'
import { dropReceptTagFromSplitArticle, splitDishCountBySourceModxId } from './lib/split-article-recept-tag.mjs'

const APPLY = process.argv.includes('--apply')
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

async function main() {
  const recipes = JSON.parse(fs.readFileSync(path.join(root, 'src/lib/data/recipes.json'), 'utf8'))
  const splitCounts = splitDishCountBySourceModxId(recipes)
  const ids = [...splitCounts].filter(([, n]) => n >= 2).map(([id]) => id)

  const firestore = getFirestoreDb()
  const changes = []
  for (let i = 0; i < ids.length; i += 30) {
    const snap = await firestore.collection('docs').where('id', 'in', ids.slice(i, i + 30)).get()
    for (const docSnap of snap.docs) {
      const doc = docSnap.data()
      if (!dropReceptTagFromSplitArticle(doc, splitCounts)) continue
      changes.push({ ref: docSnap.ref, path: doc.path, tags: doc.tv.tags })
    }
  }

  console.log(`split articles: ${ids.length}, carrying the recept tag: ${changes.length}`)
  for (const c of changes) console.log(`  ${c.path} → tags ${JSON.stringify(c.tags)}`)
  if (!APPLY) {
    console.log('\nDry run — pass --apply to write, then run npm run sync:modx:finish.')
    return
  }
  const batch = firestore.batch()
  for (const c of changes) batch.update(c.ref, { 'tv.tags': c.tags })
  if (changes.length) await batch.commit()
  console.log(`updated ${changes.length} doc(s) — now run npm run sync:modx:finish`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
