/**
 * Backfill `title` / `description` / `introtext` on the MAGAZINE docs (Firestore `docs/`)
 * of junior-template (MODX template 9) articles, extracting them from the content HTML
 * (`<h1>` → title, `.felcim` → description, `.j_lead` → introtext — see
 * `lib/junior-content-fields.mjs`). Junior articles keep these in content, not in the
 * unreliable `site_content` columns (e.g. id 1040 has the `felcim` text in `introtext`).
 * The extracted `<h1>`/`.felcim`/`.j_lead` are then stripped from the doc's `content` so
 * the article page header (which renders those fields) doesn't show them a second time.
 *
 * Scope: every published template-9 article EXCEPT standalone recipes (a junior article
 * mapped to exactly ONE Receptsárok recipe). Recipe COLLECTIONS (≥2 recipes, e.g. 1040,
 * 1352) and plain junior articles (no recipe) ARE included. Recipes.json is never touched.
 *
 * This is a one-off, non-sync magazine-doc backfill (same pattern as the related-cards
 * backfill) — it does NOT modify `sync-modx-to-firestore.mjs` or the recipe pipeline.
 *
 * Usage: node scripts/backfill-junior-magazine-fields.mjs          (dry run)
 *        node scripts/backfill-junior-magazine-fields.mjs --apply   (write Firestore)
 */
import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import mysql from 'mysql2/promise'
import { getFirestoreDb } from './lib/firebase-admin.mjs'
import { extractJuniorFields, stripJuniorFields } from './lib/junior-content-fields.mjs'

const APPLY = process.argv.includes('--apply')
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const FIELDS = ['title', 'description', 'introtext']

