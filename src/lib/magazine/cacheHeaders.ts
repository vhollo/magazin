/** Edge CDN cache for magazine SSR HTML/JSON (Netlify shared cache). */
export const MAGAZINE_CACHE_CONTROL =
	'public, max-age=60, s-maxage=86400, stale-while-revalidate=2592000';

export const SEARCH_META_CACHE_CONTROL =
	'public, max-age=300, s-maxage=86400, stale-while-revalidate=86400';
