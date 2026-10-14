/**
 * Date-driven publish / unpublish of magazine articles (MODX `pub_date` /
 * `unpub_date`, or the same two dates set in FireCMS).
 *
 * MODX Evolution flips `published` for these dates itself (DocumentParser
 * checkPublishStatus, on the next front-end request), but with a bare SQL UPDATE:
 * no plugin event fires and `editedon` does not change, so neither the save
 * payload nor the incremental MySQL sync ever sees the flip. This module keeps
 * the pending flips in Firestore and every sync run executes the ones that came due.
 *
 * Storage:
 *   meta/publishSchedule.entries   — the light list every sync reads (1 read):
 *                                    [{ id, action: 'publish'|'unpublish', at, title,
 *                                       source: 'modx'|'cms', modxAt?, override? }]
 *   scheduledPublish/{modxId}      — for a pending publish only, read only when due:
 *                                    either the article's MODX rows (doc + ancestors)
 *                                    and TVs (same shape as the MODX save payload, so
 *                                    the publish can run MySQL-free), or — for an
 *                                    article the CMS took off the site — its `docs/*`
 *                                    document. gzip+base64 JSON.
 *   docs/{path}.pubDate / .unpubDate — the article's effective dates (Timestamp),
 *                                    written by every sync; editable in FireCMS.
 *   docs/{path}.cmsOverride        — ['pubDate' | 'unpubDate'] the CMS set (FireCMS
 *                                    onPreSave keeps it); those values beat MODX's.
 *
 * Rules (one planner for every sync mode):
 *   - Row (after CMS overrides) unpublished with a future `pub_date` → it stays off
 *     the site (normal removal) and a `publish` entry + row snapshot are stored.
 *   - Synced row with a future `unpub_date` → `unpublish` entry.
 *   - Any other state of a row seen in the run clears that row's entries, so the
 *     current state always wins over an older entry.
 *   - CMS edit of a live article (no MODX row in the run): future `pubDate` → the doc
 *     is taken off the site, stored as a doc snapshot, and comes back at that time;
 *     past `pubDate` → only `publishedon` changes; `unpubDate` → `unpublish` entry
 *     (past → removed now). Clearing a CMS date restores the MODX one.
 *   - Due `publish`  → the snapshot is synced as published (publishedon = pub_date).
 *   - Due `unpublish` → the Firestore doc is deleted by MODX id.
 */

import zlib from 'node:zlib'
import { promisify } from 'node:util'
import { Timestamp } from 'firebase-admin/firestore'
import { isMagazineCandidate, shouldSyncRow, referenceTargetIds } from './magazine-scope.mjs'

const gzip = promisify(zlib.gzip)
const gunzip = promisify(zlib.gunzip)

const SCHEDULE_COLLECTION = 'meta'
const SCHEDULE_DOC = 'publishSchedule'
const SNAPSHOT_COLLECTION = 'scheduledPublish'
/** FireCMS field names; `cmsOverride` lists the ones the CMS owns. */
const OVERRIDE_FIELDS = /** @type {const} */ (['pubDate', 'unpubDate'])

/**
 * @typedef {'publish' | 'unpublish'} ScheduleAction
 * @typedef {{ pubDate?: number, unpubDate?: number }} ScheduleOverride  MODX-clock seconds
 * @typedef {{ id: number, action: ScheduleAction, at: number, title?: string, source?: 'modx' | 'cms', modxAt?: number, override?: ScheduleOverride }} ScheduleEntry
 * @typedef {{ entries: Map<string, ScheduleEntry> }} PublishSchedule
 * @typedef {{ id: number, docId: string, data: Record<string, unknown>, override: ScheduleOverride }} LiveOverride
 */

/** @param {ScheduleAction} action @param {number} id */
function entryKey(action, id) {
  return `${action}:${id}`
}

/** @param {unknown} value */
function toInt(value) {
  const n = Number(value)
  return Number.isFinite(n) ? Math.trunc(n) : 0
}

function offsetSeconds() {
  return toInt(process.env.MODX_SERVER_OFFSET_TIME)
}

/**
 * MODX "now" in the same clock as `pub_date` / `unpub_date`: Evolution compares
 * them with `time() + server_offset_time` (system setting, 0 on diabetes.hu).
 * Override with MODX_SERVER_OFFSET_TIME (seconds) if that setting changes.
 */
