import { getMagazineCollection } from '$lib/magazine/firestore';
import { MAGAZINE_CACHE_CONTROL } from '$lib/magazine/cacheHeaders';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ setHeaders }) => {
	setHeaders({ 'Cache-Control': MAGAZINE_CACHE_CONTROL });
	const col = await getMagazineCollection('home');
	return {
		docs: col?.cards ?? [],
		count: col?.count ?? col?.cards?.length ?? 0,
	};
};
