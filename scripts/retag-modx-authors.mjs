/**
 * Rewrite the MODX `szerzo` TV (18) from name tokens to author slugs.
 *
 *   Dr._Kováts_Boglárka  →  kovats-boglarka
 *
 * The slug carries no title, so a later "Dr." never breaks the article↔author
 * link. Tokens with no `authors/{slug}` record (authors who never had a chunk)
 * are left exactly as they are — the byline still renders their name, they just
 * have no profile page.
 *
 * Safe by construction: the transform resolves slugs *and* legacy tokens, so a
 * half-migrated TV table renders identically either way.
 *
 * Usage:
 *   npm run authors:retag                 # dry run, prints every change
 *   npm run authors:retag -- --apply      # writes MODX (take a dump first!)
 *
 * Before --apply:
 *   mysqldump -h "$MODXDB_HOST" -u "$MODXDB_USER" -p "$MODXDB_DATABASE" \
 *     modx_site_tmplvar_contentvalues > tv-backup.sql
 *
 * Env: MODXDB_*
 */
import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import mysql from 'mysql2/promise'
import { drizzle } from 'drizzle-orm/mysql2'
import { eq, and } from 'drizzle-orm'
import { modx_site_tmplvar_contentvalues } from '../drizzle/schema.ts'

const apply = process.argv.includes('--apply')
const AUTHOR_TV_ID = 18
const AUTHORS_PATH = path.resolve(process.cwd(), 'scripts/data/authors.json')

/** Same normalisation as the transform's `authorKey`. */
function authorKey(value) {
  return value.replaceAll('_', ' ').normalize('NFC').toLowerCase().replace(/[.\s]+/g, ' ').trim()
}

async function main() {
  for (const key of ['MODXDB_HOST', 'MODXDB_PORT', 'MODXDB_USER', 'MODXDB_DATABASE', 'MODXDB_PASSWORD']) {
    if (!process.env[key]) throw new Error(`${key} is required`)
  }
  const authors = JSON.parse(fs.readFileSync(AUTHORS_PATH, 'utf8'))

  /** token/name/slug → slug */
  const slugByKey = new Map()
  for (const author of authors) {
    slugByKey.set(author.slug, author.slug)
    for (const key of [author.displayName, author.name, ...(author.legacyTokens ?? [])]) {
      if (key) slugByKey.set(authorKey(key), author.slug)
    }
  }

  const connection = await mysql.createConnection({
    host: process.env.MODXDB_HOST,
    port: Number(process.env.MODXDB_PORT),
    user: process.env.MODXDB_USER,
    database: process.env.MODXDB_DATABASE,
    password: process.env.MODXDB_PASSWORD,
  })
  const modxdb = drizzle(connection)

  const rows = await modxdb
    .select()
    .from(modx_site_tmplvar_contentvalues)
    .where(eq(modx_site_tmplvar_contentvalues.tmplvarid, AUTHOR_TV_ID))

  const changes = []
  const unresolved = new Map()
  for (const row of rows) {
    const value = String(row.value ?? '').trim()
    if (!value) continue
    const tokens = value.split(' ').filter(Boolean)
    const mapped = tokens.map((token) => {
      const slug = slugByKey.get(token) ?? slugByKey.get(authorKey(token))
      if (!slug) unresolved.set(token, (unresolved.get(token) ?? 0) + 1)
      return slug ?? token
    })
    const next = mapped.join(' ')
    if (next !== value) changes.push({ id: row.id, contentid: row.contentid, from: value, to: next })
  }

  console.log(`TV 18 sor: ${rows.length} · átírandó: ${changes.length} · érintetlen: ${rows.length - changes.length}`)
  for (const change of changes.slice(0, 15)) {
    console.log(`   ${String(change.contentid).padStart(5)}  ${change.from}  →  ${change.to}`)
  }
  if (changes.length > 15) console.log(`   … +${changes.length - 15}`)

  if (unresolved.size) {
    console.log(`\nnincs szerzőrekordja (marad a token, nem lesz /szerzok oldala) — ${unresolved.size} név:`)
    for (const [token, count] of [...unresolved].sort((a, b) => b[1] - a[1]).slice(0, 10)) {
      console.log(`   ${token} (${count} cikk)`)
    }
    if (unresolved.size > 10) console.log(`   … +${unresolved.size - 10}`)
  }

  if (!apply) {
    console.log('\nDry run — a MODX nem módosult. `--apply` írja (előtte készíts mysqldump-ot!).')
    await connection.end()
    return
  }

  for (const change of changes) {
    await modxdb
      .update(modx_site_tmplvar_contentvalues)
      .set({ value: change.to })
      .where(
        and(
          eq(modx_site_tmplvar_contentvalues.id, change.id),
          // Guard against a concurrent edit between the read and this write.
          eq(modx_site_tmplvar_contentvalues.value, change.from)
        )
      )
  }
  console.log(`\nírva: ${changes.length} TV-sor. Futtasd utána: npm run sync:modx:full`)
  await connection.end()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