export function modxNowSeconds() {
  return Math.floor(Date.now() / 1000) + offsetSeconds()
}

/** @param {number} seconds MODX clock */
export function formatModxTime(seconds) {
  return new Date((seconds - offsetSeconds()) * 1000).toISOString().replace('.000Z', 'Z')
}

/** @param {number} seconds MODX clock → Firestore Timestamp (real UTC) */
function toTimestamp(seconds) {
  return seconds > 0 ? Timestamp.fromMillis((seconds - offsetSeconds()) * 1000) : null
}

/** @param {unknown} value Timestamp | Date → MODX-clock seconds, else 0 */
function fromTimestamp(value) {
  let ms = NaN
  if (value instanceof Timestamp) ms = value.toMillis()
  else if (value instanceof Date) ms = value.getTime()
  return Number.isFinite(ms) ? Math.floor(ms / 1000) + offsetSeconds() : 0
}

/**
 * Unpublished magazine row whose `pub_date` is still ahead and which would be
 * synced once published (and is not set to expire before it would appear).
 *
 * @param {Record<string, unknown>} row
 * @param {number} now
 */
export function isFuturePublishRow(row, now) {
  if (!isMagazineCandidate(row)) return false
  if (toInt(row.deleted) !== 0 || toInt(row.published) !== 0) return false
  const pubDate = toInt(row.pub_date)
  if (pubDate <= now) return false
  const unpubDate = toInt(row.unpub_date)
  if (unpubDate !== 0 && unpubDate <= pubDate) return false
  return shouldSyncRow({ ...row, published: 1 })
}

// ── Storage ──────────────────────────────────────────────────────────────────

/** @param {import('firebase-admin/firestore').Firestore} firestore */
function scheduleRef(firestore) {
  return firestore.collection(SCHEDULE_COLLECTION).doc(SCHEDULE_DOC)
}

/** @param {unknown} raw @returns {ScheduleOverride | undefined} */
function parseOverride(raw) {
  if (!raw || typeof raw !== 'object') return undefined
  /** @type {ScheduleOverride} */
  const out = {}
  for (const field of OVERRIDE_FIELDS) {
    const v = toInt(/** @type {Record<string, unknown>} */ (raw)[field])
    if (v > 0) out[field] = v
  }
  return Object.keys(out).length ? out : undefined
}

/** @param {unknown} raw @returns {Map<string, ScheduleEntry>} */
function parseEntries(raw) {
  /** @type {Map<string, ScheduleEntry>} */
  const entries = new Map()
  if (!Array.isArray(raw)) return entries
  for (const item of raw) {
    const id = toInt(item?.id)
    const at = toInt(item?.at)
    const action = item?.action
    if (id <= 0 || at <= 0 || (action !== 'publish' && action !== 'unpublish')) continue
    const override = parseOverride(item.override)
    entries.set(entryKey(action, id), {
      id,
      action,
      at,
      ...(typeof item.title === 'string' && item.title ? { title: item.title } : {}),
      source: item.source === 'cms' ? 'cms' : 'modx',
      ...(toInt(item.modxAt) > 0 ? { modxAt: toInt(item.modxAt) } : {}),
      ...(override ? { override } : {}),
    })
  }
  return entries
}

/** @param {Map<string, ScheduleEntry>} entries */
function serialiseEntries(entries) {
  return [...entries.values()].sort((a, b) => a.at - b.at || a.id - b.id)
}

/**
 * @param {import('firebase-admin/firestore').Firestore} firestore
 * @returns {Promise<PublishSchedule>}
 */
export async function loadPublishSchedule(firestore) {
  const snap = await scheduleRef(firestore).get()
  return { entries: parseEntries(snap.exists ? snap.get('entries') : null) }
}

/**
 * Live articles whose dates were set in FireCMS (`cmsOverride` non-empty). One
 * query; it bills one read per matching doc (min. 1).
 *
 * @param {import('firebase-admin/firestore').Firestore} firestore
 * @returns {Promise<{ live: Map<number, LiveOverride>, reads: number }>}
 */
