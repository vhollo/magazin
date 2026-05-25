import type { Handle } from '@sveltejs/kit';
import { modxAssetOriginBase } from '$lib/modxAssetOrigin';

const MODX_ASSET_PREFIXES = ['/assets/images/', '/assets/media/'] as const;

/** Proxy MODX media same-origin (app host → MODX_ASSET_ORIGIN). */
export const handle: Handle = async ({ event, resolve }) => {
	const { pathname } = event.url;
	if (!MODX_ASSET_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
		return resolve(event);
	}

	const upstreamUrl = `${modxAssetOriginBase()}${pathname}${event.url.search}`;
	try {
		const upstream = await fetch(upstreamUrl);
		if (!upstream.ok) {
			return new Response('Not found', { status: upstream.status });
		}

		const headers = new Headers();
		const contentType = upstream.headers.get('Content-Type');
		if (contentType) headers.set('Content-Type', contentType);
		headers.set('Cache-Control', 'public, max-age=86400, s-maxage=86400');

		return new Response(upstream.body, { status: 200, headers });
	} catch {
		return new Response('Upstream fetch failed', { status: 502 });
	}
};
