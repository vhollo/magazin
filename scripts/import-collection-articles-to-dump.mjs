/**
 * Import specific MODX collection (gyűjtő) articles into the create-only dump
 * `scripts/data/data.json`, so `recipes:dedupe:manual:create-local` can split
 * them into Receptsárok recipes. One-off sourcing step — the dump is a curated
 * subset and these articles were never in it.
 *
 * Reads raw rows + TVs from MODX MySQL (`MODXDB_*`) and the canonical path from
 * Firestore (`docs/*`). Builds the same `{id,path,alias,longtitle,description,
 * content,publishedon,editedon,tv}` shape as existing entries (raw `[[nagyito]]`
 * content; szerző name = underscore→space, mirroring transform `addTVs`).
 *
 * Usage: node scripts/import-collection-articles-to-dump.mjs   (writes data.json)
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import mysql from 'mysql2/promise'
import admin from 'firebase-admin'
import { decodeHtmlEntities } from '../src/lib/htmlEntities.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DATA_JSON = path.join(root, 'scripts/data/data.json')
// 1578 (junior/2016 accu-chek) and 2183 (junior/2018 accu-chek) are excluded:
// their dishes are republished duplicates of existing recipes (the 2015 karácsony
// set and the 2017 camp / id 1994 respectively), so creating them only yields
// near-duplicates. The 10 below are genuinely new recipe collections.
const IDS = [399, 1500, 1424, 1614, 1658, 1677, 2032, 1040, 4198, 1994]

function env() {
  return Object.fromEntries(
    fs
      .readFileSync(path.join(root, '.env'), 'utf8')
      .split('\n')
      .map((l) => {
        const i = l.indexOf('=')
        return i < 0 ? null : [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]
      })
      .filter(Boolean)
  )
}

/** tags TV (id 3) → array, mirroring transform addTVs. */
function parseTags(value) {
  return String(value ?? '')
    .replace('diabetes', '')
    .replace('terhesség', 'várandósság')
    .replace('családorvos', 'orvos')
    .split(' ')
    .filter((t) => t !== '')
}

async function main() {
  const e = env()
  const db = await mysql.createConnection({
    host: e.MODXDB_HOST,
    port: Number(e.MODXDB_PORT),
    user: e.MODXDB_USER,
    password: e.MODXDB_PASSWORD,
    database: e.MODXDB_DATABASE,
  })
  const [rows] = await db.query(
    'SELECT id,pagetitle,longtitle,description,introtext,alias,content,parent,publishedon,editedon FROM modx_site_content WHERE id IN (?)',
    [IDS]
  )
  const [tvRows] = await db.query(
    'SELECT contentid,tmplvarid,value FROM modx_site_tmplvar_contentvalues WHERE contentid IN (?) AND tmplvarid IN (3,18,23)',
    [IDS]
  )
  await db.end()
  const tvBy = new Map() // contentid -> {3,18,23}
  for (const t of tvRows) {
    if (!tvBy.has(t.contentid)) tvBy.set(t.contentid, {})
    tvBy.get(t.contentid)[t.tmplvarid] = t.value
  }

  // Canonical path per MODX id from Firestore.
  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(e.FIREBASE_ADMIN_KEY)) })
  const fdb = admin.firestore()
  const snap = await fdb.collection('docs').where('id', 'in', IDS).select('id', 'path').get()
  const pathById = new Map()
  snap.forEach((d) => pathById.set(Number(d.get('id')), String(d.get('path'))))

  const entries = []
  for (const r of rows) {
    const tv = tvBy.get(r.id) ?? {}
    const szerzo = String(tv[18] ?? '')
      .split(' ')
      .filter(Boolean)
      .map((val) => ({ val, name: val.replaceAll('_', ' ') }))
    const docPath = pathById.get(r.id)
    if (!docPath) {
      console.warn(`skip id ${r.id}: no Firestore path`)
      continue
    }
    entries.push({
      id: r.id,
      path: docPath,
      alias: r.alias,
      longtitle: decodeHtmlEntities(r.longtitle || r.pagetitle || ''),
      description: decodeHtmlEntities(r.description || ''),
      content: r.content || '',
      publishedon: r.publishedon,
      editedon: r.editedon,
      tv: { cat: tv[23] || '', tags: parseTags(tv[3]), szerzo, ogi: '' },
    })
  }

  const docs = JSON.parse(fs.readFileSync(DATA_JSON, 'utf8'))
  let added = 0
  let replaced = 0
  for (const ent of entries) {
    const idx = docs.findIndex((d) => d.id === ent.id)
    if (idx >= 0) {
      docs[idx] = ent
      replaced++
    } else {
      docs.push(ent)
      added++
    }
  }
  fs.writeFileSync(DATA_JSON, JSON.stringify(docs, null, 2) + '\n')
  console.log(`data.json: +${added} new, ${replaced} refreshed → now ${docs.length} docs`)
  for (const ent of entries) {
    console.log(`  ${ent.id} | szerzo=${JSON.stringify(ent.tv.szerzo.map((s) => s.name))} | ${ent.path}`)
  }
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
