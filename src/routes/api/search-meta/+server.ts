import { json } from '@sveltejs/kit';
import { SEARCH_META_CACHE_CONTROL } from '$lib/magazine/cacheHeaders';
import { getSearchMeta } from '$lib/magazine/firestore';
import type { RequestHandler } from './$types';

const NO_STORE = 'no-store';

export const GET: RequestHandler = async () => {
	try {
		const meta = await getSearchMeta();
		if (!meta?.indexUrl) {
			return json(
				{ indexUrl: null, version: null, error: 'Search index not configured' },
				{ status: 503, headers: { 'Cache-Control': NO_STORE } }
			);
		}
		return json(
			{
				indexUrl: meta.indexUrl,
				version: meta.version,
				articleCount: meta.articleCount,
				recipeCount: meta.recipeCount,
				generatedAt: meta.generatedAt
			},
			{
				headers: {
					'Cache-Control': SEARCH_META_CACHE_CONTROL
				}
			}
		);
	} catch {
		return json(
			{ indexUrl: null, version: null, error: 'Search meta unavailable' },
			{ status: 503, headers: { 'Cache-Control': NO_STORE } }
		);
	}
};
