/**
 * Extract structured author records from the MODX `Cikk_szerzők` chunks
 * (`modx_site_htmlsnippets`, category 24) — the one-off migration that turns
 * hand-written author HTML into the `authors/{slug}` data model.
 *
 * Three chunk shapes are in the wild and none of them is positional, so each
 * block is classified by content rather than by tag order (see `parseChunk`):
 *
 *   cv-box     <div id="szerzo" class="cv"> <img> <h3 class="nev"> <p class="cv">
 *   alairas-p  <p class="alairas">Név<span>titulus</span></p>
 *   plain      Név <span>titulus</span>            (the transform wraps this one)
 *
 * Nothing is dropped silently: whatever a rule cannot place lands in the review
 * file as `unclassified`.
 *
 * Text is stored **with HTML entities intact** (`&#173;` soft hyphens included)
 * so it stays visible/editable in the CMS; `decodeHtmlEntities` resolves them at
 * render time. No tags survive in any field, so no `{@html}` downstream.
 *
 * Usage:
 *   npm run authors:extract
 *
 * Env: MODXDB_*
 *
 * Writes:
 *   scripts/data/authors.json                  the records (review + import source)
 *   scripts/data/authors-review.json           everything a human must look at
 *   scripts/data/authors-duplicate-bylines.md  articles whose body repeats the byline
 */
import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import mysql from 'mysql2/promise'
import { drizzle } from 'drizzle-orm/mysql2'
import { eq, and } from 'drizzle-orm'
import {
  modx_site_content,
  modx_site_htmlsnippets,
  modx_site_tmplvar_contentvalues,
} from '../drizzle/schema.ts'
import { decodeHtmlEntities } from '../src/lib/htmlEntities.js'

const AUTHOR_CHUNK_CATEGORY = 24
const AUTHOR_TV_ID = 18

const AUTHORS_PATH = path.resolve(process.cwd(), 'scripts/data/authors.json')
const REVIEW_PATH = path.resolve(process.cwd(), 'scripts/data/authors-review.json')
const BYLINES_PATH = path.resolve(process.cwd(), 'scripts/data/authors-duplicate-bylines.md')

/**
 * Images that are a programme/organisation logo, not a portrait. Never stored as
 * `photo`; kept only as the logo of a `support` box, dropped otherwise.
 */
const LOGO_IMAGE = /logo|diabpont/i
/** A contact line whose address is already captured in `email`. */
const CONTACT_LINE = /^El&eacute;rhet&otilde;s&eacute;g|^Elérhetőség|^E-?mail/i
/** A block holding donation details belongs to `support`, not to the CV. */
const SUPPORT_LINE = /Sz&aacute;mlasz&aacute;m|Számlaszám|Ad&oacute;sz&aacute;m|Adószám|adomány|Adomány/
/** Above this length a line reads as prose (CV) rather than a titulus/affiliation. */
const CV_LINE_MIN_LENGTH = 150
/** Shorter lines still read as prose when they end like a sentence. */
const CV_SENTENCE_MIN_LENGTH = 100
/**
 * Print-layout leftovers: a word broken across lines kept its hyphen when the
 * copy was pasted in (`di- abetológia`). A trailing hyphen before a conjunction
 * is the opposite — a legitimate suspended hyphen (`szív- és érrendszeri`) — so
 * those are left alone.
 */
const BROKEN_WORD = /(\p{Ll}{2,})-\s+(\p{Ll}+)/gu
const SUSPENDED_HYPHEN_NEXT = /^(és|s|vagy|illetve|valamint|meg)$/

// ── Text helpers ──────────────────────────────────────────────────────────────

/** Every joined word, for the review file — the rule is heuristic, so show it. */
const rejoinedWords = []
/** Chunk currently being parsed, so a rejoin can be attributed to it. */
let currentChunkId = 0

/** Tag-free NFC text with entities left intact. Collapses whitespace, keeps U+00AD. */
function text(html) {
  return String(html ?? '')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[ \t\r\n\f\v]+/g, ' ')
    // NFC first: in decomposed text an accented letter ends with a combining
    // mark, which would cut the word match short.
    .normalize('NFC')
    .replace(BROKEN_WORD, (match, head, tail) => {
      if (SUSPENDED_HYPHEN_NEXT.test(tail)) return match
      rejoinedWords.push({ chunk: currentChunkId, from: match, to: `${head}${tail}` })
      return `${head}${tail}`
    })
    .trim()
}

