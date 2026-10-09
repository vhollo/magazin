/**
 * Purge the Netlify CDN cache after a sync (optional).
 * Env: PHASE; NETLIFY_SITE_ID / NETLIFY_ACCESS_TOKEN (production project `testdiabeteshu`) or,
 * when PHASE=dev, NETLIFY_SITE_ID_DEV / NETLIFY_ACCESS_TOKEN_DEV (dev project `diabeteshu`).
 *
 * Netlify's purge API (`POST /api/v1/purge`) only purges by cache tag or the
 * whole site — there is no purge-by-path. Our responses carry no cache tags, so
 * this does a whole-site purge. The `paths` argument is kept for log context
 * (what changed and triggered the purge); it is not sent to Netlify.
 *
 * Failures are non-fatal: always resolves, never throws.
 */

/**
 * The site keeps some Firestore docs in a 60 s per-serverless-instance cache:
 * `meta/stats` (getSiteStats — counts + siteConf), `collections/rs-home`
 * (getReceptsarokHome), `collections/authors` (authorsCache). Right after a sync
 * rewrites one of them, an instance that read the old copy shortly before keeps
 * serving it for up to 60 s, and a page it renders after the purge stays in the
 * CDN for 24 h with the old data. A purge at least this long after the last such
 * write cannot hit that window. Keep it above those TTLs and in step with
 * `CACHE_TTL_WAIT_SECONDS` in .github/workflows/cms-sync.yml and
 * sync-receptsarok-patika.yml.
 */
export const SITE_CACHE_TTL_WAIT_MS = 65_000

/**
 * Netlify credentials for the current phase. `PHASE=dev` selects the `_DEV` pair (dev
 * project); an empty or unset PHASE selects the unsuffixed pair (production project).
 * GitHub Actions leaves PHASE unset, so the workflows use the unsuffixed secrets.
 * There is no fallback between the two pairs, so a dev run can never purge production.
 *
 * @returns {{ siteId?: string, token?: string, siteVar: string, tokenVar: string }}
 */
function netlifyCredentials() {
  const suffix = process.env.PHASE === 'dev' ? '_DEV' : ''
  const siteVar = `NETLIFY_SITE_ID${suffix}`
  const tokenVar = `NETLIFY_ACCESS_TOKEN${suffix}`
  return { siteId: process.env[siteVar], token: process.env[tokenVar], siteVar, tokenVar }
}

/**
 * @param {string} siteId
 * @param {string} token
 * @returns {Promise<{ ok: boolean, status?: number, body?: string, error?: string }>}
 */
async function purgeWholeSite(siteId, token) {
  try {
    const res = await fetch('https://api.netlify.com/api/v1/purge', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ site_id: siteId }),
    })

    if (!res.ok) {
      const text = await res.text()
      console.warn(`Netlify purge failed: status=${res.status}, response=${text.slice(0, 500)}`)
      return { ok: false, status: res.status, body: text }
    }

    console.log(`Netlify purge OK: status=${res.status} (whole site)`)
    return { ok: true, status: res.status }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.warn(`Netlify purge error: ${message}`)
    return { ok: false, error: message }
  }
}

/**
 * @param {string[]} paths site paths without domain, e.g. ['hirek/foo', 'receptek/bar']
 */
export async function purgeNetlifyPaths(paths) {
  const { siteId, token, siteVar, tokenVar } = netlifyCredentials()

  if (!siteId || !token) {
    console.log(`Netlify purge: skipped (${siteVar} or ${tokenVar} not set)`)
    return { skipped: true, reason: 'missing_env' }
  }

  if (!paths?.length) {
    console.log('Netlify purge: skipped (no changed paths)')
    return { skipped: true, reason: 'empty' }
  }

  const unique = [...new Set(paths.map((p) => `/${String(p).replace(/^\/+/, '')}`))]
  console.log(
    `Netlify purge: whole-site purge (triggered by ${unique.length} changed path(s): ${unique.join(', ')})`
  )

  const result = await purgeWholeSite(siteId, token)
  return result.ok
    ? { ...result, count: unique.length, paths: unique }
    : { ...result, paths: unique }
}

/**
 * Second whole-site purge, SITE_CACHE_TTL_WAIT_MS after the call. For a run that
 * rewrote a doc the site caches for 60 s (see SITE_CACHE_TTL_WAIT_MS): the first
 * purge shows the changed pages at once, this one evicts the pages rendered in
 * the meantime from a stale instance cache. Call it after the run's last write of
 * such a doc. Skipped unless the first purge succeeded. Never throws.
 *
 * @param {{ ok?: boolean }} firstResult the `purgeNetlifyPaths` result
 * @param {string} reason log context: which cached docs the run rewrote
 */
export async function repurgeAfterSiteCaches(firstResult, reason) {
  const { siteId, token } = netlifyCredentials()
  if (!firstResult?.ok || !siteId || !token) {
    return { skipped: true, reason: 'first_purge_not_ok' }
  }
  console.log(
    `Netlify re-purge in ${SITE_CACHE_TTL_WAIT_MS / 1000} s — rewrote ${reason}, which the site caches for 60 s`
  )
  await new Promise((resolve) => setTimeout(resolve, SITE_CACHE_TTL_WAIT_MS))
  return purgeWholeSite(siteId, token)
}