export async function loadCmsOverrides(firestore) {
  const snap = await firestore
    .collection('docs')
    .where('cmsOverride', 'array-contains-any', [...OVERRIDE_FIELDS])
    .get()
  /** @type {Map<number, LiveOverride>} */
  const live = new Map()
  for (const docSnap of snap.docs) {
    const data = docSnap.data()
    const id = toInt(data.id)
    if (id <= 0) continue
    const owned = Array.isArray(data.cmsOverride) ? data.cmsOverride : []
    /** @type {ScheduleOverride} */
    const override = {}
    for (const field of OVERRIDE_FIELDS) {
      const at = fromTimestamp(data[field])
      if (owned.includes(field) && at > 0) override[field] = at
    }
    live.set(id, { id, docId: docSnap.id, data, override })
  }
  return { live, reads: Math.max(1, snap.size) }
}

/**
 * All CMS overrides known to this run: live docs, plus the ones parked in the
 * `publish` entry of an article that is off the site until its CMS publish time.
 *
 * @param {Map<number, LiveOverride>} live
 * @param {PublishSchedule | null} schedule
 * @returns {Map<number, ScheduleOverride>}
 */
export function buildOverrides(live, schedule) {
  /** @type {Map<number, ScheduleOverride>} */
  const out = new Map()
  for (const entry of schedule?.entries.values() ?? []) {
    if (entry.action === 'publish' && entry.override) out.set(entry.id, entry.override)
  }
  for (const [id, item] of live) {
    if (Object.keys(item.override).length) out.set(id, item.override)
  }
  return out
}

/**
 * Apply CMS dates to MODX rows the way a MODX save with those dates would: a
 * future publish date or a passed unpublish date makes the row unpublished. The
 * CMS publish date also becomes `publishedon`. The MODX values are kept in
 * `modx_pub_date` / `modx_unpub_date`.
 *
 * @template {Record<string, unknown>} R
 * @param {R[]} rows
 * @param {Map<number, ScheduleOverride>} overrides
 * @param {number} now
 * @returns {R[]}
 */
export function applyOverridesToRows(rows, overrides, now) {
  if (!overrides.size) return rows
  return rows.map((row) => {
    const ov = overrides.get(toInt(row.id))
    if (!ov) return row
    const out = { ...row, modx_pub_date: row.pub_date, modx_unpub_date: row.unpub_date }
    if (ov.pubDate !== undefined) {
      out.pub_date = ov.pubDate
      out.publishedon = ov.pubDate
      if (ov.pubDate > now) out.published = 0
    }
    if (ov.unpubDate !== undefined) {
      out.unpub_date = ov.unpubDate
      if (ov.unpubDate <= now) out.published = 0
    }
    return out
  })
}

/**
 * Schedule fields of the `docs/*` doc written for `row` (after overrides): the
 * effective dates as Timestamps, and `cmsOverride` while the CMS owns one.
 *
 * @param {Record<string, unknown>} row
 * @param {ScheduleOverride | undefined} override
 */
export function scheduleDocFields(row, override) {
  const owned = override ? OVERRIDE_FIELDS.filter((f) => override[f] !== undefined) : []
  return {
    pubDate: toTimestamp(toInt(row.pub_date)),
    unpubDate: toTimestamp(toInt(row.unpub_date)),
    ...(owned.length ? { cmsOverride: owned } : {}),
  }
}

/** @param {PublishSchedule} schedule */
export function describeSchedule(schedule) {
  const list = serialiseEntries(schedule.entries)
  if (!list.length) return 'publish schedule: empty'
  const next = list[0]
  return (
    `publish schedule: ${list.length} entr${list.length === 1 ? 'y' : 'ies'},` +
    ` next ${next.action} id=${next.id} at ${formatModxTime(next.at)} (${next.source ?? 'modx'})`
  )
}

/**
 * Entries whose time has come, split by action.
 *
 * @param {PublishSchedule} schedule
 * @param {number} now
 */
export function dueEntries(schedule, now) {
  /** @type {ScheduleEntry[]} */
  const publish = []
  /** @type {ScheduleEntry[]} */
  const unpublish = []
  for (const entry of schedule.entries.values()) {
    if (entry.at > now) continue
    ;(entry.action === 'publish' ? publish : unpublish).push(entry)
  }
  return { publish, unpublish }
}