/** True when a block carries no readable content (`&nbsp;`-only paragraphs). */
function isBlank(value) {
  return decodeHtmlEntities(text(value)).replace(/\s|­/g, '') === ''
}

/** Split a block on `<br>` — in this corpus those separate list items, not prose. */
function lines(html) {
  return String(html ?? '')
    .split(/<br\s*\/?>/i)
    .map(text)
    .filter((line) => !isBlank(line))
}

/**
 * Prose (→ `cv`) vs. list item (→ `title`/`affiliations`). Length alone misreads
 * long institution lines, so a shorter line only counts as prose when it also
 * closes like a sentence — an institution line never ends in a full stop.
 */
function isCvProse(line) {
  const decoded = decodeHtmlEntities(line)
  if (decoded.length >= CV_LINE_MIN_LENGTH) return true
  return decoded.length >= CV_SENTENCE_MIN_LENGTH && decoded.trimEnd().endsWith('.')
}

/** `Prof. dr. Járai Zoltán` → `{ prefix: 'Prof. dr.', name: 'Járai Zoltán' }`. */
function splitPrefix(displayName) {
  const match = String(displayName ?? '').match(/^((?:prof\.?\s+)?(?:dr\.?)\s+)/i)
  if (!match) return { prefix: '', name: String(displayName ?? '').trim() }
  return {
    prefix: match[1].trim(),
    name: String(displayName).slice(match[1].length).trim(),
  }
}

/** Slug from the prefix-less name, so earning a title never breaks the link. */
function slugify(name) {
  return decodeHtmlEntities(name)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// ── Block collection ──────────────────────────────────────────────────────────

/** Anchors (`<a href>`) as structured links; `mailto:` becomes the email. */
function collectLinks(html, sink) {
  for (const match of String(html ?? '').matchAll(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)) {
    const url = match[1].trim()
    const label = text(match[2])
    if (/^mailto:/i.test(url)) sink.email = url.replace(/^mailto:/i, '').trim()
    else sink.links.push({ label: label || url, url })
  }
}

/** `<p>`/`<h3>` blocks with their class, in document order. */
function blocks(html) {
  return [...String(html ?? '').matchAll(/<(p|h3)\b([^>]*)>([\s\S]*?)<\/\1>/gi)].map((match) => ({
    tag: match[1].toLowerCase(),
    className: match[2].match(/class="([^"]*)"/i)?.[1] ?? '',
    inner: match[3],
    outer: match[0],
  }))
}

/**
 * Name element → display name + whatever the `<span>` inside it carries.
 * In `<h3 class="nev">Tihanyi András<span>dietetikus</span></h3>` the span is the
 * titulus, not part of the name.
 */
function parseNameBlock(inner) {
  const spanStart = inner.search(/<span\b/i)
  const namePart = spanStart === -1 ? inner : inner.slice(0, spanStart)
  const rest = spanStart === -1 ? '' : inner.slice(spanStart)
  return { displayName: text(namePart), extra: lines(rest) }
}

// ── Chunk parsing ─────────────────────────────────────────────────────────────

function detectShape(snippet) {
  const trimmed = String(snippet ?? '').trim()
  if (/^<(div|figure)[^>]*id="szerzo"/i.test(trimmed)) return 'cv-box'
  if (/^<p[^>]*class="alairas"/i.test(trimmed)) return 'alairas-p'
  if (/^</.test(trimmed)) return 'other'
  return 'plain'
}

/**
 * @param {{ id: number, name: string, snippet: string }} chunk
 * @returns {{ record: Record<string, unknown>, notes: string[], unclassified: string[] }}
 */
