/**
 * Shared HTML-entity decoding for MODX-sourced text.
 *
 * Single source of truth used by the recipe parser (`modxToRsParser.js`,
 * `scripts/lib/modx-to-rs-parser.mjs`) and the MODX→Firestore sync
 * (`modx/transform.ts`). Add any newly-seen named entity here once.
 *
 * Plain `.js` (not `.ts`) so it imports cleanly from `node`, `tsx`, and Vite alike.
 */

/** @type {Record<string, string | undefined>} */
export const NAMED_HTML_ENTITIES = {
  // structural
  nbsp: ' ',
  amp: '&',
  quot: '"',
  apos: "'",
  lt: '<',
  gt: '>',
  // spaces / hyphenation → normalize to a plain space (soft hyphen drops out)
  ensp: ' ',
  emsp: ' ',
  thinsp: ' ',
  shy: '',
  // Hungarian accents
  aacute: 'á',
  eacute: 'é',
  iacute: 'í',
  oacute: 'ó',
  uacute: 'ú',
  ouml: 'ö',
  uuml: 'ü',
  odblac: 'ő',
  udblac: 'ű',
  Aacute: 'Á',
  Eacute: 'É',
  Iacute: 'Í',
  Oacute: 'Ó',
  Uacute: 'Ú',
  Ouml: 'Ö',
  Uuml: 'Ü',
  Odblac: 'Ő',
  Udblac: 'Ű',
  // other European accents (names, loanwords)
  agrave: 'à',
  egrave: 'è',
  igrave: 'ì',
  ograve: 'ò',
  ugrave: 'ù',
  acirc: 'â',
  ecirc: 'ê',
  icirc: 'î',
  ocirc: 'ô',
  ucirc: 'û',
  auml: 'ä',
  euml: 'ë',
  iuml: 'ï',
  Auml: 'Ä',
  ccedil: 'ç',
  Ccedil: 'Ç',
  ntilde: 'ñ',
  szlig: 'ß',
  // symbols / typography in recipe + magazine copy
  deg: '°',
  ndash: '–',
  mdash: '—',
  minus: '−',
  hellip: '…',
  middot: '·',
  bull: '•',
  times: '×',
  divide: '÷',
  plusmn: '±',
  ge: '≥',
  le: '≤',
  frac12: '½',
  frac14: '¼',
  frac34: '¾',
  sup1: '¹',
  sup2: '²',
  sup3: '³',
  micro: 'µ',
  sect: '§',
  para: '¶',
  laquo: '«',
  raquo: '»',
  bdquo: '„',
  ldquo: '“',
  rdquo: '”',
  lsquo: '‘',
  rsquo: '’',
  copy: '©',
  reg: '®',
  trade: '™',
  euro: '€',
}

/**
 * Decode numeric (`&#NN;` / `&#xHH;`) and known named (`&name;`) HTML entities.
 * Unknown named entities are left as-is.
 * @param {string} [value]
 * @returns {string}
 */
export function decodeHtmlEntities(value) {
  if (!value) return ''
  return String(value)
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => {
      const parsed = Number.parseInt(code, 16)
      return Number.isFinite(parsed) ? String.fromCodePoint(parsed) : ''
    })
    .replace(/&#(\d+);/g, (_, code) => {
      const parsed = Number(code)
      return Number.isFinite(parsed) ? String.fromCodePoint(parsed) : ''
    })
    .replace(
      /&([a-z][a-z0-9]+);/gi,
      (match, name) => NAMED_HTML_ENTITIES[name] ?? NAMED_HTML_ENTITIES[name.toLowerCase()] ?? match
    )
}
