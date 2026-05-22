import { resolveSearchIndexUrl } from '$lib/magazine/searchIndexUrl';
import type { RequestHandler } from './$types';

const NO_STORE = 'no-store';
const INDEX_CACHE =
	'public, max-age=300, s-maxage=86400, stale-while-revalidate=86400';

export const GET: RequestHandler = async () => {
	const indexUrl = await resolveSearchIndexUrl();
	if (!indexUrl) {
		return new Response('Search index not configured', {
			status: 503,
			headers: { 'Cache-Control': NO_STORE }
		});
	}

	let upstream: Response;
	try {
		upstream = await fetch(indexUrl);
	} catch {
		return new Response('Search index fetch failed', {
			status: 502,
			headers: { 'Cache-Control': NO_STORE }
		});
	}

	if (!upstream.ok) {
		return new Response('Search index fetch failed', {
			status: 502,
			headers: { 'Cache-Control': NO_STORE }
		});
	}

	// Buffer body (reliable in Vite dev). Do not set Content-Encoding: the bytes are
	// already gzip; that header makes fetch auto-decompress and can throw "Failed to fetch".
	const bytes = await upstream.arrayBuffer();

	const headers = new Headers();
	headers.set('Content-Type', 'application/gzip');
	headers.set('Cache-Control', INDEX_CACHE);

	return new Response(bytes, { status: 200, headers });
};
