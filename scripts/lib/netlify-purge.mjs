/**
 * Purge Netlify CDN cache for changed article paths (optional).
 * Env: NETLIFY_SITE_ID, NETLIFY_ACCESS_TOKEN
 *
 * @param {string[]} paths site paths without domain, e.g. ['hirek/foo', 'receptek/bar']
 */
export async function purgeNetlifyPaths(paths) {
  const siteId = process.env.NETLIFY_SITE_ID
  const token = process.env.NETLIFY_ACCESS_TOKEN
  if (!siteId || !token || !paths.length) return { skipped: true }

  const unique = [...new Set(paths.map((p) => `/${String(p).replace(/^\/+/, '')}`))]
  const batch = unique.slice(0, 50)

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
    console.warn(`Netlify purge failed (${res.status}): ${text}`)
    return { ok: false, status: res.status }
  }

  console.log(`Netlify purge: ${batch.length} path(s)`)
  return { ok: true, count: batch.length }
}
