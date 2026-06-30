/**
 * Purge the Netlify CDN cache after a sync (optional).
 * Env: NETLIFY_SITE_ID, NETLIFY_ACCESS_TOKEN
 *
 * Netlify's purge API (`POST /api/v1/purge`) only purges by cache tag or the
 * whole site — there is no purge-by-path. Our responses carry no cache tags, so
 * this does a whole-site purge. The `paths` argument is kept for log context
 * (what changed and triggered the purge); it is not sent to Netlify.
 *
 * Failures are non-fatal: always resolves, never throws.
 *
 * @param {string[]} paths site paths without domain, e.g. ['hirek/foo', 'receptek/bar']
 */
export async function purgeNetlifyPaths(paths) {
  const siteId = process.env.NETLIFY_SITE_ID
  const token = process.env.NETLIFY_ACCESS_TOKEN

  if (!siteId || !token) {
    console.log('Netlify purge: skipped (NETLIFY_SITE_ID or NETLIFY_ACCESS_TOKEN not set)')
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
      return { ok: false, status: res.status, paths: unique, body: text }
    }

    console.log(`Netlify purge OK: status=${res.status} (whole site)`)
    return { ok: true, status: res.status, count: unique.length, paths: unique }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.warn(`Netlify purge error: ${message}`)
    return { ok: false, paths: unique, error: message }
  }
}
