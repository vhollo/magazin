/**
 * Linked-recipe list extraction from MODX article HTML.
 *
 * Many recipe articles end with a curated list of related recipes:
 *   <p|h2|h3>További (orosz|karácsonyi|…) receptek… / Kapcsolódó… / Ajánlott…</p|h2|h3>
 *   <ul><li><a href="[~2209~]">Dish title</a></li>…</ul>
 * The announcing block may contain inline markup (e.g. `<p><strong>További orosz
 * receptek:</strong></p>`), so the heading test runs on the block's *text*.
 *
 * Shared by the recipe parser (`modxToRsParser.js`, `scripts/lib/modx-to-rs-parser.mjs`)
 * and the MODX→Firestore sync (`modx/transform.ts` — must run BEFORE `alapjav`
 * rewrites `[~id~]` links into paths). Plain `.js` so it imports from node, tsx
 * and Vite alike.
 */

/** Any <p>/<h2>-<h6> block, with the <ul> that may follow it. */
const BLOCK_SOURCE = '<(p|h[2-6])[^>]*>([\\s\\S]*?)</\\1>(\\s*<ul[^>]*>[\\s\\S]*?</ul>)?'

/** Heading text announcing a linked-recipe list (tested on tag-stripped text). */
const HEADING_TEXT_RE = /^\s*(?:tov[áa]bbi|kapcsol[óo]d[óo]|aj[áa]nlott)[^.!?]*recept/i

/** @param {string} [html] */
function blockText(html) {
  return String(html ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * MODX doc ids referenced from the article's linked-recipe list(s),
 * unique, in document order.
 * @param {string} [html]
 * @returns {number[]}
 */
export function extractLinkedModxIds(html) {
  const source = String(html ?? '')
  if (!source) return []
  const blockRe = new RegExp(BLOCK_SOURCE, 'gi')
  /** @type {number[]} */
  const ids = []
  let m
  while ((m = blockRe.exec(source))) {
    if (!m[3] || !HEADING_TEXT_RE.test(blockText(m[2]))) continue
    for (const idMatch of m[3].matchAll(/\[~(\d+)~\]/g)) {
      const id = Number(idMatch[1])
      if (Number.isFinite(id) && !ids.includes(id)) ids.push(id)
    }
  }
  return ids
}

/**
 * Drop MODX ids that do not map to a published Receptsarok recipe — e.g. editorial
 * hub pages linked from a series footer alongside real recipes.
 * @param {number[]} ids
 * @param {ReadonlySet<number>} [recipeModxIds]
 * @returns {number[]}
 */
export function linkedModxIdsForRecipe(ids, recipeModxIds) {
  if (!Array.isArray(ids)) return []
  if (!(recipeModxIds instanceof Set) || recipeModxIds.size === 0) return [...ids]
  return ids.filter((id) => recipeModxIds.has(Number(id)))
}

/**
 * Remove linked-recipe blocks (announcing heading + list, or the bare heading)
 * so their text never leaks into derived recipe instructions.
 * @param {string} [html]
 * @returns {string}
 */
export function stripLinkedRecipeBlocks(html) {
  const source = String(html ?? '')
  if (!source) return source
  return source.replace(new RegExp(BLOCK_SOURCE, 'gi'), (full, _tag, inner) =>
    HEADING_TEXT_RE.test(blockText(inner)) ? ' ' : full
  )
}
