/**
 * Backfill auto-derived content for collection-split Receptsarok recipes in recipes.json.
 *
 * Why this exists: the recipe pipeline (src/lib/receptsarokDedupePipeline.js → recipes.json)
 * is *create-only* — `buildRecipesFromModxDoc` runs only for {year}-{id} keys that don't yet
 * exist, so parser fixes never reach recipes that already exist. The MODX→Firestore sync
 * doesn't rebuild recipe content either. This re-derives the fields that the splitter computes
 * and that have been affected by parser fixes — `image`/`img` (per-dish image) and
 * `instructions` (a dish's block can end with the next dish's lead-in `<figure>`, whose caption
 * must not leak into steps) — for every recipe whose source MODX doc was split into multiple
 * recipes. Curated fields (id, year, category, free, timestamps, …) are left untouched.
 *
 * Single-recipe docs and dedupe variants (a source doc that parses to one recipe) are skipped.
 *
 * Usage:
 *   npm run recipes:backfill-content          # dry run — prints what would change
 *   npm run recipes:backfill-content:apply    # write src/lib/data/recipes.json
 *   npm run sync:recipes:apply                # then push recipes.json → Firestore
 *
 * Env: MODXDB_URL (live MODX, same as sync:modx), PUBLIC_BASE_URL (optional).
 */
import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import mysql from 'mysql2/promise'
import { buildRecipesFromModxDoc } from '../src/lib/modxToRsParser.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const RECIPES_PATH = path.join(root, 'src/lib/data/recipes.json')
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || 'https://www.diabetes.hu/'
const apply = process.argv.includes('--apply')

if (!process.env.MODXDB_URL) {
  console.error('MODXDB_URL is not set (.env) — needed to read live MODX content.')
  process.exit(1)
}

// Reuse the real transform so the rendered <img>/<!-- PAGEIMAGE --> markup can't drift from
// what the sync produces. nagyito() only needs publicBaseUrl + doc.img; other deps are unused.
const { createModxTransform } = await import(
  pathToFileURL(path.join(root, 'src/lib/modx/transform.ts')).href
)
const transform = createModxTransform({
  publicBaseUrl: PUBLIC_BASE_URL,
  tmplvarContentvalues: [],
  modxSzerzok: [],
  getEveryDocs: () => [],
  redirectMaps: { byContentId: new Map(), byPath: new Map() },
})

const recipes = JSON.parse(fs.readFileSync(RECIPES_PATH, 'utf8'))
if (!Array.isArray(recipes)) throw new Error('recipes.json must be an array')

// Group recipes by source MODX doc; a doc that produced >1 recipe is a collection split.
const byDoc = new Map()
for (const r of recipes) {
  if (!Number.isFinite(r?.sourceModxId)) continue
  if (!byDoc.has(r.sourceModxId)) byDoc.set(r.sourceModxId, [])
  byDoc.get(r.sourceModxId).push(r)
}
const collectionDocIds = [...byDoc].filter(([, group]) => group.length > 1).map(([id]) => id)
console.log(`${recipes.length} recipes; ${collectionDocIds.length} collection-split source doc(s)`)
if (collectionDocIds.length === 0) process.exit(0)

const conn = await mysql.createConnection(process.env.MODXDB_URL)
const [docRows] = await conn.query(
  'SELECT id, pagetitle, longtitle, alias, content, publishedon, editedon FROM modx_site_content WHERE id IN (?)',
  [collectionDocIds]
)
const [tvRows] = await conn.query(
  `SELECT v.contentid, v.value FROM modx_site_tmplvar_contentvalues v
   JOIN modx_site_tmplvars t ON t.id = v.tmplvarid
   WHERE v.contentid IN (?) AND t.name = 'pageImage'`,
  [collectionDocIds]
)
await conn.end()
const docById = new Map(docRows.map((d) => [d.id, d]))
const pageImageByDoc = new Map(tvRows.map((t) => [t.contentid, t.value]))

