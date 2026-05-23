/**
 * Incremental MODX → Firestore sync for magazine articles.
 *
 * 1. Read meta/sync.lastEdit
 * 2. SELECT rows with editedon > lastEdit (same filters as src/lib/modx/index.ts)
 * 3. Transform via src/lib/modx/transform.ts
 * 4. Upsert docs/{encodeDocPathId(path)}
 * 5. Recompute collections/{slug} (top 72 thin cards per tag query) and collections/home
 * 6. Build MiniSearch index, gzip-upload to Storage, update meta/search
 * 7. Update meta/sync.lastEdit
 *
 * Usage:
 *   node scripts/sync-modx-to-firestore.mjs          # incremental
 *   node scripts/sync-modx-to-firestore.mjs --full   # one-time backfill (lastEdit ignored)
 *
 * Env: MODXDB_*, FIREBASE_ADMIN_KEY, FIREBASE_STORAGE_BUCKET, PUBLIC_BASE_URL (optional)
 * Optional: NETLIFY_SITE_ID, NETLIFY_ACCESS_TOKEN (edge-cache purge)
 */
import 'dotenv/config'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { drizzle } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'
import { eq, ne, desc, and, or, gt, inArray } from 'drizzle-orm'
import {
  modx_site_content,
  modx_site_tmplvar_contentvalues,
  modx_site_htmlsnippets,
} from '../drizzle/schema.ts'
import { getFirestoreDb } from './lib/firebase-admin.mjs'
import { encodeDocPathId } from './lib/doc-path-id.mjs'
import { buildAndUploadSearchIndex } from './lib/search-index.mjs'
import { updateRelatedCards } from './lib/related-cards.mjs'
import { loadProjectionDocs } from './lib/firestore-docs.mjs'
import { purgeNetlifyPaths } from './lib/netlify-purge.mjs'
import {
  loadRecipesFromJson,
  resolveReceptsarokRedirect,
} from './lib/receptsarok-redirect-match.mjs'
import {
  appendRedirectsManifest,
  registerRedirectEntries,
} from './lib/receptsarok-redirects-manifest.mjs'

const isFullSync = process.argv.includes('--full')

const COLLECTIONS_COLLECTION = 'collections'
const HOME_COLLECTION_ID = 'home'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || 'https://www.diabetes.hu/'
const RS_REDIRECTS_PATH = path.join(root, 'src/lib/data/receptsarok-redirects.json')
const RECIPES_JSON_PATH = path.join(root, 'src/lib/data/recipes.json')
const META_SYNC_DOC = 'sync'

/** @param {import('drizzle-orm/mysql2').MySql2Database} modxdb */
async function queryChangedRows(modxdb, lastEdit) {
  const newDocs = await modxdb
    .select()
    .from(modx_site_content)
    .orderBy(desc(modx_site_content.publishedon))
    .where(
      and(
        gt(modx_site_content.editedon, lastEdit),
        eq(modx_site_content.deleted, 0),
        eq(modx_site_content.published, 1),
        eq(modx_site_content.type, 'document'),
        ne(modx_site_content.parent, 1),
        or(eq(modx_site_content.template, 9), eq(modx_site_content.template, 13))
      )
    )

  const modxSiteHirek = await modxdb
    .select()
    .from(modx_site_content)
    .orderBy(desc(modx_site_content.publishedon))
    .where(
      or(
        and(eq(modx_site_content.id, 2797), gt(modx_site_content.editedon, lastEdit)),
        and(
          gt(modx_site_content.editedon, lastEdit),
          eq(modx_site_content.parent, 1),
          eq(modx_site_content.deleted, 0),
          eq(modx_site_content.hidemenu, 0),
          eq(modx_site_content.published, 1),
          eq(modx_site_content.type, 'document')
        )
      )
    )

  const byId = new Map()
  for (const row of [...newDocs, ...modxSiteHirek]) {
    byId.set(row.id, row)
  }
  return [...byId.values()]
}

