/**
 * Backfill recipe `authorSlug` into recipes.json (see `scripts/lib/recipe-author-slugs.mjs`).
 *
 * Author records come from Firestore `collections/authors` (1 read), falling back to
 * `scripts/data/authors.json`. Local-only: writes recipes.json. Push with
 * `npm run sync:recipes:apply`. Every `sync:modx*` run does the same recompute and
 * writes Firestore itself, so this is only for a first fill or a local check.
 *
 * Usage:
 *   node scripts/backfill-recipe-author-slugs.mjs           # dry-run (preview)
 *   node scripts/backfill-recipe-author-slugs.mjs --apply   # write recipes.json
 */
import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { stringifyRecipesJson } from '../src/lib/recipesJsonFormat.js'
import { loadRecipesFromJson } from './lib/receptsarok-redirect-match.mjs'
import { computeRecipeAuthorSlugChanges } from './lib/recipe-author-slugs.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const RECIPES_JSON_PATH = path.join(root, 'src/lib/data/recipes.json')
const AUTHORS_JSON_PATH = path.join(root, 'scripts/data/authors.json')
const apply = process.argv.includes('--apply')

async function loadAuthors() {
  try {
    const { getFirestoreDb } = await import('./lib/firebase-admin.mjs')
    const snap = await getFirestoreDb().collection('collections').doc('authors').get()
    const authors = snap.exists ? snap.get('authors') : null
    if (Array.isArray(authors) && authors.length) {
      console.log(`authors: ${authors.length} from collections/authors`)
      return authors
    }
  } catch (error) {
    console.warn(`collections/authors unreadable (${error.message})`)
  }
  const parsed = JSON.parse(fs.readFileSync(AUTHORS_JSON_PATH, 'utf8'))
  const authors = Array.isArray(parsed) ? parsed : []
  console.log(`authors: ${authors.length} from ${path.relative(root, AUTHORS_JSON_PATH)} (fallback)`)
  return authors
}

async function main() {
  const recipes = loadRecipesFromJson(RECIPES_JSON_PATH)
  const authors = await loadAuthors()
  if (!authors.length) throw new Error('no author records — nothing to match against')

  const { changed } = computeRecipeAuthorSlugChanges(recipes, authors)
  const byKey = new Map(recipes.map((r) => [`${r.year}-${r.id}`, r]))
  const linked = recipes.filter((r) => r.authorSlug).length
  const withAuthor = recipes.filter((r) => String(r.author ?? '').trim()).length

  console.log(`${changed.length} recipe(s) with authorSlug changes (of ${recipes.length})`)
  console.log(`after: ${linked} linked to a profile, ${withAuthor - linked} with an author name but no profile, ${recipes.length - withAuthor} without author`)
  for (const key of changed.slice(0, 15)) {
    const r = byKey.get(key)
    console.log(`  ${key}: ${JSON.stringify(r?.author)} → ${r?.authorSlug || '(none)'}`)
  }
  if (changed.length > 15) console.log(`  … (+${changed.length - 15} more)`)

  if (!changed.length) return
  if (!apply) {
    console.log('\nDry-run. Re-run with --apply to write recipes.json, then `npm run sync:recipes:apply`.')
    return
  }
  fs.writeFileSync(RECIPES_JSON_PATH, stringifyRecipesJson(recipes))
  console.log(`\nWrote ${RECIPES_JSON_PATH}. Now run \`npm run sync:recipes:apply\`.`)
}

await main()
