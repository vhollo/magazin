/**
 * Strip trailing MODX/booklet list punctuation from recipe ingredient fields.
 *
 * Booklet lists end each item with "," (and the last with ".") so the imported
 * `ingredientNames` and `ingredientGroups[].items[].text`/`.name` can carry a
 * stray trailing comma. The detail page appends its own separator, which then
 * renders as "…,," — so the punctuation must be removed at the source.
 *
 * `modx-to-rs-parser.mjs` already strips this at parse time; this helper is the
 * shared funnel for the Firestore sync and for retroactively cleaning recipes
 * that were imported before the parser learned to strip.
 */

/**
 * @param {unknown} value
 * @returns {unknown} the value with any trailing `, ; .` (and surrounding
 *   whitespace) removed when it is a string; otherwise returned unchanged.
 */
export function stripTrailingListPunctuation(value) {
  if (typeof value !== 'string') return value
  return value.replace(/\s+/g, ' ').trim().replace(/\s*[,;]+$/, '').replace(/\s*\.$/, '')
}

/**
 * @param {{ items?: Array<{ text?: unknown; name?: unknown }> }} group
 * @returns {boolean} whether any field changed
 */
function normalizeGroup(group) {
  let changed = false
  for (const item of group?.items ?? []) {
    for (const field of ['text', 'name']) {
      if (typeof item?.[field] !== 'string') continue
      const next = stripTrailingListPunctuation(item[field])
      if (next !== item[field]) {
        item[field] = next
        changed = true
      }
    }
  }
  return changed
}

/**
 * @param {{ ingredientNames?: unknown[]; ingredientGroups?: unknown[] }} scope
 * @returns {boolean} whether any field changed
 */
function normalizeScope(scope) {
  let changed = false
  if (Array.isArray(scope?.ingredientNames)) {
    for (let i = 0; i < scope.ingredientNames.length; i += 1) {
      const next = stripTrailingListPunctuation(scope.ingredientNames[i])
      if (next !== scope.ingredientNames[i]) {
        scope.ingredientNames[i] = next
        changed = true
      }
    }
  }
  for (const group of scope?.ingredientGroups ?? []) {
    if (normalizeGroup(group)) changed = true
  }
  return changed
}

/**
 * Mutate a recipe (and its sub-recipes) so `ingredientNames` and
 * `ingredientGroups[].items[].text`/`.name` carry no trailing list punctuation.
 *
 * @param {Record<string, any>} recipe
 * @returns {boolean} whether any field changed
 */
export function normalizeRecipeIngredientPunctuation(recipe) {
  if (!recipe || typeof recipe !== 'object') return false
  let changed = normalizeScope(recipe)
  for (const sub of recipe.subRecipes ?? []) {
    if (normalizeScope(sub)) changed = true
  }
  return changed
}