function parseChunk(chunk) {
  // Commented-out markup is common in these chunks (an old affiliation, a
  // disabled image) — drop it before anything else looks at the structure.
  const snippet = String(chunk.snippet ?? '').replace(/<!--[\s\S]*?-->/g, ' ')
  const shape = detectShape(snippet)
  currentChunkId = chunk.id
  const notes = []
  const unclassified = []

  const record = {
    slug: '',
    name: '',
    prefix: '',
    displayName: '',
    title: '',
    affiliations: [],
    cv: [],
    quote: '',
    photo: null,
    links: [],
    email: '',
    support: null,
    role: 'szerző',
    published: true,
    source: `modx-chunk:${chunk.id}`,
    legacyTokens: [chunk.name.normalize('NFC')],
  }

  // Portrait. An organisation logo is not one: it either belongs to the support
  // box (resolved once the blocks are parsed) or it is dropped.
  let logo = ''
  const img = snippet.match(/<img[^>]*src="([^"]+)"/i)
  if (img) {
    const src = img[1].trim().replace(/^\/+/, '')
    if (LOGO_IMAGE.test(src)) logo = src
    else record.photo = src
  }

  /** A titulus/affiliation is a list item, so its dangling separator is noise. */
  const trimSeparator = (line) => line.replace(/\s*[,;]\s*$/, '')

  /** Route one already-split line into title → affiliations → cv. */
  const placeLine = (line) => {
    if (isBlank(line)) return
    if (isCvProse(line)) record.cv.push(line)
    else if (!record.title) record.title = trimSeparator(line)
    else record.affiliations.push(trimSeparator(line))
  }

  const startSupport = () => (record.support ??= { lines: [], links: [], email: '', logo: null })

  const placeBlock = (block) => {
    const { className, inner } = block
    if (isBlank(inner)) return
    const blockLines = lines(inner)
    if (!blockLines.length) return

    if (blockLines.some((line) => SUPPORT_LINE.test(line))) {
      const support = startSupport()
      support.lines.push(...blockLines)
      collectLinks(inner, support)
      return
    }
    if (/\bi\b/.test(className) || /^[„"“]/.test(decodeHtmlEntities(blockLines[0]))) {
      record.quote = blockLines.join(' ')
      return
    }
    collectLinks(inner, record)
    for (const line of blockLines) placeLine(line)
  }

  if (shape === 'cv-box') {
    const all = blocks(snippet)
    const nameBlock =
      all.find((b) => b.tag === 'h3' && /\bnev\b/.test(b.className)) ??
      all.find((b) => /\balairas\b/.test(b.className))
    if (nameBlock) {
      const parsed = parseNameBlock(nameBlock.inner)
      record.displayName = parsed.displayName
      for (const line of parsed.extra) placeLine(line)
    } else {
      notes.push('nincs névelem (h3.nev / p.alairas)')
    }
    for (const block of all) {
      if (block === nameBlock) continue
      placeBlock(block)
    }
    // Text sitting directly in the box, outside any <p>/<h3>.
    const loose = text(all.reduce((acc, b) => acc.replace(b.outer, ' '), snippet))
    if (!isBlank(loose) && loose !== record.displayName) unclassified.push(loose)
  } else if (shape === 'alairas-p' || shape === 'plain') {
    const body = shape === 'alairas-p' ? (snippet.match(/<p[^>]*>([\s\S]*)<\/p>/i)?.[1] ?? '') : snippet
    const parsed = parseNameBlock(body)
    record.displayName = parsed.displayName
    collectLinks(body, record)
    for (const line of parsed.extra) placeLine(line)
    // A second <p> can hide inside an alairas chunk (nested markup).
    for (const block of blocks(body)) placeBlock(block)
  } else {
    notes.push(`ismeretlen forma: ${text(snippet).slice(0, 60)}`)
    unclassified.push(text(snippet))
  }

  if (logo) {
    if (record.support) record.support.logo = logo
    else notes.push(`logó eldobva (nincs support doboz): ${logo}`)
  }
  // The address already lives in `email`; the line repeating it is not an affiliation.
  record.affiliations = record.affiliations.filter(
    (line) => !(CONTACT_LINE.test(line) || (record.email && line.includes(record.email)))
  )
  // A line that is nothing but a link is covered by `links` — don't print it twice.
  const linkTexts = new Set(
    [...record.links, ...(record.support?.links ?? [])].flatMap(({ label, url }) => [
      label,
      url,
      url.replace(/^https?:\/\//, '').replace(/\/$/, ''),
    ])
  )
  const notALink = (line) => !linkTexts.has(line)
  record.affiliations = record.affiliations.filter(notALink)
  if (record.support) record.support.lines = record.support.lines.filter(notALink)

  const { prefix, name } = splitPrefix(record.displayName)
  record.prefix = prefix
  record.name = name
  record.slug = slugify(name)
  if (!record.slug) notes.push('nem képezhető slug (üres név)')

  return { record, notes, unclassified, shape }
}

// ── Merging ───────────────────────────────────────────────────────────────────

/** Richer record wins a slug collision; the loser's tokens and gaps are folded in. */
function mergeRecords(target, incoming) {
  const weight = (r) =>
    (r.photo ? 4 : 0) + r.cv.join(' ').length / 100 + r.affiliations.length + (r.title ? 1 : 0)
  const [keep, drop] = weight(incoming) > weight(target) ? [incoming, target] : [target, incoming]
  for (const field of ['title', 'quote', 'photo', 'email', 'displayName', 'prefix']) {
    if (!keep[field] && drop[field]) keep[field] = drop[field]
  }
  for (const field of ['affiliations', 'cv', 'links']) {
    if (!keep[field].length) keep[field] = drop[field]
  }
  keep.support ??= drop.support
  keep.legacyTokens = [...new Set([...keep.legacyTokens, ...drop.legacyTokens])]
  keep.source = [keep.source, drop.source].join(' + ')
  return keep
}

// ── Duplicate-byline report ───────────────────────────────────────────────────

const BYLINE_BLOCK = /<p[^>]*class="alairas"[^>]*>[\s\S]*?<\/p>/gi

function normalizeName(value) {
  return decodeHtmlEntities(value).toLowerCase().replace(/[.\s]+/g, ' ').trim()
}

function duplicateBylines(docs, tvByDoc) {
  const rows = []
  for (const doc of docs) {
    const tv = tvByDoc.get(doc.id)
    if (!tv) continue
    const tokenNames = tv
      .split(' ')
      .filter(Boolean)
      .map((token) => normalizeName(token.replaceAll('_', ' ')))
    for (const block of String(doc.content ?? '').match(BYLINE_BLOCK) ?? []) {
      const body = text(block)
      const hit = tokenNames.find((name) => name && normalizeName(body).startsWith(name))
      if (hit) rows.push({ id: doc.id, title: doc.pagetitle, tv, byline: decodeHtmlEntities(body) })
    }
  }
  return rows.sort((a, b) => a.id - b.id)
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  for (const key of ['MODXDB_HOST', 'MODXDB_PORT', 'MODXDB_USER', 'MODXDB_DATABASE', 'MODXDB_PASSWORD']) {
    if (!process.env[key]) throw new Error(`${key} is required`)
  }
  const connection = await mysql.createConnection({
    host: process.env.MODXDB_HOST,
    port: Number(process.env.MODXDB_PORT),
    user: process.env.MODXDB_USER,
    database: process.env.MODXDB_DATABASE,
    password: process.env.MODXDB_PASSWORD,
  })
  const modxdb = drizzle(connection)

  const chunks = await modxdb
    .select()
    .from(modx_site_htmlsnippets)
    .where(eq(modx_site_htmlsnippets.category, AUTHOR_CHUNK_CATEGORY))
  const tvRows = await modxdb
    .select()
    .from(modx_site_tmplvar_contentvalues)
    .where(eq(modx_site_tmplvar_contentvalues.tmplvarid, AUTHOR_TV_ID))
  const docs = await modxdb
    .select()
    .from(modx_site_content)
    .where(and(eq(modx_site_content.published, 1), eq(modx_site_content.deleted, 0)))
  await connection.end()

  // Token usage decides which chunks are live; NFC first, because five chunk
  // names are stored decomposed while every TV value is composed.
  const tvByDoc = new Map(tvRows.map((row) => [row.contentid, String(row.value ?? '').trim()]))
  const usage = new Map()
  for (const [docId, value] of tvByDoc) {
    for (const token of value.split(' ')) {
      if (!token) continue
      const key = token.normalize('NFC')
      if (!usage.has(key)) usage.set(key, [])
      usage.get(key).push(docId)
    }
  }

  const bySlug = new Map()
  const review = {
    generatedAt: new Date().toISOString(),
    // No connection details here: this file is committed, and Netlify's secret
    // scanner (rightly) fails a build that contains the database name.
    source: `MODX site_htmlsnippets · category ${AUTHOR_CHUNK_CATEGORY}`,
    orphanChunks: [],
    nfdChunkNames: [],
    nameMismatch: [],
    slugCollisions: [],
    unclassified: [],
    notes: [],
    rejoinedWords: [],
    tokensWithoutChunk: [],
  }
  const shapeCounts = {}

  for (const chunk of [...chunks].sort((a, b) => a.name.localeCompare(b.name, 'hu'))) {
    const nfcName = chunk.name.normalize('NFC')
    const articleIds = usage.get(nfcName) ?? []
    const { record, notes, unclassified, shape } = parseChunk(chunk)
    shapeCounts[shape] = (shapeCounts[shape] ?? 0) + 1

    if (chunk.name !== nfcName) {
      review.nfdChunkNames.push({ id: chunk.id, name: nfcName, articles: articleIds.length })
    }
    if (!articleIds.length) {
      review.orphanChunks.push({
        id: chunk.id,
        name: chunk.name,
        displayName: record.displayName,
        action: 'kihagyva — töröld MODX-ban',
      })
      continue
    }
    if (normalizeName(record.displayName) !== normalizeName(nfcName.replaceAll('_', ' '))) {
      review.nameMismatch.push({
        id: chunk.id,
        token: nfcName,
        displayName: record.displayName,
        slug: record.slug,
      })
    }
    if (notes.length) review.notes.push({ id: chunk.id, name: nfcName, notes })
    if (unclassified.length) review.unclassified.push({ id: chunk.id, name: nfcName, unclassified })

    record.articleCount = articleIds.length
    const existing = bySlug.get(record.slug)
    if (existing) {
      review.slugCollisions.push({
        slug: record.slug,
        merged: [existing.source, record.source],
        displayNames: [existing.displayName, record.displayName],
      })
      const merged = mergeRecords(existing, record)
      merged.articleCount = (existing.articleCount ?? 0) + articleIds.length
      bySlug.set(record.slug, merged)
    } else {
      bySlug.set(record.slug, record)
    }
  }

  const chunkNames = new Set(chunks.map((chunk) => chunk.name.normalize('NFC')))
  for (const [token, articleIds] of [...usage].sort((a, b) => b[1].length - a[1].length)) {
    if (chunkNames.has(token)) continue
    review.tokensWithoutChunk.push({
      token,
      name: token.replaceAll('_', ' '),
      articles: articleIds.length,
    })
  }

  // Only report joins inside chunks that actually made it into the output.
  const keptChunkIds = new Set(
    [...bySlug.values()].flatMap((record) =>
      [...String(record.source).matchAll(/modx-chunk:(\d+)/g)].map((m) => Number(m[1]))
    )
  )
  review.rejoinedWords = [
    ...new Set(
      rejoinedWords
        .filter((entry) => keptChunkIds.has(entry.chunk))
        .map((entry) => `${entry.chunk}: ${entry.from} → ${entry.to}`)
    ),
  ].sort()

  const authors = [...bySlug.values()].sort((a, b) => a.slug.localeCompare(b.slug, 'hu'))
  const bylines = duplicateBylines(docs, tvByDoc)

  fs.writeFileSync(AUTHORS_PATH, `${JSON.stringify(authors, null, 2)}\n`)
  fs.writeFileSync(REVIEW_PATH, `${JSON.stringify(review, null, 2)}\n`)
  fs.writeFileSync(
    BYLINES_PATH,
    [
      '# Duplázódó aláírások',
      '',
      `Generálta: \`npm run authors:extract\` — ${new Date().toISOString().slice(0, 10)}`,
      '',
      'Ezekben a cikkekben a törzsbeli `<p class="alairas">` ugyanazt a személyt ismétli,',
      'mint a `szerzo` TV. A törzsbeli aláírás törlendő MODX-ban, a TV marad.',
      'Ahol a törzsben más személy (fotós, társszerző, olvasó) szerepel, az nincs a listán — az marad.',
      '',
      '| MODX id | cikk | szerzo TV | a törzsben |',
      '|---|---|---|---|',
      ...bylines.map(
        (row) =>
          `| ${row.id} | ${row.title.replaceAll('|', '\\|')} | ${row.tv} | ${row.byline.replaceAll('|', '\\|')} |`
      ),
      '',
    ].join('\n')
  )

  console.log(`chunk: ${chunks.length} (${Object.entries(shapeCounts).map(([k, v]) => `${k}=${v}`).join(', ')})`)
  console.log(`szerző: ${authors.length}  fotóval: ${authors.filter((a) => a.photo).length}`)
  console.log(
    `review: ${review.orphanChunks.length} árva, ${review.nfdChunkNames.length} NFD, ` +
      `${review.nameMismatch.length} név-eltérés, ${review.slugCollisions.length} slug-ütközés, ` +
      `${review.unclassified.length} unclassified, ${review.notes.length} megjegyzés, ` +
      `${review.tokensWithoutChunk.length} chunk nélküli token`
  )
  console.log(`duplázódó aláírás: ${bylines.length} cikk`)
  console.log(`írva: ${AUTHORS_PATH}\n       ${REVIEW_PATH}\n       ${BYLINES_PATH}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
