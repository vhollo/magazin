/**
 * Backfill recipe `relatedCards` (curated link groups) into recipes.json.
 *
 * Re-derives each recipe's `relatedCards` from its own `linkedModxIds`
 * (resolved to published recipe keys via `sourceModxId` + the redirect manifest).
 * Local-only: writes recipes.json. Push with `npm run sync:recipes:apply`.
 *
 * Usage:
 *   node scripts/backfill-recipe-related-cards.mjs           # dry-run (preview)
 *   node scripts/backfill-recipe-related-cards.mjs --apply   # write recipes.json
 */
import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { stringifyRecipesJson } from '../src/lib/recipesJsonFormat.js'
import { loadRecipesFromJson } from './lib/receptsarok-redirect-match.mjs'
import { loadRedirectsManifest } from './lib/receptsarok-redirects-manifest.mjs'
import { computeRecipeRelatedChanges } from './lib/related-recipe-cards.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const RECIPES_JSON_PATH = path.join(root, 'src/lib/data/recipes.json')
const RS_REDIRECTS_PATH = path.join(root, 'src/lib/data/receptsarok-redirects.json')
const apply = process.argv.includes('--apply')

function main() {
  const recipes = loadRecipesFromJson(RECIPES_JSON_PATH)
  const manifestEntries = loadRedirectsManifest(RS_REDIRECTS_PATH).entries

  const byKey = new Map(recipes.map((r) => [`${r.year}-${r.id}`, r]))
  const { changed } = computeRecipeRelatedChanges(recipes, manifestEntries)

  console.log(`${changed.length} recipe(s) with relatedCards changes (of ${recipes.length})`)
  for (const key of changed.slice(0, 20)) {
    console.log(`  ${key} → [${(byKey.get(key)?.relatedCards ?? []).join(', ')}]`)
  }
  if (changed.length > 20) console.log(`  … (+${changed.length - 20} more)`)

  if (!changed.length) return
  if (!apply) {
    console.log('\nDry-run. Re-run with --apply to write recipes.json, then `npm run sync:recipes:apply`.')
    return
  }
  fs.writeFileSync(RECIPES_JSON_PATH, stringifyRecipesJson(recipes))
  console.log(`\nWrote ${RECIPES_JSON_PATH}. Now run \`npm run sync:recipes:apply\`.`)
}

main()
