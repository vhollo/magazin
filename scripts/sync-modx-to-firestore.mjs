/**
 * Incremental MODX → Firestore sync for magazine articles.
 *
 * 1. Read meta/sync.lastEdit
 * 2. SELECT rows with editedon > lastEdit (same filters as src/lib/modx/index.ts)
 * 2a. If MODX_FORCE_DOC_ID is set (save trigger), force-reprocess that doc even when
 *     editedon did not advance past lastEdit (so a single save always re-derives its tags)
 * 2b. SELECT magazine rows edited since lastEdit that are now unpublished/deleted → delete from Firestore
 * 3. Transform via src/lib/modx/transform.ts
 * 4. Upsert docs/{encodeDocPathId(path)}
 * 5. Recompute collections/{slug} (top 72 thin cards per tag query) and collections/home
 * 6. Build MiniSearch index, gzip-upload to Storage, update meta/search
 * 7. For magazine rows linked to Receptsarok (redirect match): set `free: true` on
 *    matching `recipes/{year}-{id}` + `recipes.json`; rebuild `collections/rs-home`
 *    (totalFree, freeCountsByCategory) via `sync:rs-collections:apply`
 * 8. Update meta/sync.lastEdit
 *
 * Usage:
 *   node scripts/sync-modx-to-firestore.mjs          # incremental
 *   node scripts/sync-modx-to-firestore.mjs --full   # one-time backfill (lastEdit ignored)
 *   node scripts/sync-modx-to-firestore.mjs --references-only  # backfill root weblink/reference redirects only
 *
 * Env: MODXDB_*, FIREBASE_ADMIN_KEY, FIREBASE_STORAGE_BUCKET, PUBLIC_BASE_URL (optional)
 * Optional: NETLIFY_SITE_ID, NETLIFY_ACCESS_TOKEN (edge-cache purge)
 */
import 'dotenv/config'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { drizzle } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'
import { eq, ne, desc, and, or, gt, gte, inArray } from 'drizzle-orm'
import {
  modx_site_content,
  modx_site_tmplvar_contentvalues,
  modx_site_htmlsnippets,
} from '../drizzle/schema.ts'
import { getFirestoreDb } from './lib/firebase-admin.mjs'
import { encodeDocPathId, decodeDocPathId } from './lib/doc-path-id.mjs'
import { buildAndUploadSearchIndex, changedListedPaths } from './lib/search-index.mjs'
import { updateRelatedCards } from './lib/related-cards.mjs'
import { emptyContentFolderPaths } from './lib/empty-folders.mjs'
import {
  loadProjectionDocsForSync,
  uploadProjectionSnapshot,
} from './lib/firestore-docs.mjs'
import { createReadCounter, formatReadCounts } from './lib/sync-read-counter.mjs'
import { purgeNetlifyPaths } from './lib/netlify-purge.mjs'
import {
  loadRecipesFromJson,
  resolveReceptsarokRedirect,
  isMagazineRecipeDoc,
} from './lib/receptsarok-redirect-match.mjs'
import {
  applyModxLinkedRecipeFreeFlags,
  parseReceptsarokRedirectPath,
} from './lib/receptsarok-modx-free-sync.mjs'
import {
  loadCategoryReviewMap,
  buildReceptsarokRecipeForDoc,
  persistCreatedRecipes,
  appendUncategorizedReview,
} from './lib/receptsarok-modx-create-sync.mjs'
import { predictRecipeCategory } from '../src/lib/receptsarokCategoryPredictor.js'
import {
  appendRedirectsManifest,
  registerRedirectEntries,
  loadRedirectsManifest,
} from './lib/receptsarok-redirects-manifest.mjs'
import {
  buildRecipeKeyByModxId,
  syncRecipeRelatedCards,
  relatedWriteIds,
  updateDocRelatedRecipes,
} from './lib/related-recipe-cards.mjs'
import { refreshReceptsarokRedirectsFromManifest } from './lib/refresh-receptsarok-redirects.mjs'
import { isMagazineCandidate, shouldSyncRow, referenceTargetIds } from './lib/magazine-scope.mjs'
import { parseModxSavePayload, classifyPayload } from './lib/modx-save-payload.mjs'

const isFullSync = process.argv.includes('--full')
const isReferencesOnly = process.argv.includes('--references-only')
const skipRsCollections = process.argv.includes('--skip-rs-collections')
const skipRedirectRefresh = process.argv.includes('--skip-redirect-refresh')
const isFromPayload = process.argv.includes('--from-payload') || !!process.env.MODX_SYNC_PAYLOAD

const COLLECTIONS_COLLECTION = 'collections'
const HOME_COLLECTION_ID = 'home'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || 'https://www.diabetes.hu/'
const RS_REDIRECTS_PATH = path.join(root, 'src/lib/data/receptsarok-redirects.json')
const RECIPES_JSON_PATH = path.join(root, 'src/lib/data/recipes.json')
const CATEGORY_REVIEW_PATH = path.join(root, 'scripts/data/magazin-recipe-category-review.json')
const META_SYNC_DOC = 'sync'

const forceModxDocId = (() => {
  const fromEnv = Number(process.env.MODX_FORCE_DOC_ID)
  return Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : 0
})()

const rootReferenceTypeFilter = or(
  eq(modx_site_content.type, 'reference'),
  eq(modx_site_content.type, 'weblink')
)

/** Published root weblink/reference rows with a numeric MODX target id. */
/** @param {typeof modx_site_content.$inferSelect[]} rows */
function syncableReferenceRows(rows) {
  return rows.filter((row) => shouldSyncRow(row))
}