async function main() {
  // 1) junior (template 9) articles + content
  const db = await mysql.createConnection({
    host: process.env.MODXDB_HOST,
    port: Number(process.env.MODXDB_PORT),
    user: process.env.MODXDB_USER,
    password: process.env.MODXDB_PASSWORD,
    database: process.env.MODXDB_DATABASE,
  })
  const [rows] = await db.query(
    'SELECT id, content FROM modx_site_content WHERE template = 9 AND deleted = 0 AND published = 1'
  )
  await db.end()

  // 2) recipe count per sourceModxId → exclude standalone (exactly 1 recipe)
  const recipes = JSON.parse(fs.readFileSync(path.join(root, 'src/lib/data/recipes.json'), 'utf8'))
  const recipeCount = new Map()
  for (const r of recipes) {
    const sid = Number(r.sourceModxId)
    if (sid) recipeCount.set(sid, (recipeCount.get(sid) || 0) + 1)
  }
  const wanted = new Map() // modxId -> extracted fields
  let excludedStandalone = 0
  for (const r of rows) {
    const id = Number(r.id)
    if (recipeCount.get(id) === 1) {
      excludedStandalone++
      continue
    }
    wanted.set(id, extractJuniorFields(r.content))
  }

  // 3) read magazine docs by `id` (Firestore `in` ≤ 30 per query)
  const fdb = getFirestoreDb()
  const ids = [...wanted.keys()]
  const docByModxId = new Map()
  for (let i = 0; i < ids.length; i += 30) {
    const chunk = ids.slice(i, i + 30)
    const snap = await fdb.collection('docs').where('id', 'in', chunk).get()
    snap.forEach((d) => docByModxId.set(Number(d.get('id')), d))
  }

  // 4) diff — content fills a field only when its element is PRESENT; an absent element
  // leaves the existing value (older junior articles keep a real lead in the `introtext`
  // column with no `j_lead`). The sole clear is the de-dup of a misplaced felcim that the
  // MODX `introtext` column captured (e.g. id 1040), once it becomes the `description`.
  const norm = (s) => String(s ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
  const plainText = (s) => String(s ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  const changes = [] // { id, path, ref, set:{}, dedup }
  const stat = { title: 0, descSet: 0, introSet: 0, introDedup: 0, content: 0 }
  const missingDoc = []
  for (const [id, ex] of wanted) {
    const doc = docByModxId.get(id)
    if (!doc) {
      missingDoc.push(id)
      continue
    }
    const cur = { title: doc.get('title') ?? '', description: doc.get('description') ?? '', introtext: doc.get('introtext') ?? '' }
    const set = {}
    let dedup = false
    // title ← <h1> when present, else the doc's `longtitle`. The junior <h1> is sometimes
    // a series heading or credit (e.g. 878 "GrandmaSandy.com"), but it is the requested
    // source of truth; longtitle is the fallback when there is no (non-empty) <h1>.
    const titleCandidate = ex.title ? ex.title : plainText(doc.get('longtitle')) || null
    if (titleCandidate != null && titleCandidate !== cur.title) {
      set.title = titleCandidate
      stat.title++
    }
    // description ← .felcim (leave when absent)
    if (ex.description != null && ex.description !== cur.description) {
      set.description = ex.description
      stat.descSet++
    }
    // introtext ← .j_lead; when absent, only clear a misplaced felcim copy
    if (ex.introtext != null) {
      if (ex.introtext !== cur.introtext) {
        set.introtext = ex.introtext
        stat.introSet++
      }
    } else if (ex.description != null && cur.introtext && norm(cur.introtext) === norm(ex.description)) {
      set.introtext = ''
      dedup = true
      stat.introDedup++
    }
    // content: drop the extracted <h1>/.felcim/.j_lead so the page header doesn't repeat them
    const curContent = String(doc.get('content') ?? '')
    const strippedContent = stripJuniorFields(curContent, ex)
    const contentRemoved = strippedContent !== curContent ? curContent.length - strippedContent.length : 0
    if (contentRemoved) {
      set.content = strippedContent
      stat.content++
    }
    if (Object.keys(set).length) changes.push({ id, path: doc.get('path'), ref: doc.ref, set, dedup, contentRemoved })
  }

  // 5) report
  console.log(`template-9 articles: ${rows.length} | in scope: ${wanted.size} (excluded ${excludedStandalone} standalone recipes)`)
  if (missingDoc.length) console.log(`no magazine doc for ${missingDoc.length} id(s): ${missingDoc.slice(0, 20).join(', ')}${missingDoc.length > 20 ? ' …' : ''}`)
  console.log(`docs that would change: ${changes.length}`)
  console.log(`  title set: ${stat.title} | description set: ${stat.descSet} | introtext set: ${stat.introSet} | introtext de-dup-cleared: ${stat.introDedup} | content stripped: ${stat.content}`)

  const dd = changes.filter((c) => c.dedup)
  console.log(`\n--- introtext de-dup (cleared a felcim copy the column held) : ${dd.length} ---`)
  for (const c of dd) {
    const doc = docByModxId.get(c.id)
    console.log(`  ${String(c.id).padEnd(5)} was: ${JSON.stringify(String(doc.get('introtext') ?? '').slice(0, 70))} | ${c.path}`)
  }

  console.log(`\n--- sample changes ---`)
  for (const c of changes.slice(0, 15)) {
    console.log(`  ${String(c.id).padEnd(5)} ${c.path}`)
    for (const k of FIELDS) if (k in c.set) console.log(`        ${k} ←  ${JSON.stringify(String(c.set[k]).slice(0, 80))}`)
    if (c.contentRemoved) console.log(`        content  −${c.contentRemoved} chars (h1/felcim/j_lead removed)`)
  }

  if (!APPLY) {
    console.log(`\nDry run — pass --apply to write ${changes.length} doc(s).`)
    process.exit(0)
  }

  // 6) apply
  const writer = fdb.bulkWriter()
  for (const c of changes) writer.update(c.ref, c.set)
  await writer.close()
  console.log(`\nApplied: updated ${changes.length} magazine doc(s).`)
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
