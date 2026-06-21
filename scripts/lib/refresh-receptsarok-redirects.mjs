import { loadRedirectsManifest } from './receptsarok-redirects-manifest.mjs'
import { encodeDocPathId } from './doc-path-id.mjs'

/** @param {object} entry */
export function redirectPathForManifestEntry(entry) {
  const year = Number(entry?.year)
  const id = String(entry?.id ?? '').trim()
  if (!Number.isFinite(year) || !id) return null
  return `/receptsarok/${year}/${encodeURIComponent(id)}`
}

/**
 * Patch Firestore `docs/*` redirects from the git manifest — needed when manifest or
 * recipes.json fix a target but incremental sync did not re-process the MODX row.
 *
 * @param {import('firebase-admin/firestore').Firestore} firestore
 * @param {string} manifestPath
 * @param {{ apply?: boolean }} [options]
 */
export async function refreshReceptsarokRedirectsFromManifest(
  firestore,
  manifestPath,
  { apply = true } = {}
) {
  const { entries } = loadRedirectsManifest(manifestPath)
  /** @type {{ path: string; redirect: string }[]} */
  const targets = []
  for (const entry of entries) {
    const pathKey = String(entry?.path ?? '')
      .trim()
      .replace(/^\/+/, '')
    const redirect = redirectPathForManifestEntry(entry)
    if (!pathKey || !redirect) continue
    targets.push({ path: pathKey, redirect })
  }

  let reads = 0
  let updated = 0
  let missing = 0
  /** @type {string[]} */
  const changedPaths = []
  /** @type {string[]} */
  const redirectPaths = []
  const CHUNK = 100

  for (let i = 0; i < targets.length; i += CHUNK) {
    const chunk = targets.slice(i, i + CHUNK)
    const refs = chunk.map((t) => firestore.collection('docs').doc(encodeDocPathId(t.path)))
    const snaps = await firestore.getAll(...refs)
    reads += snaps.length

    let batch = firestore.batch()
    let batchCount = 0

    for (let j = 0; j < snaps.length; j++) {
      const snap = snaps[j]
      const target = chunk[j]
      if (!snap.exists) {
        missing++
        continue
      }
      const current = snap.data()?.redirect
      if (current === target.redirect) continue
      console.log(`  redirect ${target.path}: ${current ?? '(none)'} → ${target.redirect}`)
      changedPaths.push(target.path)
      redirectPaths.push(target.redirect)
      updated++
      if (!apply) continue
      batch.update(snap.ref, { redirect: target.redirect })
      batchCount++
      if (batchCount >= 400) {
        await batch.commit()
        batch = firestore.batch()
        batchCount = 0
      }
    }
    if (apply && batchCount > 0) await batch.commit()
  }

  return { reads, updated, missing, changedPaths, redirectPaths, apply }
}
