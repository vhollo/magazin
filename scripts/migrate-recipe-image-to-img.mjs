/**
 * One-time schema consolidation: fold the legacy `image` hero field into the
 * canonical `img` card field ({ src, pos, ext, alt?, caption? }) on every
 * recipe and sub-recipe in src/lib/data/recipes.json, then drop `image`.
 *
 * `alt` is kept only when it differs from the recipe/sub-recipe title
 * (render falls back to the title); `caption` („Fotó: …”) is kept verbatim.
 * `src` is normalized to an absolute path (`/rs/{year}/…` for bare filenames).
 *
 * Usage:
 *   node scripts/migrate-recipe-image-to-img.mjs           # dry run + summary
 *   node scripts/migrate-recipe-image-to-img.mjs --apply   # rewrite recipes.json
 *
 * After --apply: npm run sync:recipes:apply && npm run sync:rs-collections:apply
 */
import fs from 'node:fs'
import path from 'node:path'
import { stringifyRecipesJson } from '../src/lib/recipesJsonFormat.js'

const RECIPES_PATH = path.resolve(process.cwd(), 'src/lib/data/recipes.json')
const apply = process.argv.includes('--apply')

function normalizeSrc(year, raw) {
  if (/^https?:\/\//i.test(raw)) return raw
  if (raw.startsWith('/')) return raw
  return `/rs/${year}/${raw}`
}

const stats = {
  recipes: 0,
  migratedImg: 0,
  droppedHero: 0,
  altKept: 0,
  captionKept: 0,
  customPos: 0,
  subImgs: 0,
}

/** Fold legacy hero (`image`) + sloppy `img` into one canonical card image. */
function fold(year, hero, img, title) {
  const raw = img?.src ?? hero?.src
  if (!raw) return null
  const out = {
    src: normalizeSrc(year, raw),
    pos: (typeof img?.pos === 'string' && img.pos) || '50% 40%',
    ext:
      (typeof img?.ext === 'string' && img.ext) ||
      String(raw).split('.').pop()?.split('?')[0] ||
      'jpg',
  }
  if (out.pos !== '50% 40%') stats.customPos += 1
  const alt = img?.alt ?? hero?.alt
  if (alt && alt !== title) {
    out.alt = alt
    stats.altKept += 1
  }
  const caption = img?.caption ?? hero?.caption
  if (caption) {
    out.caption = caption
    stats.captionKept += 1
  }
  return out
}

const recipes = JSON.parse(fs.readFileSync(RECIPES_PATH, 'utf8'))
if (!Array.isArray(recipes)) throw new Error('recipes.json must be an array')

for (const recipe of recipes) {
  stats.recipes += 1
  const img = fold(recipe.year, recipe.image, recipe.img, recipe.title)
  if (img) {
    recipe.img = img
    stats.migratedImg += 1
  } else {
    delete recipe.img
  }
  if (recipe.image !== undefined) stats.droppedHero += 1
  delete recipe.image

  if (Array.isArray(recipe.subRecipes)) {
    for (const sub of recipe.subRecipes) {
      if (!sub || typeof sub !== 'object') continue
      const subImg = fold(recipe.year, sub.image, sub.img, sub.title)
      if (subImg) {
        sub.img = subImg
        stats.subImgs += 1
      } else {
        sub.img = null
      }
      delete sub.image
    }
  }
}

console.log(
  `${apply ? 'Migrated' : 'Would migrate'} ${stats.recipes} recipes: ` +
    `img=${stats.migratedImg}, legacy hero dropped=${stats.droppedHero}, ` +
    `alt kept=${stats.altKept}, caption kept=${stats.captionKept}, ` +
    `custom pos=${stats.customPos}, sub-recipe imgs=${stats.subImgs}`
)

if (apply) {
  fs.writeFileSync(RECIPES_PATH, stringifyRecipesJson(recipes))
  console.log(`Wrote ${path.relative(process.cwd(), RECIPES_PATH)}`)
  console.log('Next: npm run sync:recipes:apply && npm run sync:rs-collections:apply')
} else {
  console.log('Dry run — re-run with --apply to write recipes.json.')
}
