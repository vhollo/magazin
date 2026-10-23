import { MAGAZINE_CACHE_CONTROL } from '$lib/magazine/cacheHeaders';
import type { RequestHandler } from './$types';

/**
 * Bare "page not found" response for a missing path opened in an iframe (the MODX load
 * test) — `[...path]/+layout.server.ts` redirects those here instead of to /keres.
 * Simple Analytics records this URL's own path, `/404/{path}`; there is no layout,
 * Firestore read or search index download.
 */
export const GET: RequestHandler = ({ params }) => {
	const q = encodeURIComponent(params.path ?? '');
	const html = `<!doctype html>
<html lang="hu">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Az oldal nem található</title>
</head>
<body>
<p>Az oldal nem található. <a href="/keres?q=${q}">Keresés</a></p>
<script async src="https://scripts.simpleanalyticscdn.com/latest.js"></script>
</body>
</html>
`;
	return new Response(html, {
		status: 404,
		headers: {
			'Content-Type': 'text/html; charset=utf-8',
			'Cache-Control': MAGAZINE_CACHE_CONTROL
		}
	});
};