const options = {
  categoryByKey: new Map(),
  // Images/instructions don't depend on category; this stub keeps the parser happy. (We never
  // write category back, so the stub's empty value can't clobber the stored prediction.)
  predictCategory: () => ({ category: '', confidence: 0, matchedFeatures: 0, margin: 0 }),
}

let changed = 0
let touchedDocs = 0
let missingDocs = 0
let unmatched = 0
for (const sid of collectionDocIds) {
  const d = docById.get(sid)
  if (!d) {
    missingDocs++
    console.warn(`  doc ${sid}: not found in MODX (skipped)`)
    continue
  }
  const pageImage = pageImageByDoc.get(sid)
  const doc = {
    id: d.id,
    title: d.pagetitle,
    longtitle: d.longtitle,
    alias: d.alias,
    content: String(d.content || ''),
    img: pageImage ? { src: PUBLIC_BASE_URL + pageImage } : undefined,
    publishedon: d.publishedon,
    editedon: d.editedon,
    createdon: d.publishedon,
  }
  transform.nagyito(doc) // [[nagyito]] → <img> / <!-- PAGEIMAGE -->, exactly as the sync does

  let parsed
  try {
    parsed = buildRecipesFromModxDoc(doc, options)
  } catch (err) {
    console.warn(`  doc ${sid}: parse failed (${err.message}) — skipped`)
    continue
  }
  const parsedById = new Map(parsed.map(({ recipe }) => [recipe.id, recipe]))

  let docChanged = false
  for (const stored of byDoc.get(sid)) {
    const p = parsedById.get(stored.id)
    if (!p) {
      // No fresh parse for this id → single-recipe doc or dedupe variant; leave as-is.
      unmatched++
      continue
    }
    const changes = []

    // image / img — compare the full image (src + alt + caption) so entity/alt fixes are
    // caught, not just src changes.
    const newImgSrc = p.img?.src ?? null
    const imageChanged =
      (stored.image?.src ?? null) !== (p.image?.src ?? null) ||
      (stored.image?.alt ?? null) !== (p.image?.alt ?? null) ||
      (stored.image?.caption ?? null) !== (p.image?.caption ?? null)
    if (imageChanged || (stored.img?.src ?? null) !== newImgSrc) {
      if (p.image) {
        stored.image = p.image
        stored.img = { src: p.img?.src ?? p.image.src }
      } else {
        stored.image = null
        delete stored.img
      }
      changes.push(`image → ${p.image?.src ?? '(none)'}`)
    }

    // instructions (figcaption / lead-in image text no longer leaks into steps)
    if (
      Array.isArray(p.instructions) &&
      JSON.stringify(stored.instructions) !== JSON.stringify(p.instructions)
    ) {
      const before = Array.isArray(stored.instructions) ? stored.instructions.length : 0
      stored.instructions = p.instructions
      changes.push(`instructions ${before} → ${p.instructions.length} step(s)`)
    }

    if (changes.length > 0) {
      changed++
      docChanged = true
      console.log(`  ${stored.year}/${stored.id}: ${changes.join('; ')}`)
    }
  }
  if (docChanged) touchedDocs++
}

console.log(
  `\n${apply ? 'Updated' : 'Would update'} ${changed} recipe(s) across ${touchedDocs} doc(s). ` +
    `Skipped ${missingDocs} missing doc(s), ${unmatched} unmatched recipe(s) (single-recipe / dedupe variants left as-is).`
)
if (changed > 0 && apply) {
  fs.writeFileSync(RECIPES_PATH, `${JSON.stringify(recipes, null, 2)}\n`)
  console.log(`Wrote ${path.relative(root, RECIPES_PATH)} — next: npm run sync:recipes:apply`)
} else if (changed > 0) {
  console.log('Dry run — re-run with --apply (npm run recipes:backfill-content:apply) to write.')
}
