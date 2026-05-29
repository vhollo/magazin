import type { LayoutServerLoad } from './$types';
import { MAGAZINE_CACHE_CONTROL } from '$lib/magazine/cacheHeaders';
import { getReceptsarokTeasers } from '$lib/receptsarokFirestore';

export const load: LayoutServerLoad = async ({ setHeaders }) => {
	setHeaders({ 'Cache-Control': MAGAZINE_CACHE_CONTROL });
	const { teasersByKey } = await getReceptsarokTeasers();
	return {
		doc: { path: 'keres', title: 'Keresés' },
		recipeTeasersByKey: teasersByKey,
	};
};
