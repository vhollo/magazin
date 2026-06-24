/**
 * Junior-template (MODX template 9) articles carry their real heading fields inside the
 * content HTML rather than in the `modx_site_content` columns, which are unreliable for
 * them (e.g. id 1040 puts the `felcim` text in the `introtext` column). The junior
 * template renders:
 *   <h1>…</h1>                    → title
 *   <… class="felcim">…</…>       → description   (short kicker / overline subtitle)
 *   <… class="j_lead">…</…>       → introtext     (lead paragraph)
 *
 * `felcim`/`j_lead` match ANY element carrying that class (the markup varies: `<h4
 * class="felcim">`, `<p class="j_lead">`, `<h1 class="j_cim">` + `<p class="j_lead">`, …).
 * Inner inline markup is kept for `description`/`introtext` (the magazine `introtext`
 * already stores e.g. "<i>Kiss Erika</i>"); the `<h1>` title is reduced to plain text.
 * Named HTML entities are decoded (content stores "&eacute;" etc.).
 *
 * Each field is `null` when its element is ABSENT — a pure "not found" signal so the
 * caller decides the policy (the backfill leaves the existing value rather than blanking,
 * since many older junior articles keep a real lead in the `introtext` column with no
 * `j_lead` element). A present-but-empty element yields `''`.
 */
import { decodeHtmlEntities } from '../../src/lib/htmlEntities.js'

/** Inner HTML of the first `<h1>…</h1>`, or null. */
function innerH1(html) {
  const m = String(html ?? '').match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)
  return m ? m[1] : null
}

/** Inner HTML of the first element whose class list contains `cls`, or null. */
function innerByClass(html, cls) {
  const re = new RegExp(
    `<([a-z][a-z0-9]*)\\b[^>]*\\bclass=["'][^"']*\\b${cls}\\b[^"']*["'][^>]*>([\\s\\S]*?)<\\/\\1>`,
    'i'
  )
  const m = String(html ?? '').match(re)
  return m ? m[2] : null
}

const tidy = (s) => decodeHtmlEntities(String(s)).replace(/\s+/g, ' ').trim()
const plain = (s) => tidy(String(s).replace(/<[^>]+>/g, ' '))

/**
 * @param {string} content raw MODX content HTML
 * @returns {{ title: string|null, description: string, introtext: string }}
 */
export function extractJuniorFields(content) {
  const html = String(content ?? '')
  const h1 = innerH1(html)
  const felcim = innerByClass(html, 'felcim')
  const jlead = innerByClass(html, 'j_lead')
  return {
    title: h1 == null ? null : plain(h1),
    description: felcim == null ? null : tidy(felcim),
    introtext: jlead == null ? null : tidy(jlead),
  }
}

/** Plain-text normalisation for comparing an element's inner text to an extracted value. */
const matchNorm = (s) =>
  decodeHtmlEntities(String(s ?? '').replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()

/** Element regex (first match) capturing the tag name (1) and inner HTML (2) + trailing ws. */
function classRe(cls) {
  return new RegExp(
    `<([a-z][a-z0-9]*)\\b[^>]*\\bclass=["'][^"']*\\b${cls}\\b[^"']*["'][^>]*>([\\s\\S]*?)<\\/\\1>\\s*`,
    'i'
  )
}

/** Drop the element matched by `re` (inner at capture group `idx`) only when its text equals
 *  the extracted `value` — so we strip the exact header element, never a later same-class one. */
function removeFirstIfMatches(html, re, idx, value) {
  if (value == null) return html
  const m = html.match(re)
  if (!m || matchNorm(m[idx]) !== matchNorm(value)) return html
  return html.slice(0, m.index) + html.slice(m.index + m[0].length)
}

/**
 * Remove the `<h1>` / `.felcim` / `.j_lead` that `extractJuniorFields` pulled out — and ONLY
 * those (pass its result as `extracted`) — from a content body, so the article page (which
 * renders title/description/introtext from the doc fields, see `routes/[...path]/+page.svelte`)
 * doesn't show them twice. Matching by text keeps a later same-class element deeper in the body
 * and makes the strip idempotent: re-running finds the header element already gone, so chaining
 * this to `sync:modx` (which re-adds the elements) converges instead of eating into the body.
 */
export function stripJuniorFields(content, extracted = {}) {
  return [
    [/<h1\b[^>]*>([\s\S]*?)<\/h1>\s*/i, 1, extracted.title],
    [classRe('felcim'), 2, extracted.description],
    [classRe('j_lead'), 2, extracted.introtext],
  ].reduce((html, [re, idx, val]) => removeFirstIfMatches(html, re, idx, val), String(content ?? ''))
}
