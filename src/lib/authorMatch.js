/**
 * Author-name matching shared by the MODX transform (article bylines), the recipe
 * `authorSlug` pass (`scripts/lib/recipe-author-slugs.mjs`) and anything else that
 * maps a free-text author name onto an `authors/{slug}` record. Plain JS so Node
 * scripts can import it.
 */

/**
 * Normalised name key: `_` → space (MODX TV tokens such as `Dr._Kováts_Boglárka`),
 * NFC, lower case, dots and whitespace runs collapsed to one space.
 * @param {unknown} value
 * @returns {string}
 */
export const authorNameKey = (value) =>
  String(value ?? '')
    .replaceAll('_', ' ')
    .normalize('NFC')
    .toLowerCase()
    .replace(/[.\s]+/g, ' ')
    .trim()

/**
 * Key for a recipe's `author` field: like `authorNameKey`, but a trailing
 * parenthetical note is ignored, e.g. „Kovács Bence (videóval)”.
 * @param {unknown} value
 * @returns {string}
 */
export const recipeAuthorKey = (value) =>
  authorNameKey(String(value ?? '').replace(/\s*\([^)]*\)\s*$/, ''))

/**
 * @typedef {{ slug?: string, displayName?: string, name?: string, legacyTokens?: string[], published?: boolean }} AuthorLike
 */

/**
 * Name key → slug for every PUBLISHED author record (an unpublished record has no
 * profile page, so linking to it would 404). Keys: the slug itself and the
 * normalised `displayName`, `name` and `legacyTokens`.
 * @param {AuthorLike[]} authors
 * @returns {Map<string, string>}
 */
export function buildAuthorSlugIndex(authors) {
  /** @type {Map<string, string>} */
  const index = new Map()
  for (const author of authors ?? []) {
    if (!author?.slug || author.published === false) continue
    index.set(author.slug, author.slug)
    for (const key of [author.displayName, author.name, ...(author.legacyTokens ?? [])]) {
      if (key) index.set(authorNameKey(key), author.slug)
    }
  }
  return index
}

/**
 * The profile slug for a recipe's `author` name, or '' when no published record matches.
 * @param {Map<string, string>} index from `buildAuthorSlugIndex`
 * @param {unknown} author
 * @returns {string}
 */
export function recipeAuthorSlug(index, author) {
  const key = recipeAuthorKey(author)
  return (key && index.get(key)) || ''
}
