import fs from 'node:fs'

/**
 * @param {string} redirect
 * @returns {{ year: number; id: string } | null}
 */
export function parseReceptsarokRedirectPath(redirect) {
  const trimmed = String(redirect ?? '').trim()
  const m = trimmed.match(/^\/receptsarok\/(\d{4})\/([^/?#]+)$/)
  if (!m) return null
  const year = Number(m[1])
  const id = decodeURIComponent(m[2])
  if (!Number.isFinite(year) || !id) return null
  return { year, id }
}

/**
 * @param {{ year: number; id: string; modxContentId?: number }} target
 */
function targetKey(target) {
  return `${target.year}/${target.id}`
}

/**
 * Mark matched Receptsarok recipes free when a published MODX magazine row links to them.
 *
 * @param {object} options
 * @param {Record<string, unknown>[]} options.recipes — mutable array from recipes.json
 * @param {Iterable<{ year: number; id: string; modxContentId?: number }>} options.targets
 * @param {string} options.recipesJsonPath
 * @param {import('firebase-admin/firestore').Firestore} options.firestore
 * @param {boolean} options.apply — write Firestore + recipes.json
 * @returns {{ updated: number; keys: string[] }}
 */
export async function applyModxLinkedRecipeFreeFlags({
  recipes,
  targets,
  recipesJsonPath,
  firestore,
  apply,
}) {
  /** @type {Map<string, { year: number; id: string; modxContentId?: number }>} */
  const byKey = new Map()
  for (const t of targets) {
    if (!Number.isFinite(t?.year) || !t?.id) continue
    const key = targetKey(t)
    const prev = byKey.get(key)
    if (!prev || Number.isFinite(t.modxContentId)) {
      byKey.set(key, {
        year: Number(t.year),
        id: String(t.id),
        modxContentId: Number.isFinite(t.modxContentId) ? Number(t.modxContentId) : prev?.modxContentId,
      })
    }
  }

  if (byKey.size === 0) return { updated: 0, keys: [] }

  /** @type {string[]} */
  const changedKeys = []
  let batch = firestore.batch()
  let batchCount = 0

  for (const recipe of recipes) {
    const key = targetKey({ year: Number(recipe.year), id: String(recipe.id) })
    const target = byKey.get(key)
    if (!target) continue

    let recipeChanged = false
    if (recipe.free !== true) {
      recipe.free = true
      recipeChanged = true
    }

    const modxId = Number.isFinite(target.modxContentId)
      ? target.modxContentId
      : Number(recipe.sourceModxId)
    if (Number.isFinite(modxId) && recipe.sourceModxId !== modxId) {
      recipe.sourceModxId = modxId
      recipeChanged = true
    }

    if (recipeChanged) changedKeys.push(key)
    if (!apply || !recipeChanged) continue

    const docId = `${recipe.year}-${recipe.id}`
    const patch = { free: true }
    if (Number.isFinite(modxId)) patch.sourceModxId = modxId
    batch.set(firestore.collection('recipes').doc(docId), patch, { merge: true })
    batchCount += 1
    if (batchCount % 400 === 0) {
      await batch.commit()
      batch = firestore.batch()
    }
  }

  if (apply && batchCount % 400 !== 0) await batch.commit()

  if (apply && changedKeys.length > 0) {
    fs.writeFileSync(recipesJsonPath, `${JSON.stringify(recipes, null, 2)}\n`)
  }

  const updated = changedKeys.length
  return { updated, keys: changedKeys }
}