/** All published magazine rows (for --full backfill). */
/** @param {import('drizzle-orm/mysql2').MySql2Database} modxdb */
async function queryAllRows(modxdb) {
  const newDocs = await modxdb
    .select()
    .from(modx_site_content)
    .orderBy(desc(modx_site_content.publishedon))
    .where(
      and(
        eq(modx_site_content.deleted, 0),
        eq(modx_site_content.published, 1),
        eq(modx_site_content.type, 'document'),
        ne(modx_site_content.parent, 1),
        or(eq(modx_site_content.template, 9), eq(modx_site_content.template, 13))
      )
    )

  const modxSiteHirek = await modxdb
    .select()
    .from(modx_site_content)
    .orderBy(desc(modx_site_content.publishedon))
    .where(
      or(
        eq(modx_site_content.id, 2797),
        and(
          eq(modx_site_content.parent, 1),
          eq(modx_site_content.deleted, 0),
          eq(modx_site_content.hidemenu, 0),
          eq(modx_site_content.published, 1),
          eq(modx_site_content.type, 'document')
        )
      )
    )

  const byId = new Map()
  for (const row of [...newDocs, ...modxSiteHirek]) {
    byId.set(row.id, row)
  }
  return [...byId.values()]
}

/**
 * @param {import('drizzle-orm/mysql2').MySql2Database} modxdb
 * @param {typeof modx_site_content.$inferSelect[]} initialRows
 */
async function expandRowsWithAncestors(modxdb, initialRows) {
  const byId = new Map(initialRows.map((row) => [row.id, row]))
  let queue = initialRows.map((row) => row.parent).filter((parentId) => parentId > 0 && !byId.has(parentId))

  while (queue.length) {
    const batch = [...new Set(queue)]
    queue = []
    const fetched = await modxdb
      .select()
      .from(modx_site_content)
      .where(inArray(modx_site_content.id, batch))
    for (const row of fetched) {
      byId.set(row.id, row)
      if (row.parent > 0 && !byId.has(row.parent)) {
        queue.push(row.parent)
      }
    }
  }

  return [...byId.values()]
}

/** @param {typeof modx_site_content.$inferSelect[]} rows */
function sortRowsByDepth(rows) {
  const byId = new Map(rows.map((row) => [row.id, row]))

  /** @param {number} id @param {Set<number>} seen */
  function depth(id, seen = new Set()) {
    if (seen.has(id)) return 0
    seen.add(id)
    const row = byId.get(id)
    if (!row || row.parent === 0) return 0
    return 1 + depth(row.parent, seen)
  }

  return [...rows].sort((a, b) => depth(a.id) - depth(b.id))
}

/**
 * @param {import('firebase-admin/firestore').Firestore} firestore
 * @param {string} docPath
 */
async function getExistingRedirect(firestore, docPath) {
  const ref = firestore.collection('docs').doc(encodeDocPathId(docPath))
  const snap = await ref.get()
  if (!snap.exists) return undefined
  const redirect = snap.data()?.redirect
  return typeof redirect === 'string' && redirect.trim() ? redirect.trim() : undefined
}

/**
 * @param {ReturnType<import('../src/lib/modx/transform.ts').createModxTransform>} modxTransform
 * @param {Record<string, unknown>} rawRow
 * @param {Set<number>} changedIds
 * @param {Map<number, Record<string, unknown>>} workingById
 * @param {ReturnType<import('../src/lib/modx/transform.ts').loadReceptsarokRedirectMaps>} redirectMaps
 * @param {import('firebase-admin/firestore').Firestore} firestore
 * @param {Record<string, unknown>[]} recipes
 */
async function processRow(
  modxTransform,
  rawRow,
  changedIds,
  workingById,
  redirectMaps,
  firestore,
  recipes
) {
  const doc = structuredClone(rawRow)
  const cached = workingById.get(doc.id)

  modxTransform.addTVs(doc)
  modxTransform.findPath(doc)
  if (doc.tv?.tags?.length > 0) modxTransform.extraTags(doc)
  modxTransform.nagyito(doc)
  modxTransform.alapjav(doc)
  modxTransform.ellipsis(doc)

  const fallbackRedirect =
    typeof cached?.redirect === 'string'
      ? cached.redirect
      : doc.path
        ? await getExistingRedirect(firestore, doc.path)
        : undefined

  const resolved = resolveReceptsarokRedirect(doc, redirectMaps, recipes, fallbackRedirect)
  modxTransform.setReceptsarokRedirect(doc, resolved.redirect)
  const processed = modxTransform.docFields(doc)
  workingById.set(doc.id, processed)

  if (!changedIds.has(doc.id)) {
    return { written: false, processed, dynamicEntry: resolved.dynamicEntry }
  }

  if (!processed.path) {
    console.warn(`skip write: id=${processed.id} has no path after transform`)
    return { written: false, processed }
  }

  const docId = encodeDocPathId(processed.path)
  await firestore.collection('docs').doc(docId).set(processed)
  if (resolved.dynamicEntry) {
    console.log(
      `  redirect id=${processed.id} → /receptsarok/${resolved.dynamicEntry.year}/${resolved.dynamicEntry.id} (dynamic match)`
    )
  }
  return { written: true, processed, docId, dynamicEntry: resolved.dynamicEntry }
}

