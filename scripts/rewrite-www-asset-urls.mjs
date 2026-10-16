/**
 * One-off: rewrite `https://www.diabetes.hu/assets/` → `https://diabetes.hu/assets/` in
 * src/lib/data/recipes.json (img.src, video.src, video.poster, subRecipes[].img.src).
 *
 * Why: the MODX server 301-redirects www → non-www, so every image request that starts at
 * the www host costs one extra round trip. Only asset URLs are touched, never page links.
 * Text-level replacement, so the file's formatting stays byte-identical otherwise.
 *
 * Local only — no Firestore access. Push the result with `npm run sync:recipes:apply`.
 *
 * Usage:
 *   node scripts/rewrite-www-asset-urls.mjs           # dry run (count only)
 *   node scripts/rewrite-www-asset-urls.mjs --apply   # write recipes.json
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const RECIPES_PATH = path.join(root, 'src/lib/data/recipes.json')
const apply = process.argv.includes('--apply')

const FROM = /https:\/\/www\.diabetes\.hu\/assets\//g
const TO = 'https://diabetes.hu/assets/'

const before = fs.readFileSync(RECIPES_PATH, 'utf8')
const count = (before.match(FROM) || []).length
const after = before.replace(FROM, TO)
JSON.parse(after) // fail before writing if the result is somehow invalid

console.log(`${count} asset URL(s) with the www host in ${path.relative(root, RECIPES_PATH)}`)
if (!apply) {
  console.log('Dry run. Re-run with --apply to write, then `npm run sync:recipes:apply`.')
} else if (count) {
  fs.writeFileSync(RECIPES_PATH, after)
  console.log('Written. Next: `npm run sync:recipes:apply` (diff-based; rewrites the changed recipe docs).')
}