// Firestore Timestamps survive the JSON snapshot as { __ts: millis }. Converted
// up front (not in a JSON replacer): Timestamp.toJSON would run before a replacer.
/** @param {unknown} value @returns {unknown} */
function encodeTimestamps(value) {
  if (value instanceof Timestamp) return { __ts: value.toMillis() }
  if (Array.isArray(value)) return value.map(encodeTimestamps)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, encodeTimestamps(v)]))
  }
  return value
}
/** @param {string} _key @param {unknown} value */
function snapshotReviver(_key, value) {
  if (value && typeof value === 'object' && typeof value.__ts === 'number' && Object.keys(value).length === 1) {
    return Timestamp.fromMillis(value.__ts)
  }
  return value
}

/**
 * Load the snapshots of due `publish` entries. A row snapshot becomes the row
 * MODX itself would produce when it publishes the article (`published = 1`,
 * `publishedon = pub_date`; Evolution keeps `pub_date`); a doc snapshot (article
 * the CMS took off the site) becomes the doc to write back.
 *
 * @param {import('firebase-admin/firestore').Firestore} firestore
 * @param {ScheduleEntry[]} entries
 * @param {number} now
 */
export async function loadDuePublishRows(firestore, entries, now) {
  /** @type {Record<string, unknown>[]} */
  const rows = []
  /** @type {Record<string, unknown>[]} */
  const extraRows = []
  /** @type {Record<string, unknown>[]} */
  const tvs = []
  /** @type {{ id: number, data: Record<string, unknown> }[]} */
  const restoredDocs = []
  /** @type {number[]} */
  const expiredIds = []
  /** @type {number[]} */
  const missingIds = []
  let reads = 0

  for (const entry of entries) {
    const snap = await firestore.collection(SNAPSHOT_COLLECTION).doc(String(entry.id)).get()
    reads++
    const payload = snap.exists ? snap.get('payload') : null
    if (typeof payload !== 'string' || !payload) {
      console.warn(`  scheduled publish id=${entry.id}: no snapshot in ${SNAPSHOT_COLLECTION}/ — dropped`)
      missingIds.push(entry.id)
      continue
    }
    const parsed = JSON.parse(
      (await gunzip(Buffer.from(payload, 'base64'))).toString('utf8'),
      snapshotReviver
    )

    if (parsed?.doc && typeof parsed.doc === 'object') {
      const unpubDate = entry.override?.unpubDate ?? fromTimestamp(parsed.doc.unpubDate)
      if (unpubDate !== 0 && unpubDate <= now) {
        console.log(
          `  scheduled publish id=${entry.id}: unpublish time ${formatModxTime(unpubDate)} already passed — not published`
        )
        expiredIds.push(entry.id)
        continue
      }
      restoredDocs.push({
        id: entry.id,
        data: { ...parsed.doc, publishedon: entry.at, pubDate: toTimestamp(entry.at) },
      })
      console.log(
        `  scheduled publish due: id=${entry.id} "${parsed.doc.title ?? ''}" (CMS, ${formatModxTime(entry.at)})`
      )
      continue
    }

    const snapshotRows = Array.isArray(parsed?.rows) ? parsed.rows : []
    const target = snapshotRows.find((row) => toInt(row?.id) === entry.id)
    if (!target) {
      console.warn(`  scheduled publish id=${entry.id}: snapshot has no row for the id — dropped`)
      missingIds.push(entry.id)
      continue
    }
    const unpubDate = toInt(target.unpub_date)
    if (unpubDate !== 0 && unpubDate <= now) {
      console.log(
        `  scheduled publish id=${entry.id}: unpub_date ${formatModxTime(unpubDate)} already passed — not published`
      )
      expiredIds.push(entry.id)
      continue
    }
    const pubDate = toInt(target.pub_date) || entry.at
    rows.push({ ...target, published: 1, publishedon: pubDate })
    for (const row of snapshotRows) {
      if (toInt(row?.id) !== entry.id) extraRows.push(row)
    }
    if (Array.isArray(parsed?.tvs)) tvs.push(...parsed.tvs)
    console.log(
      `  scheduled publish due: id=${entry.id} "${target.pagetitle ?? ''}" (pub_date ${formatModxTime(pubDate)})`
    )
  }

  return { rows, extraRows, tvs, restoredDocs, expiredIds, missingIds, reads }
}