/** @param {import('drizzle-orm/mysql2').MySql2Database} modxdb */
async function queryChangedReferenceRows(modxdb, lastEdit) {
  const rows = await modxdb
    .select()
    .from(modx_site_content)
    .where(
      and(
        gt(modx_site_content.editedon, lastEdit),
        eq(modx_site_content.deleted, 0),
        eq(modx_site_content.published, 1),
        eq(modx_site_content.parent, 0),
        rootReferenceTypeFilter
      )
    )
  return syncableReferenceRows(rows)
}

/** @param {import('drizzle-orm/mysql2').MySql2Database} modxdb */
async function queryAllReferenceRows(modxdb) {
  const rows = await modxdb
    .select()
    .from(modx_site_content)
    .where(
      and(
        eq(modx_site_content.deleted, 0),
        eq(modx_site_content.published, 1),
        eq(modx_site_content.parent, 0),
        rootReferenceTypeFilter
      )
    )
  return syncableReferenceRows(rows)
}

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

  const changedReferences = await queryChangedReferenceRows(modxdb, lastEdit)

  const byId = new Map()
  for (const row of [...newDocs, ...modxSiteHirek, ...changedReferences]) {
    byId.set(row.id, row)
  }
  return [...byId.values()]
}

/** Magazine rows edited since lastEdit that should no longer appear in Firestore. */
/** @param {import('drizzle-orm/mysql2').MySql2Database} modxdb */
async function queryRemovedRows(modxdb, lastEdit) {
  const rows = await modxdb
    .select()
    .from(modx_site_content)
    .where(
      and(
        // gte: catch unpublish saves that reuse the same editedon as a prior publish sync
        gte(modx_site_content.editedon, lastEdit),
        or(
          and(
            eq(modx_site_content.type, 'document'),
            or(
              eq(modx_site_content.id, 2797),
              eq(modx_site_content.parent, 1),
              and(
                ne(modx_site_content.parent, 1),
                or(eq(modx_site_content.template, 9), eq(modx_site_content.template, 13))
              )
            )
          ),
          and(eq(modx_site_content.parent, 0), rootReferenceTypeFilter)
        )
      )
    )

  return rows.filter((row) => isMagazineCandidate(row) && !shouldSyncRow(row))
}

/**
 * MODX save trigger passes a doc id. Re-evaluate that exact doc on every save so a
 * single save always reprocesses it (re-running the full transform, incl. the
 * path-based junior tagging) regardless of whether `editedon` advanced past
 * `lastEdit` — or classifies it for removal when it is no longer syncable.
 *
 * @param {import('drizzle-orm/mysql2').MySql2Database} modxdb
 * @param {number} modxDocId
 * @returns {Promise<{ reprocess: typeof modx_site_content.$inferSelect[], remove: typeof modx_site_content.$inferSelect[] }>}
 */
async function queryForcedRow(modxdb, modxDocId) {
  const empty = { reprocess: [], remove: [] }
  if (!Number.isFinite(modxDocId) || modxDocId <= 0) return empty

  const rows = await modxdb
    .select()
    .from(modx_site_content)
    .where(eq(modx_site_content.id, modxDocId))
    .limit(1)

  if (!rows.length) {
    console.warn(`forced sync: MODX id=${modxDocId} not found`)
    return empty
  }

  const row = rows[0]
  if (!isMagazineCandidate(row)) {
    console.log(`forced sync: id=${modxDocId} outside magazine scope — skip`)
    return empty
  }

  if (shouldSyncRow(row)) {
    console.log(
      `forced reprocess: id=${modxDocId} published=${row.published} editedon=${row.editedon}`
    )
    return { reprocess: [row], remove: [] }
  }

  console.log(
    `forced removal: id=${modxDocId} published=${row.published} deleted=${row.deleted} editedon=${row.editedon}`
  )
  return { reprocess: [], remove: [row] }
}

