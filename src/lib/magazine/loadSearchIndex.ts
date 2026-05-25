/** Read gzipped MiniSearch JSON from a fetch Response (proxy or GCS). */
export async function readGzippedIndexResponse(
	resp: Response,
	sourceUrl: string
): Promise<string> {
	const isGzip =
		sourceUrl.includes('.gz') ||
		(resp.headers.get('content-type') ?? '').includes('gzip');
	if (isGzip && typeof DecompressionStream !== 'undefined') {
		if (!resp.body) throw new Error('empty response body');
		const decompressed = resp.body.pipeThrough(new DecompressionStream('gzip'));
		return await new Response(decompressed).text();
	}
	return await resp.text();
}

const SEARCH_INDEX_PROXY = '/api/search-index';

/** localhost / vite preview — use same-origin proxy (GCS has no CORS for :4173). */
function preferSearchIndexProxy(): boolean {
	if (import.meta.env.DEV) return true;
	if (typeof window === 'undefined') return false;
	const host = window.location.hostname;
	return host === 'localhost' || host === '127.0.0.1';
}

/**
 * Load gzipped index JSON.
 * Production / Netlify: direct GCS fetch only (bucket CORS; index ~10 MiB exceeds Netlify function limit).
 * Local dev / vite preview: same-origin proxy first (GCS CORS only lists localhost ports).
 */
export async function fetchSearchIndexText(indexUrl: string): Promise<string> {
	const urls = preferSearchIndexProxy()
		? [SEARCH_INDEX_PROXY, indexUrl]
		: [indexUrl];

	let lastError: Error | null = null;
	for (const url of urls) {
		if (!url) continue;
		try {
			const resp = await fetch(url);
			if (!resp.ok) {
				lastError = new Error(`${url}: HTTP ${resp.status}`);
				continue;
			}
			return await readGzippedIndexResponse(resp, url);
		} catch (err) {
			lastError = err instanceof Error ? err : new Error(String(err));
		}
	}
	throw lastError ?? new Error('search index unavailable');
}