/**
 * Append TV rows that are not already present (same tmplvarid + contentid).
 *
 * @param {Record<string, unknown>[]} base
 * @param {Record<string, unknown>[]} extra
 */
export function mergeTvRows(base, extra) {
  if (!extra.length) return base
  const seen = new Set(base.map((tv) => `${tv.tmplvarid}:${tv.contentid}`))
  const out = [...base]
  for (const tv of extra) {
    const key = `${tv.tmplvarid}:${tv.contentid}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(tv)
  }
  return out
}

/**
 * Rows the transform needs to sync `row` later on its own: the row, its ancestor
 * chain and — for a root weblink — the target doc with its ancestors.
 *
 * @param {Record<string, unknown>} row
 * @param {Map<number, Record<string, unknown>>} rowsById
 */
function snapshotRowsFor(row, rowsById) {
  /** @type {Map<number, Record<string, unknown>>} */
  const out = new Map([[toInt(row.id), row]])
  const queue = [toInt(row.parent), ...referenceTargetIds([row])]
  while (queue.length) {
    const id = queue.shift()
    if (!id || out.has(id)) continue
    const found = rowsById.get(id)
    if (!found) continue
    out.set(id, found)
    queue.push(toInt(found.parent))
  }
  return [...out.values()]
}

/**
 * `unpublish` entry for a live article, or null when it has no future date.
 *
 * @param {number} id
 * @param {number} at
 * @param {string} title
 * @param {boolean} fromCms
 * @param {number} modxAt MODX's own unpublish date (kept so clearing the CMS one restores it)
 * @returns {ScheduleEntry}
 */
function unpublishEntry(id, at, title, fromCms, modxAt) {
  return {
    id,
    action: 'unpublish',
    at,
    title,
    source: fromCms ? 'cms' : 'modx',
    ...(fromCms && modxAt > 0 ? { modxAt } : {}),
  }
}

/**
 * CMS edits of live articles that no MODX row in this run carries. Returns the
 * schedule changes plus the content actions they need now: docs to take off the
 * site (`removeIds`, with a doc snapshot) and docs to rewrite (`docWrites`).
 *
 * @param {{ live: Map<number, LiveOverride>, schedule: PublishSchedule, now: number, skipIds: Set<number> }} input
 */
export function reconcileCmsOverrides({ live, schedule, now, skipIds }) {
  /** @type {ScheduleEntry[]} */
  const set = []
  /** @type {{ action: ScheduleAction, id: number }[]} */
  const remove = []
  /** @type {Map<number, { doc: Record<string, unknown> }>} */
  const snapshots = new Map()
  /** @type {number[]} */
  const removeIds = []
  /** @type {{ id: number, data: Record<string, unknown> }[]} */
  const docWrites = []

  for (const [id, item] of live) {
    if (skipIds.has(id)) continue
    const { override: ov, data } = item
    const title = String(data.title ?? '')

    if (ov.pubDate !== undefined && ov.pubDate > now) {
      console.log(`  CMS publish time ahead: id=${id} "${title}" off the site until ${formatModxTime(ov.pubDate)}`)
      removeIds.push(id)
      snapshots.set(id, { doc: data })
      set.push({ id, action: 'publish', at: ov.pubDate, title, source: 'cms', override: ov })
      continue
    }

    if (ov.unpubDate !== undefined && ov.unpubDate <= now) {
      console.log(`  CMS unpublish time passed: id=${id} "${title}" (${formatModxTime(ov.unpubDate)})`)
      removeIds.push(id)
      continue
    }

    if (ov.pubDate !== undefined && toInt(data.publishedon) !== ov.pubDate) {
      docWrites.push({ id, data: { ...data, publishedon: ov.pubDate } })
    }

    if (ov.unpubDate !== undefined) {
      const existing = schedule.entries.get(entryKey('unpublish', id))
      const modxAt =
        existing?.source === 'cms' ? toInt(existing.modxAt) : existing ? existing.at : 0
      set.push(unpublishEntry(id, ov.unpubDate, title, true, modxAt))
    }
  }

  // A CMS unpublish date that is no longer on its doc was cleared in the CMS:
  // MODX's own date (kept as modxAt) applies again.
  for (const entry of schedule.entries.values()) {
    if (entry.action !== 'unpublish' || entry.source !== 'cms') continue
    if (skipIds.has(entry.id)) continue
    if (live.get(entry.id)?.override.unpubDate !== undefined) continue
    const modxAt = toInt(entry.modxAt)
    if (modxAt > now) set.push(unpublishEntry(entry.id, modxAt, entry.title ?? '', false, 0))
    else remove.push({ action: 'unpublish', id: entry.id })
  }

  return { set, remove, snapshots, removeIds, docWrites }
}

/** @returns {ReturnType<typeof reconcileCmsOverrides>} */
export function emptyReconcile() {
  return { set: [], remove: [], snapshots: new Map(), removeIds: [], docWrites: [] }
}

/**
 * Work out the schedule changes for the rows this run classified.
 *
 * @param {{
 *   now: number,
 *   changedRows: Record<string, unknown>[],
 *   removedRows: Record<string, unknown>[],
 *   removedModxIds: number[],
 *   rowsToProcess: Record<string, unknown>[],
 *   tvs: Record<string, unknown>[],
 *   overrides?: Map<number, ScheduleOverride>,
 *   restoredDocs?: { id: number, data: Record<string, unknown> }[],
 *   executed: ScheduleEntry[],
 *   droppedPublishIds: number[],
 *   reconcile?: ReturnType<typeof reconcileCmsOverrides>,
 *   rebuild?: boolean,
 * }} input
 *   `executed` = due entries carried out this run; `droppedPublishIds` = due
 *   publish entries that could not run (expired / no snapshot); `restoredDocs` =
 *   articles the CMS had taken off and this run put back; `reconcile` = CMS edits
 *   of live articles; `rebuild` (full sync) drops every entry this run did not
 *   re-derive.
 * @returns {{ set: ScheduleEntry[], remove: { action: ScheduleAction, id: number }[], snapshots: Map<number, object>, rebuild: boolean }}
 */
export function planScheduleUpdates(input) {
  const { now, changedRows, removedRows, removedModxIds, rowsToProcess, tvs } = input
  const overrides = input.overrides ?? new Map()
  /** @type {ScheduleEntry[]} */
  const set = []
  /** @type {{ action: ScheduleAction, id: number }[]} */
  const remove = []
  /** @type {Map<number, object>} */
  const snapshots = new Map()
  const rowsById = new Map(rowsToProcess.map((row) => [toInt(row.id), row]))

  for (const entry of input.executed) remove.push({ action: entry.action, id: entry.id })
  for (const id of input.droppedPublishIds) remove.push({ action: 'publish', id })
  for (const id of removedModxIds) {
    remove.push({ action: 'publish', id }, { action: 'unpublish', id })
  }

  for (const row of changedRows) {
    const id = toInt(row.id)
    remove.push({ action: 'publish', id })
    const unpubDate = toInt(row.unpub_date)
    if (unpubDate > now) {
      const fromCms = overrides.get(id)?.unpubDate !== undefined
      set.push(
        unpublishEntry(id, unpubDate, String(row.pagetitle ?? ''), fromCms, toInt(row.modx_unpub_date))
      )
    } else {
      remove.push({ action: 'unpublish', id })
    }
  }

  for (const doc of input.restoredDocs ?? []) {
    const ov = overrides.get(doc.id)
    const unpubDate = ov?.unpubDate ?? fromTimestamp(doc.data.unpubDate)
    if (unpubDate > now) {
      set.push(unpublishEntry(doc.id, unpubDate, String(doc.data.title ?? ''), ov?.unpubDate !== undefined, 0))
    }
  }

  for (const row of removedRows) {
    const id = toInt(row.id)
    remove.push({ action: 'unpublish', id })
    if (!isFuturePublishRow(row, now)) {
      remove.push({ action: 'publish', id })
      continue
    }
    const rows = snapshotRowsFor(row, rowsById)
    const contentIds = new Set(rows.map((r) => toInt(r.id)))
    snapshots.set(id, { rows, tvs: tvs.filter((tv) => contentIds.has(toInt(tv.contentid))) })
    const ov = overrides.get(id)
    set.push({
      id,
      action: 'publish',
      at: toInt(row.pub_date),
      title: String(row.pagetitle ?? ''),
      source: ov?.pubDate !== undefined ? 'cms' : 'modx',
      ...(ov ? { override: ov } : {}),
    })
  }

  // CMS edits of live articles go last, so their sets win over the generic removals.
  const reconcile = input.reconcile ?? emptyReconcile()
  remove.push(...reconcile.remove)
  set.push(...reconcile.set)
  for (const [id, snapshot] of reconcile.snapshots) snapshots.set(id, snapshot)

  return { set, remove, snapshots, rebuild: !!input.rebuild }
}

/**
 * @param {Map<string, ScheduleEntry>} entries
 * @param {ReturnType<typeof planScheduleUpdates>} plan
 */
function applyPlan(entries, plan) {
  /** @type {Map<string, ScheduleEntry>} */
  const next = plan.rebuild ? new Map() : new Map(entries)
  // Removals first: a set for the same key in this run (re-derived) wins.
  for (const { action, id } of plan.remove) next.delete(entryKey(action, id))
  for (const entry of plan.set) next.set(entryKey(entry.action, entry.id), entry)
  return next
}

/** @param {ScheduleEntry} entry */
function entrySignature(entry) {
  return JSON.stringify([entry.at, entry.title ?? '', entry.source ?? 'modx', entry.modxAt ?? 0, entry.override ?? null])
}

/** @param {Map<string, ScheduleEntry>} a @param {Map<string, ScheduleEntry>} b */
function sameEntries(a, b) {
  if (a.size !== b.size) return false
  for (const [key, entry] of a) {
    const other = b.get(key)
    if (!other || entrySignature(other) !== entrySignature(entry)) return false
  }
  return true
}

/**
 * Write the plan: snapshots for new/updated publish entries, then the list
 * itself in a transaction (re-read, so a concurrent manual + save run cannot
 * drop each other's entries), then delete snapshots no longer referenced.
 * Nothing is written when the list and snapshots are unchanged.
 *
 * @param {import('firebase-admin/firestore').Firestore} firestore
 * @param {PublishSchedule} loaded schedule as read at the start of the run
 * @param {ReturnType<typeof planScheduleUpdates>} plan
 * @returns {Promise<{ written: boolean, entries: number, snapshotsWritten: number, snapshotsDeleted: number }>}
 */
export async function commitScheduleUpdates(firestore, loaded, plan) {
  let snapshotsWritten = 0
  for (const [id, snapshot] of plan.snapshots) {
    const json = JSON.stringify(encodeTimestamps(snapshot))
    const payload = (await gzip(Buffer.from(json, 'utf8'))).toString('base64')
    await firestore
      .collection(SNAPSHOT_COLLECTION)
      .doc(String(id))
      .set({ id, payload, savedAt: new Date().toISOString() })
    snapshotsWritten++
  }

  const expected = applyPlan(loaded.entries, plan)
  if (sameEntries(loaded.entries, expected) && snapshotsWritten === 0) {
    return { written: false, entries: expected.size, snapshotsWritten, snapshotsDeleted: 0 }
  }

  const ref = scheduleRef(firestore)
  const committed = await firestore.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const current = parseEntries(snap.exists ? snap.get('entries') : null)
    const next = applyPlan(current, plan)
    tx.set(ref, { entries: serialiseEntries(next), updatedAt: new Date().toISOString() })
    return { before: current, after: next }
  })

  let snapshotsDeleted = 0
  for (const [key, entry] of committed.before) {
    if (entry.action !== 'publish' || committed.after.has(key)) continue
    await firestore.collection(SNAPSHOT_COLLECTION).doc(String(entry.id)).delete()
    snapshotsDeleted++
  }

  for (const entry of plan.set) {
    const before = committed.before.get(entryKey(entry.action, entry.id))
    if (!before || entrySignature(before) !== entrySignature(entry)) {
      console.log(
        `  scheduled ${entry.action}: id=${entry.id} "${entry.title ?? ''}" at ${formatModxTime(entry.at)} (${entry.source ?? 'modx'})`
      )
    }
  }

  return { written: true, entries: committed.after.size, snapshotsWritten, snapshotsDeleted }
}
