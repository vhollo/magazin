/**
 * Purge Netlify CDN cache for changed article paths (optional).
 * Env: NETLIFY_SITE_ID, NETLIFY_ACCESS_TOKEN
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
  const batch = unique.slice(0, 50)
  if (unique.length > batch.length) {
    console.warn(`Netlify purge: truncating ${unique.length} paths to ${batch.length}`)
  }

  console.log(`Netlify purge: requesting ${batch.length} path(s): ${batch.join(', ')}`)

  try {
    const res = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/purge_cache`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paths: batch }),
    })

    if (!res.ok) {
      const text = await res.text()
      console.warn(
        `Netlify purge failed: status=${res.status}, paths=[${batch.join(', ')}], response=${text.slice(0, 500)}`
      )
      return { ok: false, status: res.status, paths: batch, body: text }
    }

    console.log(`Netlify purge OK: status=${res.status}, paths=[${batch.join(', ')}]`)
    return { ok: true, status: res.status, count: batch.length, paths: batch }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.warn(`Netlify purge error: paths=[${batch.join(', ')}], error=${message}`)
    return { ok: false, paths: batch, error: message }
  }
}
