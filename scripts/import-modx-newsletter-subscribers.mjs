/**
 * Copy the MODX newsletter subscribers (active web users, `web_user_attributes`
 * with `blocked = '0'` — the list the old `SendNewsV` snippet exported) into the
 * Firestore subscriber list `tables/elofizetok/hirlevel`, which the FireCMS
 * newsletter export reads.
 *
 * Re-runnable (e.g. right before launch) and diff-only:
 *  - address missing from Firestore            → created with `source: 'modx'`
 *  - `source: 'modx'` doc whose name changed    → updated
 *  - `source: 'modx'` doc no longer active      → deleted
 *  - any other doc (signed up on the new site)  → left alone
 * Doc id = lowercased e-mail, same as the `/hirlevel` form action. No MODX key
 * is copied: the new unsubscribe link does not use one.
 *
 * Cost: one read of the whole subscriber collection per run (~18k reads), and
 * writes only for the differences (~18k on the first `--apply`).
 *
 * Usage:
 *   node scripts/import-modx-newsletter-subscribers.mjs           # dry run
 *   node scripts/import-modx-newsletter-subscribers.mjs --apply   # write
 *
 * Env: MODXDB_*, FIREBASE_ADMIN_KEY
 */
import 'dotenv/config'
import mysql from 'mysql2/promise'
import { Timestamp } from 'firebase-admin/firestore'
import { getFirestoreDb } from './lib/firebase-admin.mjs'

const apply = process.argv.includes('--apply')

const SUBSCRIBERS = 'tables/elofizetok/hirlevel'
/** Same rule as `src/routes/hirlevel/+page.server.ts` (no `/`: the address is a doc id). */
const EMAIL_RE = /^[^@\s/]+@[^@\s/]+\.[^@\s/]+$/

async function loadModxSubscribers() {
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
  try {
    const [rows] = await connection.query(
      "SELECT email, fullname, createdon FROM modx_web_user_attributes WHERE blocked = '0' ORDER BY createdon"
    )
    /** @type {Map<string, { email: string, nev: string, createdon: number }>} */
    const byId = new Map()
    let invalid = 0
    for (const row of rows) {
      const email = String(row.email ?? '').trim()
      if (!EMAIL_RE.test(email)) {
        invalid++
        continue
      }
      const id = email.toLowerCase()
      // Oldest registration wins for a duplicated address (rows are ordered by createdon).
      if (!byId.has(id)) {
        byId.set(id, { email, nev: String(row.fullname ?? '').trim(), createdon: Number(row.createdon) })
      }
    }
    return { byId, total: rows.length, invalid }
  } finally {
    await connection.end()
  }
}

async function main() {
  const modx = await loadModxSubscribers()
  console.log(
    `MODX: ${modx.total} active web user(s), ${modx.byId.size} unique valid address(es), ${modx.invalid} invalid`
  )

  const db = getFirestoreDb()
  const snapshot = await db.collection(SUBSCRIBERS).get()
  console.log(`Firestore ${SUBSCRIBERS}: ${snapshot.size} doc(s)`)

  /** @type {Map<string, Record<string, unknown>>} */
  const existing = new Map(snapshot.docs.map((doc) => [doc.id, doc.data()]))

  const creates = []
  const updates = []
  const deletes = []
  let siteKept = 0

  for (const [id, sub] of modx.byId) {
    const current = existing.get(id)
    if (!current) {
      creates.push({ id, sub })
    } else if (current.source === 'modx' && current.nev !== sub.nev) {
      updates.push({ id, nev: sub.nev })
    } else if (current.source !== 'modx') {
      siteKept++
    }
  }
  for (const [id, data] of existing) {
    if (data.source === 'modx' && !modx.byId.has(id)) deletes.push(id)
  }

  console.log(
    `plan: create ${creates.length}, update ${updates.length}, delete ${deletes.length},` +
      ` already on the list from the site (left alone) ${siteKept}`
  )
  if (!apply) {
    console.log('dry run — pass --apply to write')
    return
  }

  const writer = db.bulkWriter()
  let failed = 0
  writer.onWriteError((error) => {
    if (error.failedAttempts < 5) return true
    failed++
    console.error(`write failed (${error.code}): ${error.message}`)
    return false
  })
  const col = db.collection(SUBSCRIBERS)
  for (const { id, sub } of creates) {
    writer.create(col.doc(id), {
      email: sub.email,
      nev: sub.nev,
      consent: true,
      date: sub.createdon > 0 ? Timestamp.fromMillis(sub.createdon * 1000) : Timestamp.now(),
      source: 'modx',
    })
  }
  for (const { id, nev } of updates) writer.update(col.doc(id), { nev })
  for (const id of deletes) writer.delete(col.doc(id))
  await writer.close()

  console.log(
    `applied: ${creates.length + updates.length + deletes.length - failed} write(s)` +
      (failed ? `, ${failed} failed` : '')
  )
  if (failed) process.exitCode = 1
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
