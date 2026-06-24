import { decodeHtmlEntities } from './htmlEntities.js'

/**
 * Author byline from a magazine article's signature block:
 *   <p class="alairas">Név<span>www.example.hu</span></p>
 * Returns the text BEFORE the `<span>` (the name), with the web address dropped
 * and HTML entities decoded.
 *
 * Used as a fallback in the recipe parser's `deriveAuthor` for multi-recipe
 * collection articles (e.g. `recept-sarok`) whose dishes carry no `szerzo` TV or
 * description author — the only byline is this footer signature.
 *
 * @param {string} [html]
 * @returns {string}
 */
/**
 * Photo credit from an article's `alairas` byline → "Fotó: Szecsődi Balázs".
 * Many features sign the photographer alongside the author
 * (`<p class="alairas">Béki János <br>Fotó: Szecsődi Balázs</p>`); that credit
 * belongs on the recipe image's `caption`. Returns the normalised "Fotó: …" line.
 *
 * @param {string} [html]
 * @returns {string}
 */
export function extractPhotoCredit(html) {
  const block = String(html ?? '').match(/<p[^>]*class="alairas"[^>]*>([\s\S]*?)<\/p>/i)
  const scope = block ? block[1] : ''
  const m = scope.match(/fot[óo]\s*:\s*([^<]+)/i)
  if (!m) return ''
  const name = decodeHtmlEntities(m[1]).replace(/\s+/g, ' ').trim().replace(/[.,;]+$/, '')
  return name ? `Fotó: ${name}` : ''
}

/**
 * Per-recipe author byline "<h3>Horváth Ferenc receptje</h3>" → "Horváth Ferenc".
 * Distinct from the article's `alairas` (journalist) byline — when an article's
 * recipes name their own author with a "X receptje" heading, that is the recipe
 * author and wins over `alairas`. Matches the singular "receptje" only (not the
 * plural "receptjei" of a collection title).
 *
 * @param {string} [html]
 * @returns {string}
 */
export function extractReceptjeAuthor(html) {
  const m = String(html ?? '').match(/<h[2-6][^>]*>\s*([^<]*?)\s+receptje\s*<\/h[2-6]>/i)
  if (!m) return ''
  return decodeHtmlEntities(m[1]).replace(/\s+/g, ' ').trim()
}

export function extractAlairasAuthor(html) {
  const block = String(html ?? '').match(/<p[^>]*class="alairas"[^>]*>([\s\S]*?)<\/p>/i)
  if (!block) return ''
  let inner = block[1]
  const spanIdx = inner.search(/<span/i)
  if (spanIdx >= 0) inner = inner.slice(0, spanIdx)
  return decodeHtmlEntities(inner.replace(/<[^>]+>/g, ' '))
    // Drop a trailing photo credit ("… Fotó: Photographer") — the byline is the author.
    // (No \b after "fotó": the accented ó is not an ASCII word char so \b would fail.)
    .replace(/\s*fot[óo]\s*:.*$/is, '')
    .replace(/\s+/g, ' ')
    .trim()
}