async function readLastEdit(firestore) {
  const snap = await firestore.collection('meta').doc(META_SYNC_DOC).get()
  if (!snap.exists) return 0
  const value = snap.data()?.lastEdit
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? n : 0
}

/** @param {typeof modx_site_content.$inferSelect[]} rows */
function maxEditedon(rows, fallback = 0) {
  return rows.reduce((max, row) => (row.editedon > max ? row.editedon : max), fallback)
}

/**
 * Recompute and write `collections/{slug}` for every tag-collection query plus
 * `collections/home`. One Firestore write per collection.
 *
 * @param {import('firebase-admin/firestore').Firestore} firestore
 * @param {Record<string, unknown>[]} projectionDocs slim docs (no HTML bodies)
 */
async function writeCollections(firestore, projectionDocs) {
  const collectionsMod = await import(
    pathToFileURL(path.join(root, 'src/lib/modx/collections.ts')).href
  )
  const {
    collectionQueries,
    docsByTags,
    homeDocs,
    isListedDoc,
    toThinCard,
    COLLECTION_LIMIT,
  } = collectionsMod

  const listedDocs = projectionDocs.filter(isListedDoc)
  console.log(
    `collections: scanning ${listedDocs.length}/${projectionDocs.length} listed docs, limit=${COLLECTION_LIMIT}`
  )

  const generatedAt = new Date().toISOString()
  const slugs = Object.keys(collectionQueries)
  let written = 0

  for (const slug of slugs) {
    const queryTags = collectionQueries[slug]
    const matched = docsByTags(listedDocs, queryTags, '0')
    const cards = matched.map((doc) => toThinCard(doc, doc.rank))
    await firestore.collection(COLLECTIONS_COLLECTION).doc(slug).set({
      slug,
      queryTags,
      cards,
      count: cards.length,
      generatedAt,
    })
    written++
    console.log(`  wrote ${COLLECTIONS_COLLECTION}/${slug} (${cards.length} cards)`)
  }

  const homeCards = homeDocs(listedDocs).map((doc) => toThinCard(doc))
  await firestore.collection(COLLECTIONS_COLLECTION).doc(HOME_COLLECTION_ID).set({
    slug: HOME_COLLECTION_ID,
    cards: homeCards,
    count: homeCards.length,
    generatedAt,
  })
  written++
  console.log(`  wrote ${COLLECTIONS_COLLECTION}/${HOME_COLLECTION_ID} (${homeCards.length} cards)`)

  return written
}