/** @param {typeof modx_site_content.$inferSelect[]} rows */
function mergeRowsById(...rowSets) {
  const byId = new Map()
  for (const rows of rowSets) {
    for (const row of rows) {
      byId.set(row.id, row)
    }
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

  const allReferences = await queryAllReferenceRows(modxdb)

  const byId = new Map()
  for (const row of [...newDocs, ...modxSiteHirek, ...allReferences]) {
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
  let queue = [
    ...initialRows.map((row) => row.parent).filter((parentId) => parentId > 0 && !byId.has(parentId)),
    ...referenceTargetIds(initialRows).filter((targetId) => !byId.has(targetId)),
  ]

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
 * Batch-load existing redirects for changed rows (one read per doc).
 *
 * @param {import('firebase-admin/firestore').Firestore} firestore
 * @param {Map<number, Record<string, unknown>>} workingById
 * @param {Set<number>} changedIds
 * @returns {Promise<{ map: Map<number, string>, reads: number }>}
 */
async function loadExistingRedirectsForChanged(firestore, workingById, changedIds) {
  /** @type {Map<number, string>} */
  const byModxId = new Map()
  /** @type {import('firebase-admin/firestore').DocumentReference[]} */
  const refs = []
  /** @type {number[]} */
  const ids = []

  for (const id of changedIds) {
    const cached = workingById.get(id)
    if (typeof cached?.redirect === 'string' && cached.redirect.trim()) {
      byModxId.set(id, cached.redirect.trim())
      continue
    }
    const pathValue = typeof cached?.path === 'string' ? cached.path.trim() : ''
    if (!pathValue) continue
    refs.push(firestore.collection('docs').doc(encodeDocPathId(pathValue)))
    ids.push(id)
  }

  if (refs.length === 0) return { map: byModxId, reads: 0 }

  const snaps = await firestore.getAll(...refs)
  for (let i = 0; i < snaps.length; i++) {
    const redirect = snaps[i].data()?.redirect
    if (typeof redirect === 'string' && redirect.trim()) {
      byModxId.set(ids[i], redirect.trim())
    }
  }
  return { map: byModxId, reads: snaps.length }
}

/**
 * @param {ReturnType<import('../src/lib/modx/transform.ts').createModxTransform>} modxTransform
 * @param {Record<string, unknown>} rawRow
 * @param {Set<number>} changedIds
 * @param {Map<number, Record<string, unknown>>} workingById
 * @param {ReturnType<import('../src/lib/modx/transform.ts').loadReceptsarokRedirectMaps>} redirectMaps
 * @param {import('firebase-admin/firestore').Firestore} firestore
 * @param {Record<string, unknown>[]} recipes
 * @param {Map<number, string>} existingRedirectsByModxId
 * @param {{ categoryByKey: Map<string,string>, predictCategory: Function, createdKeys: Set<string> } | null} [createState]
 */
async function processRow(
  modxTransform,
  rawRow,
  changedIds,
  workingById,
  redirectMaps,
  firestore,
  recipes,
  existingRedirectsByModxId,
  createState = null
) {
  const doc = structuredClone(rawRow)

  if (modxTransform.isReferenceDoc(doc)) {
    modxTransform.findPath(doc)
    modxTransform.setReferenceRedirect(doc)
    const processed = modxTransform.referenceDocFields(doc)
    workingById.set(doc.id, processed)

    if (!changedIds.has(doc.id)) {
      return { written: false, processed }
    }

    if (!processed.path) {
      console.warn(`skip write: reference id=${processed.id} has no path after transform`)
      return { written: false, processed }
    }
    if (!processed.redirect) {
      console.warn(
        `skip write: reference id=${processed.id} alias=${processed.alias} has no resolvable redirect`
      )
      return { written: false, processed }
    }

    const docId = encodeDocPathId(processed.path)
    await firestore.collection('docs').doc(docId).set(processed)
    console.log(`  reference id=${processed.id} → ${processed.redirect}`)

    let stalePaths = []
    let staleReads = 0
    if (!isFullSync) {
      const stale = await deleteStaleDocsForId(firestore, doc.id, docId)
      stalePaths = stale.paths
      staleReads = stale.reads
    }

    return {
      written: true,
      processed,
      docId,
      stalePaths,
      staleReads,
    }
  }

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
      : existingRedirectsByModxId.get(doc.id)

  const resolved = resolveReceptsarokRedirect(doc, redirectMaps, recipes, fallbackRedirect)

  // No existing Receptsarok match for a single-tag `recept` article → create a new
  // recipe from this doc (when its category resolves) and redirect to it. The recipe
  // is built here (pure — no writes) so the doc is written with its redirect in one
  // pass; the Firestore + recipes.json side-effects are batched after the row loop.
  let redirect = resolved.redirect
  let dynamicEntry = resolved.dynamicEntry
  let createdRecipe
  let uncategorizedEntry
  // Self-heal: a redirect can point at THIS doc's own recipe while that recipe is
  // missing from recipes.json — it reached Firestore but its recipes.json commit was
  // lost to a concurrent-sync push race, so re-saving otherwise short-circuits on the
  // stale redirect and never re-creates. Re-run create when the redirect targets the
  // doc's own slug and that recipe is absent, so recipes.json converges. (The
  // concurrency-safe push prevents new losses; this recovers already-orphaned ones.)
  let redirectToMissingOwnRecipe = false
  if (redirect) {
    const target = parseReceptsarokRedirectPath(redirect)
    if (
      target &&
      String(target.id) === String(doc.alias ?? '').trim() &&
      !recipes.some((r) => `${r.year}-${r.id}` === `${target.year}-${target.id}`)
    ) {
      redirectToMissingOwnRecipe = true
    }
  }
  if ((!redirect || redirectToMissingOwnRecipe) && changedIds.has(doc.id) && createState && isMagazineRecipeDoc(doc)) {
    const built = buildReceptsarokRecipeForDoc(doc, {
      recipes,
      categoryByKey: createState.categoryByKey,
      predictCategory: createState.predictCategory,
      createdKeys: createState.createdKeys,
    })
    if (built?.resolved) {
      redirect = built.redirect
      dynamicEntry = built.dynamicEntry
      createdRecipe = built.recipe
      createState.createdKeys.add(built.key)
      console.log(
        `  receptsarok create: id=${doc.id} → ${built.redirect} (category=${built.recipe.category})`
      )
    } else if (built?.uncategorized) {
      uncategorizedEntry = built.uncategorized
      console.log(
        `  receptsarok create deferred (no category): ${built.uncategorized.year}-${built.uncategorized.id} → magazin-recipe-category-review.json`
      )
    }
  }

  modxTransform.setReceptsarokRedirect(doc, redirect)
  const processed = modxTransform.docFields(doc)
  workingById.set(doc.id, processed)

  const redirectParsed = parseReceptsarokRedirectPath(redirect)
  const freeTarget = dynamicEntry
    ? {
        year: dynamicEntry.year,
        id: dynamicEntry.id,
        modxContentId: Number(doc.id),
      }
    : redirectParsed
      ? { ...redirectParsed, modxContentId: Number(doc.id) }
      : undefined

  if (!changedIds.has(doc.id)) {
    return { written: false, processed, dynamicEntry, freeTarget }
  }

  if (!processed.path) {
    console.warn(`skip write: id=${processed.id} has no path after transform`)
    return { written: false, processed }
  }

  const docId = encodeDocPathId(processed.path)
  await firestore.collection('docs').doc(docId).set(processed)

  // The doc-id is derived from the article path, so changing the alias writes a
  // new doc and orphans the old one — leaving two articles in the listings.
  // Drop any prior doc for this MODX id that now lives at a different path.
  // (Full sync handles the same case in deleteOrphanFirestoreDocs.)
  /** @type {string[]} */
  let stalePaths = []
  let staleReads = 0
  if (!isFullSync) {
    const stale = await deleteStaleDocsForId(firestore, doc.id, docId)
    stalePaths = stale.paths
    staleReads = stale.reads
  }

  if (resolved.dynamicEntry) {
    console.log(
      `  redirect id=${processed.id} → /receptsarok/${resolved.dynamicEntry.year}/${resolved.dynamicEntry.id} (dynamic match)`
    )
  }
  return {
    written: true,
    processed,
    docId,
    stalePaths,
    staleReads,
    dynamicEntry,
    freeTarget,
    createdRecipe,
    uncategorizedEntry,
  }
}

/**
 * @param {ReturnType<import('../src/lib/modx/transform.ts').createModxTransform>} modxTransform
 * @param {Record<string, unknown>} rawRow
 * @param {Map<number, Record<string, unknown>>} workingById
 */
function ensureRowInWorkingById(modxTransform, rawRow, workingById) {
  if (workingById.has(rawRow.id)) return
  const doc = structuredClone(rawRow)
  if (modxTransform.isReferenceDoc(doc)) {
    modxTransform.findPath(doc)
    modxTransform.setReferenceRedirect(doc)
    workingById.set(rawRow.id, modxTransform.referenceDocFields(doc))
    return
  }
  modxTransform.addTVs(doc)
  modxTransform.findPath(doc)
  if (doc.tv?.tags?.length > 0) modxTransform.extraTags(doc)
  workingById.set(rawRow.id, modxTransform.docFields(doc))
}

/**
 * @param {import('firebase-admin/firestore').Firestore} firestore
 * @param {ReturnType<import('../src/lib/modx/transform.ts').createModxTransform>} modxTransform
 * @param {typeof modx_site_content.$inferSelect[]} rowsToProcess
 * @param {Set<number>} removedIds
 * @param {Map<number, Record<string, unknown>>} workingById
 */
async function deleteRemovedDocs(firestore, modxTransform, rowsToProcess, removedIds, workingById) {
  let deleted = 0
  /** @type {string[]} */
  const paths = []

  for (const rawRow of rowsToProcess) {
    if (!removedIds.has(rawRow.id)) continue

    ensureRowInWorkingById(modxTransform, rawRow, workingById)
    const cached = workingById.get(rawRow.id)
    let pathToDelete =
      typeof cached?.path === 'string' && cached.path.trim() ? cached.path.trim() : null
    if (!pathToDelete) {
      pathToDelete = await findFirestorePathByModxId(firestore, rawRow.id)
    }
    if (!pathToDelete) {
      console.warn(`skip delete: id=${rawRow.id} has no resolvable path`)
      continue
    }

    const docId = encodeDocPathId(pathToDelete)
    const ref = firestore.collection('docs').doc(docId)
    const existing = await ref.get()
    if (existing.exists) {
      await ref.delete()
      deleted++
      console.log(`  deleted docs/${docId} (id=${rawRow.id})`)
    } else {
      console.log(`  drop projection/docs path (no Firestore doc): ${pathToDelete} (id=${rawRow.id})`)
    }
    paths.push(pathToDelete)
  }

  return { deleted, paths }
}

/**
 * @param {import('firebase-admin/firestore').Firestore} firestore
 * @param {number} modxId
 */
async function findFirestorePathByModxId(firestore, modxId) {
  const snap = await firestore.collection('docs').where('id', '==', modxId).limit(3).get()
  for (const docSnap of snap.docs) {
    const pathValue = docSnap.data()?.path
    if (typeof pathValue === 'string' && pathValue.trim()) return pathValue.trim()
    return decodeDocPathId(docSnap.id)
  }
  return null
}

/**
 * Delete any Firestore doc that maps to `modxId` but lives at a different
 * doc-id than `keepDocId` — the stale copy left behind when an article's alias
 * (and therefore its path / doc-id) changes. Returns the removed paths so the
 * caller can drop them from the projection, search index, and CDN cache.
 *
 * @param {import('firebase-admin/firestore').Firestore} firestore
 * @param {number} modxId
 * @param {string} keepDocId doc-id of the freshly-written canonical doc
 * @returns {Promise<{ paths: string[], reads: number }>}
 */
async function deleteStaleDocsForId(firestore, modxId, keepDocId) {
  const snap = await firestore.collection('docs').where('id', '==', modxId).get()
  /** @type {string[]} */
  const paths = []
  for (const docSnap of snap.docs) {
    if (docSnap.id === keepDocId) continue
    const pathValue = docSnap.data()?.path
    const stalePath =
      typeof pathValue === 'string' && pathValue.trim()
        ? pathValue.trim()
        : decodeDocPathId(docSnap.id)
    await docSnap.ref.delete()
    if (stalePath) paths.push(stalePath)
    console.log(`  deleted stale docs/${docSnap.id} (id=${modxId}, alias changed → docs/${keepDocId})`)
  }
  return { paths, reads: snap.size }
}

/**
 * On full backfill, drop Firestore docs whose MODX id is no longer in the
 * published set (orphans), plus stale copies left behind when an article's
 * alias changed (id still published, but the doc-id no longer matches the
 * freshly-synced path).
 *
 * @param {import('firebase-admin/firestore').Firestore} firestore
 * @param {Set<number>} syncedModxIds
 * @param {Map<number, Record<string, unknown>>} workingById
 */
async function deleteOrphanFirestoreDocs(firestore, syncedModxIds, workingById) {
  const snap = await firestore.collection('docs').select('id', 'path').get()
  let deleted = 0
  /** @type {string[]} */
  const paths = []

  for (const docSnap of snap.docs) {
    const data = docSnap.data()
    const modxId = Number(data.id)
    if (!Number.isFinite(modxId)) continue

    let reason = ''
    if (!syncedModxIds.has(modxId)) {
      reason = 'orphan'
    } else {
      const canonicalPath = workingById?.get(modxId)?.path
      if (
        typeof canonicalPath === 'string' &&
        canonicalPath.trim() &&
        encodeDocPathId(canonicalPath) !== docSnap.id
      ) {
        reason = 'alias changed'
      }
    }
    if (!reason) continue

    await docSnap.ref.delete()
    deleted++
    if (typeof data.path === 'string' && data.path.trim()) {
      paths.push(data.path.trim())
    }
    console.log(`  deleted ${reason} docs/${docSnap.id} (modx id=${modxId})`)
  }

  return { deleted, paths, reads: snap.size }
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
    expertDocs,
    isListedDoc,
    toThinCard,
    COLLECTION_LIMIT,
  } = collectionsMod

  const listedDocs = projectionDocs.filter(isListedDoc)

  // Drop empty-content container folders (post-alapjav `content` blank) — they admit
  // no real card. Non-empty folders (e.g. the diaeuro-futsal hub + year folders) stay.
  const emptyFolderPaths = await emptyContentFolderPaths(firestore, listedDocs)
  const collectionDocs = listedDocs.filter((d) => !(d.isfolder && emptyFolderPaths.has(d.path)))
  console.log(
    `collections: scanning ${collectionDocs.length}/${projectionDocs.length} docs ` +
      `(${listedDocs.length} listed − ${listedDocs.length - collectionDocs.length} empty folders), limit=${COLLECTION_LIMIT}`
  )

  const generatedAt = new Date().toISOString()
  const slugs = Object.keys(collectionQueries)
  let written = 0

  for (const slug of slugs) {
    const queryTags = collectionQueries[slug]
    // Admit content-tagged folders into every collection a tag of theirs matches
    // (e.g. the `diaeuro-futsal` hub + year folders), not just leaf articles.
    const matched = docsByTags(collectionDocs, queryTags, '0', { includeFolders: true })
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

  const homeCards = homeDocs(collectionDocs).map((doc) => toThinCard(doc))
  const expertCards = expertDocs(collectionDocs).map((doc) => toThinCard(doc))
  await firestore.collection(COLLECTIONS_COLLECTION).doc(HOME_COLLECTION_ID).set({
    slug: HOME_COLLECTION_ID,
    cards: homeCards,
    count: homeCards.length,
    expertCards,
    generatedAt,
  })
  written++
  console.log(
    `  wrote ${COLLECTIONS_COLLECTION}/${HOME_COLLECTION_ID} (${homeCards.length} cards, ${expertCards.length} expertCards)`
  )

  return written
}

async function main() {
  if (!isFromPayload) {
    for (const key of ['MODXDB_HOST', 'MODXDB_PORT', 'MODXDB_USER', 'MODXDB_DATABASE', 'MODXDB_PASSWORD']) {
      if (!process.env[key]) {
        throw new Error(`${key} is required`)
      }
    }
  }

  const { createModxTransform, loadReceptsarokRedirectMaps } = await import(
    pathToFileURL(path.join(root, 'src/lib/modx/transform.ts')).href
  )

  const firestore = getFirestoreDb()
  const readCounts = createReadCounter()

  let changedRows
  let removedRows = []
  let rowsToProcess
  let tmplvarContentvalues
  let modxSzerzok
  let lastEdit = 0

  if (isFromPayload) {
    // ── Payload path (no MySQL / cPanel needed) ──────────────────────────────
    const rawPayload = process.env.MODX_SYNC_PAYLOAD
    if (!rawPayload) {
      throw new Error('--from-payload requires MODX_SYNC_PAYLOAD env var (gzip+base64 JSON)')
    }
    console.log('payload mode: loading rows from MODX_SYNC_PAYLOAD (no MySQL)')
    const payload = await parseModxSavePayload(rawPayload)
    const classified = classifyPayload(payload)
    changedRows = classified.changedRows
    removedRows = classified.removedRows
    rowsToProcess = sortRowsByDepth(classified.rowsToProcess)
    tmplvarContentvalues = classified.tmplvarContentvalues
    modxSzerzok = classified.modxSzerzok
    console.log(
      `payload rows: changed=${changedRows.length}, removed=${removedRows.length}, total=${rowsToProcess.length}`
    )
  } else {
    // ── MySQL path (manual workflow_dispatch full / incremental) ─────────────
    lastEdit = isFullSync ? 0 : await readLastEdit(firestore)
    readCounts.meta += 1
    console.log(
      isFullSync
        ? 'full backfill (lastEdit forced to 0)'
        : `meta/${META_SYNC_DOC}.lastEdit = ${lastEdit}`
    )

    const connection = await mysql.createConnection({
      host: process.env.MODXDB_HOST,
      port: Number(process.env.MODXDB_PORT),
      user: process.env.MODXDB_USER,
      database: process.env.MODXDB_DATABASE,
      password: process.env.MODXDB_PASSWORD,
    })
    const modxdb = drizzle(connection)

    try {
      if (isReferencesOnly) {
        changedRows = await queryAllReferenceRows(modxdb)
        removedRows = []
        console.log(`references-only backfill: ${changedRows.length} root weblink/reference row(s)`)
      } else {
        changedRows = isFullSync
          ? await queryAllRows(modxdb)
          : await queryChangedRows(modxdb, lastEdit)
        if (!isFullSync) {
          removedRows = await queryRemovedRows(modxdb, lastEdit)
          if (forceModxDocId > 0) {
            const forced = await queryForcedRow(modxdb, forceModxDocId)
            if (forced.reprocess.length > 0) {
              changedRows = mergeRowsById(changedRows, forced.reprocess)
            }
            if (forced.remove.length > 0) {
              removedRows = mergeRowsById(removedRows, forced.remove)
            }
          }
        }
      }
    } catch (error) {
      await connection.end()
      throw error
    }

    console.log(
      `${isFullSync ? 'total' : 'changed'} MODX rows: ${changedRows.length}` +
        (isFullSync ? '' : `, removed candidates: ${removedRows.length}`) +
        (forceModxDocId > 0 ? `, forced doc id: ${forceModxDocId}` : '')
    )

    if (changedRows.length === 0 && removedRows.length === 0) {
      await connection.end()
      console.log('nothing to sync')
      return
    }

    rowsToProcess = sortRowsByDepth(
      await expandRowsWithAncestors(modxdb, [...changedRows, ...removedRows])
    )
    console.log(`rows to process (incl. ancestors): ${rowsToProcess.length}`)

    tmplvarContentvalues = isReferencesOnly
      ? []
      : await modxdb.select().from(modx_site_tmplvar_contentvalues)
    modxSzerzok = isReferencesOnly
      ? []
      : await modxdb
          .select()
          .from(modx_site_htmlsnippets)
          .where(eq(modx_site_htmlsnippets.category, 24))

    await connection.end()
  }

  if (changedRows.length === 0 && removedRows.length === 0) {
    console.log('nothing to sync from MODX')
    if (!skipRedirectRefresh) {
      const refresh = await refreshReceptsarokRedirectsFromManifest(firestore, RS_REDIRECTS_PATH, {
        apply: true,
      })
      if (refresh.updated > 0) {
        console.log(`redirect refresh: updated ${refresh.updated} doc(s)`)
        const purgePaths = [
          ...refresh.changedPaths.map((p) => `/${p}`),
          ...refresh.redirectPaths,
        ]
        await purgeNetlifyPaths(purgePaths)
      } else {
        console.log('redirect refresh: all manifest redirects already match Firestore')
      }
    }
    return
  }

  const changedIds = new Set(changedRows.map((row) => row.id))
  const removedIds = new Set(removedRows.map((row) => row.id))

  const redirectMaps = loadReceptsarokRedirectMaps(RS_REDIRECTS_PATH)
  const recipes = loadRecipesFromJson(RECIPES_JSON_PATH)
  /** @type {Map<number, Record<string, unknown>>} */
  const workingById = new Map()
  /** @type {object[]} */
  const dynamicRedirectEntries = []
  /** @type {{ year: number; id: string; modxContentId?: number }[]} */
  const modxLinkedFreeTargets = []
  /** @type {Record<string, unknown>[]} recipes created this run from `recept` docs with no RS match */
  const createdRecipes = []
  /** @type {{ year: number; id: string; title: string }[]} docs whose category could not be resolved */
  const uncategorizedEntries = []
  // Category resolution for sync-created recipes: manual overrides win over the predictor.
  const createState = {
    categoryByKey: loadCategoryReviewMap(CATEGORY_REVIEW_PATH),
    predictCategory: predictRecipeCategory,
    createdKeys: new Set(),
  }

  const modxTransform = createModxTransform({
    publicBaseUrl: PUBLIC_BASE_URL,
    tmplvarContentvalues,
    modxSzerzok,
    getEveryDocs: () => [...workingById.values()],
    redirectMaps,
    debugUnresolvedParents: process.env.SYNC_DEBUG_PATHS === '1',
  })

  let written = 0
  let skipped = 0
  let staleDeleted = 0
  /** @type {string[]} stale paths left behind by alias changes (incremental) */
  const renamedPaths = []

  // Ancestors / reference targets: path resolution only; never overlay changed/removed rows.
  for (const rawRow of rowsToProcess) {
    if (changedIds.has(rawRow.id) || removedIds.has(rawRow.id)) continue
    ensureRowInWorkingById(modxTransform, rawRow, workingById)
  }

  for (const rawRow of rowsToProcess) {
    if (changedIds.has(rawRow.id)) {
      ensureRowInWorkingById(modxTransform, rawRow, workingById)
    }
  }

  const { map: existingRedirectsByModxId, reads: redirectReads } =
    await loadExistingRedirectsForChanged(firestore, workingById, changedIds)
  readCounts.redirects += redirectReads

  for (const rawRow of rowsToProcess) {
    if (!changedIds.has(rawRow.id)) continue
    const result = await processRow(
      modxTransform,
      rawRow,
      changedIds,
      workingById,
      redirectMaps,
      firestore,
      recipes,
      existingRedirectsByModxId,
      createState
    )
    if (result.createdRecipe) {
      createdRecipes.push(result.createdRecipe)
    }
    if (result.uncategorizedEntry) {
      uncategorizedEntries.push(result.uncategorizedEntry)
    }
    if (result.dynamicEntry) {
      dynamicRedirectEntries.push(result.dynamicEntry)
      registerRedirectEntries(redirectMaps, [result.dynamicEntry])
    }
    if (result.freeTarget) {
      modxLinkedFreeTargets.push(result.freeTarget)
    }
    if (result.staleReads) readCounts.staleScan += result.staleReads
    if (result.stalePaths?.length) {
      renamedPaths.push(...result.stalePaths)
      staleDeleted += result.stalePaths.length
    }
    if (result.written) {
      written++
      if (!modxTransform.isReferenceDoc(rawRow)) {
        console.log(`  wrote docs/${result.docId} (id=${result.processed.id})`)
      }
    } else {
      skipped++
    }
  }

  if (isReferencesOnly) {
    /** @type {string[]} */
    const purgePaths = []
    for (const id of changedIds) {
      const doc = workingById.get(id)
      if (typeof doc?.path === 'string' && doc.path.length > 0) purgePaths.push(`/${doc.path}`)
      if (typeof doc?.redirect === 'string' && doc.redirect.length > 0) purgePaths.push(doc.redirect)
    }
    const purgeResult = await purgeNetlifyPaths(purgePaths)
    console.log(
      `references backfill complete: wrote=${written}, skipped=${skipped}, purge=${purgeResult.skipped ? 'skipped' : purgeResult.ok ? `ok(${purgeResult.status})` : 'failed'}`
    )
    return
  }

  let deleted = staleDeleted
  /** @type {string[]} */
  let deletedPaths = [...renamedPaths]
  if (removedRows.length > 0) {
    const removal = await deleteRemovedDocs(
      firestore,
      modxTransform,
      rowsToProcess,
      removedIds,
      workingById
    )
    deleted += removal.deleted
    deletedPaths = [...deletedPaths, ...removal.paths]
    for (const id of removedIds) {
      workingById.delete(id)
    }
  }

  if (isFullSync && changedRows.length > 0) {
    const syncedModxIds = new Set(changedRows.map((row) => row.id))
    const orphanRemoval = await deleteOrphanFirestoreDocs(firestore, syncedModxIds, workingById)
    readCounts.orphanScan = orphanRemoval.reads ?? 0
    deleted += orphanRemoval.deleted
    deletedPaths = [...deletedPaths, ...orphanRemoval.paths]
  }

  const redirectsAdded = appendRedirectsManifest(RS_REDIRECTS_PATH, dynamicRedirectEntries)
  if (redirectsAdded > 0) {
    console.log(`redirects manifest: added ${redirectsAdded} dynamic entries → ${RS_REDIRECTS_PATH}`)
  }

  const freeSync = await applyModxLinkedRecipeFreeFlags({
    recipes,
    targets: modxLinkedFreeTargets,
    recipesJsonPath: RECIPES_JSON_PATH,
    firestore,
    apply: true,
  })
  if (freeSync.updated > 0) {
    console.log(
      `receptsarok free: updated ${freeSync.updated} recipe(s) from MODX links → ${freeSync.keys.join(', ')}`
    )
  }

  // New Receptsarok recipes built from `recept` docs with no existing match: append
  // to `recipes` + write `recipes/{year}-{id}` + persist recipes.json. Category-
  // unresolved docs are queued in magazin-recipe-category-review.json (committed by
  // the workflow) for a human to categorise; no recipe/redirect until then.
  const createSync = await persistCreatedRecipes({
    createdRecipes,
    recipes,
    recipesJsonPath: RECIPES_JSON_PATH,
    firestore,
    apply: true,
  })
  if (createSync.created > 0) {
    console.log(`receptsarok create: added ${createSync.created} recipe(s) → ${createSync.keys.join(', ')}`)
  }
  const reviewSync = appendUncategorizedReview({
    uncategorized: uncategorizedEntries,
    categoryReviewPath: CATEGORY_REVIEW_PATH,
    apply: true,
  })
  if (reviewSync.added > 0) {
    console.log(
      `receptsarok create: queued ${reviewSync.added} doc(s) for category review → ${reviewSync.keys.join(', ')}`
    )
  }

  // rs-home free counts and rs-{category} cards derive from recipes.json — rebuild
  // whenever free flags changed OR a new recipe was created.
  if (freeSync.updated > 0 || createSync.created > 0) {
    if (!skipRsCollections) {
      console.log('  → rebuilding collections/rs-* (rs-home totals, freeCounts, category cards)…')
      const { spawnSync } = await import('node:child_process')
      const rsCollections = spawnSync('npm', ['run', 'sync:rs-collections:apply'], {
        cwd: root,
        stdio: 'inherit',
        env: process.env,
      })
      if (rsCollections.status !== 0) {
        throw new Error('sync:rs-collections:apply failed after receptsarok free/create update')
      }
    } else {
      console.log(
        '  → skipped rs-collections rebuild (--skip-rs-collections); run `npm run sync:rs-collections:apply` manually'
      )
    }
  }

  // Recipe `relatedCards` (curated link groups): recompute from each recipe's
  // own `linkedModxIds` and write changed recipes to recipes.json + Firestore.
  const manifestEntries = loadRedirectsManifest(RS_REDIRECTS_PATH).entries
  const relatedCardsSync = await syncRecipeRelatedCards({
    recipes,
    manifestEntries,
    recipesJsonPath: RECIPES_JSON_PATH,
    firestore,
    apply: true,
  })
  if (relatedCardsSync.updated > 0) {
    console.log(
      `receptsarok relatedCards: updated ${relatedCardsSync.updated} recipe(s) → ${relatedCardsSync.keys.join(', ')}`
    )
  }

  const projectionResult = await loadProjectionDocsForSync(
    firestore,
    workingById,
    deletedPaths,
    {
      fullRebuild: isFullSync,
      removedModxIds: removedIds,
      overlayIds: changedIds,
    }
  )
  const projectionDocs = projectionResult.docs
  readCounts.projection += projectionResult.reads.projection
  readCounts.meta += projectionResult.reads.meta

  await uploadProjectionSnapshot(firestore, projectionDocs)

  const collectionsMod = await import(
    pathToFileURL(path.join(root, 'src/lib/modx/collections.ts')).href
  )
  const { isListedDoc } = collectionsMod
  const listedDocs = projectionDocs.filter(isListedDoc)

  const collectionsWritten = await writeCollections(firestore, projectionDocs)

  const searchChangedPaths = changedListedPaths(workingById, changedIds, isListedDoc)
  const searchIndex = await buildAndUploadSearchIndex(firestore, projectionDocs, {
    changedPaths: searchChangedPaths,
    removedPaths: deletedPaths,
    fullRebuild: isFullSync || projectionResult.fullRebuild,
    preferRecipesJson: true,
  })
  if (searchIndex.reads) {
    readCounts.searchArticles += searchIndex.reads.searchArticles ?? 0
    readCounts.searchRecipes += searchIndex.reads.searchRecipes ?? 0
    readCounts.searchMeta += searchIndex.reads.searchMeta ?? 0
  }

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

  // Magazine `doc.related` (recipe link groups): for hubs/articles whose related
  // list is a set of Receptsarok recipes (e.g. cikkek/hypertonia/1601/nyari-gyumolcsok),
  // write the group's recipe keys. Resolved + rendered as recipe cards, and it
  // suppresses the tag-based "Kapcsolódó cikkek" grid on the page.
  const { publishedKeys, bySourceModxId } = buildRecipeKeyByModxId(recipes, manifestEntries)
  const docRelatedIds = relatedWriteIds({
    changedIds,
    projectionDocs,
    workingById,
    isFullSync,
  })
  const docRelatedUpdated = await updateDocRelatedRecipes({
    firestore,
    projectionDocs,
    workingById,
    idsToWrite: docRelatedIds,
    publishedKeys,
    bySourceModxId,
  })
  if (docRelatedUpdated > 0) {
    console.log(`doc.related (recipe groups): updated ${docRelatedUpdated} doc(s)`)
  }

  const purgePaths = [
    ...[...changedIds]
      .map((id) => workingById.get(id)?.path)
      .filter((p) => typeof p === 'string' && p.length > 0),
    ...deletedPaths,
  ]
  if (freeSync.updated > 0) {
    purgePaths.push('/receptsarok', '/keres')
    for (const key of freeSync.keys) {
      const [year, id] = key.split('/')
      if (year && id) purgePaths.push(`/receptsarok/${year}/${id}`)
    }
  }
  if (createSync.created > 0) {
    purgePaths.push('/receptsarok', '/keres')
    for (const { year, id } of createSync.entries) {
      purgePaths.push(`/receptsarok/${year}/${id}`)
    }
  }
  if (deleted > 0) {
    purgePaths.push('/', ...Object.keys(collectionsMod.collectionQueries))
  }

  let redirectRefreshUpdated = 0
  if (!skipRedirectRefresh) {
    const refresh = await refreshReceptsarokRedirectsFromManifest(firestore, RS_REDIRECTS_PATH, {
      apply: true,
    })
    readCounts.redirectRefresh = refresh.reads
    redirectRefreshUpdated = refresh.updated
    if (refresh.updated > 0) {
      console.log(
        `redirect refresh: updated ${refresh.updated} doc(s), missing ${refresh.missing} (manifest entries with no Firestore doc)`
      )
      for (const p of refresh.changedPaths) purgePaths.push(`/${p}`)
      for (const r of refresh.redirectPaths) purgePaths.push(r)
    }
  }

  const purgeResult = await purgeNetlifyPaths(purgePaths)

  let lastEditSummary = 'n/a (payload mode)'
  if (!isFromPayload) {
    const newLastEdit = maxEditedon([...changedRows, ...removedRows], lastEdit)
    await firestore.collection('meta').doc(META_SYNC_DOC).set(
      {
        lastEdit: newLastEdit,
        syncedAt: new Date().toISOString(),
      },
      { merge: true }
    )
    lastEditSummary = `${lastEdit} → ${newLastEdit}`
  }

  console.log(
    `sync complete: wrote=${written}, deleted=${deleted}, skipped=${skipped}, redirectsAdded=${redirectsAdded}, redirectRefresh=${redirectRefreshUpdated}, receptsarokFree=${freeSync.updated}, receptsarokCreated=${createSync.created}, receptsarokUncategorized=${reviewSync.added}, collections=${collectionsWritten}, relatedCards=${relatedUpdated}, search v${searchIndex.version} (${searchIndex.articleCount} articles, ${searchIndex.recipeCount} recipes), purge=${purgeResult.skipped ? 'skipped' : purgeResult.ok ? `ok(${purgeResult.status})` : 'failed'}, lastEdit ${lastEditSummary}, ${formatReadCounts(readCounts)}`
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
