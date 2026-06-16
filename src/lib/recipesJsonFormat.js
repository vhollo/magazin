/**
 * Canonical serializer for src/lib/data/recipes.json.
 *
 * One minified recipe per line (~40% smaller than pretty-printed, so the
 * function bundle and JSON.parse stay cheap) while keeping the file
 * line-diffable in git. Every writer of recipes.json must go through this.
 */
/**
 * @param {unknown} recipes
 * @returns {string}
 */
export function stringifyRecipesJson(recipes) {
  if (!Array.isArray(recipes) || recipes.length === 0) return '[]\n'
  return `[\n${recipes.map((r) => JSON.stringify(r)).join(',\n')}\n]\n`
}