async function main() {
  for (const key of ['MODXDB_HOST', 'MODXDB_USER', 'MODXDB_DATABASE', 'MODXDB_PASSWORD']) {
    if (!process.env[key]) {
      throw new Error(`${key} is required`)
    }
  }

  const { createModxTransform, loadReceptsarokRedirectMaps } = await import(
    pathToFileURL(path.join(root, 'src/lib/modx/transform.ts')).href
  )

  const firestore = getFirestoreDb()
  const lastEdit = isFullSync ? 0 : await readLastEdit(firestore)
  console.log(
    isFullSync
      ? 'full backfill (lastEdit forced to 0)'
      : `meta/${META_SYNC_DOC}.lastEdit = ${lastEdit}`
  )

  const connection = await mysql.createConnection({
    host: process.env.MODXDB_HOST,
    port: Number(process.env.MODXDB_PORT || 3306),
    user: process.env.MODXDB_USER,
    database: process.env.MODXDB_DATABASE,
    password: process.env.MODXDB_PASSWORD,
  })
  const modxdb = drizzle(connection)

  let changedRows
  try {
    changedRows = isFullSync
      ? await queryAllRows(modxdb)
      : await queryChangedRows(modxdb, lastEdit)
  } catch (error) {
    await connection.end()
    throw error
  }

  console.log(`${isFullSync ? 'total' : 'changed'} MODX rows: ${changedRows.length}`)

  if (changedRows.length === 0) {
    await connection.end()
    console.log('nothing to sync')
    return
  }

  const changedIds = new Set(changedRows.map((row) => row.id))
  const rowsToProcess = sortRowsByDepth(await expandRowsWithAncestors(modxdb, changedRows))
  console.log(`rows to process (incl. ancestors): ${rowsToProcess.length}`)

  const tmplvarContentvalues = await modxdb.select().from(modx_site_tmplvar_contentvalues)
  const modxSzerzok = await modxdb
    .select()
    .from(modx_site_htmlsnippets)
    .where(eq(modx_site_htmlsnippets.category, 24))

  await connection.end()

  const redirectMaps = loadReceptsarokRedirectMaps(RS_REDIRECTS_PATH)
  const recipes = loadRecipesFromJson(RECIPES_JSON_PATH)
  /** @type {Map<number, Record<string, unknown>>} */
  const workingById = new Map()
  /** @type {object[]} */
  const dynamicRedirectEntries = []

  const modxTransform = createModxTransform({
    publicBaseUrl: PUBLIC_BASE_URL,
    tmplvarContentvalues,
    modxSzerzok,
    getEveryDocs: () => [...workingById.values()],
    redirectMaps,
  })

  let written = 0
  let skipped = 0

  for (const rawRow of rowsToProcess) {
    const result = await processRow(
      modxTransform,
      rawRow,
      changedIds,
      workingById,
      redirectMaps,
      firestore,
      recipes
    )
    if (result.dynamicEntry) {
      dynamicRedirectEntries.push(result.dynamicEntry)
      registerRedirectEntries(redirectMaps, [result.dynamicEntry])
    }
    if (result.written) {
      written++
      console.log(`  wrote docs/${result.docId} (id=${result.processed.id})`)
    } else if (changedIds.has(rawRow.id)) {
      skipped++
    }
  }

  const redirectsAdded = appendRedirectsManifest(RS_REDIRECTS_PATH, dynamicRedirectEntries)
  if (redirectsAdded > 0) {
    console.log(`redirects manifest: added ${redirectsAdded} dynamic entries → ${RS_REDIRECTS_PATH}`)
  }

  const projectionDocs = await loadProjectionDocs(firestore, workingById)
  const collectionsMod = await import(
    pathToFileURL(path.join(root, 'src/lib/modx/collections.ts')).href
  )
  const { isListedDoc } = collectionsMod
  const listedDocs = projectionDocs.filter(isListedDoc)

  const collectionsWritten = await writeCollections(firestore, projectionDocs)
  const searchIndex = await buildAndUploadSearchIndex(firestore, projectionDocs)

  const idsForRelated = isFullSync
    ? new Set(listedDocs.map((d) => d.id).filter(Boolean))
    : changedIds
  const relatedUpdated = await updateRelatedCards(
    firestore,
    listedDocs,
    workingById,
    idsForRelated,
    collectionsMod
  )

  const purgePaths = [...changedIds]
    .map((id) => workingById.get(id)?.path)
    .filter((p) => typeof p === 'string' && p.length > 0)
  const purgeResult = await purgeNetlifyPaths(purgePaths)

  const newLastEdit = maxEditedon(changedRows, lastEdit)
  await firestore.collection('meta').doc(META_SYNC_DOC).set(
    {
      lastEdit: newLastEdit,
      syncedAt: new Date().toISOString(),
    },
    { merge: true }
  )

  console.log(
    `sync complete: wrote=${written}, skipped=${skipped}, redirectsAdded=${redirectsAdded}, collections=${collectionsWritten}, relatedCards=${relatedUpdated}, search v${searchIndex.version} (${searchIndex.articleCount} articles, ${searchIndex.recipeCount} recipes), purge=${purgeResult.skipped ? 'skipped' : purgeResult.ok ? `ok(${purgeResult.status})` : 'failed'}, lastEdit ${lastEdit} → ${newLastEdit}`
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
