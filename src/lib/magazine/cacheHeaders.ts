/** Edge CDN cache for magazine SSR HTML/JSON (Netlify shared cache). */
export const MAGAZINE_CACHE_CONTROL =
	'public, max-age=60, s-maxage=86400, stale-while-revalidate=2592000';

export const SEARCH_META_CACHE_CONTROL =
	'public, max-age=300, s-maxage=86400, stale-while-revalidate=86400';

/**
 * Netlify reads `Netlify-CDN-Cache-Control` instead of `Cache-Control` (which still goes to
 * the browser). `durable` stores the response in Netlify's shared durable cache: an edge node
 * without its own copy takes it from there instead of running the function again. Without it
 * every edge node renders each page itself (a deployed page showed `"Netlify Edge"; fwd=miss`
 * on repeated requests). The durable cache is cleared by every deploy and by the whole-site
 * purge after each sync (`scripts/lib/netlify-purge.mjs`), like the edge cache.
 */
const durable = (cacheControl: string) =>
	cacheControl.replace(/^public, max-age=\d+, /, 'public, durable, ');

export const MAGAZINE_CACHE_HEADERS = {
	'Cache-Control': MAGAZINE_CACHE_CONTROL,
	'Netlify-CDN-Cache-Control': durable(MAGAZINE_CACHE_CONTROL)
};

export const SEARCH_META_CACHE_HEADERS = {
	'Cache-Control': SEARCH_META_CACHE_CONTROL,
	'Netlify-CDN-Cache-Control': durable(SEARCH_META_CACHE_CONTROL)
};
