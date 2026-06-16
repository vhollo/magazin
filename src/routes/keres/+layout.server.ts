import type { LayoutServerLoad } from './$types';
import { MAGAZINE_CACHE_CONTROL } from '$lib/magazine/cacheHeaders';

// Recipe hits are enriched from the `recipeTeaser` stored on every recipe doc
// in the MiniSearch index the client downloads — no Firestore teaser reads here.
// (The rs-teasers-{year} shards still exist as a rollback path; see
// getReceptsarokTeasers in $lib/receptsarokFirestore.)
export const load: LayoutServerLoad = async ({ setHeaders }) => {
	setHeaders({ 'Cache-Control': MAGAZINE_CACHE_CONTROL });
	return {
		doc: { path: 'keres', title: 'Keresés' },
	};
};
