import { getMagazineCollection } from '$lib/magazine/firestore';
import { MAGAZINE_CACHE_HEADERS } from '$lib/magazine/cacheHeaders';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ setHeaders }) => {
	setHeaders(MAGAZINE_CACHE_HEADERS);
	const col = await getMagazineCollection('home');
	return {
		docs: col?.cards ?? [],
		count: col?.count ?? col?.cards?.length ?? 0,
		expertCards: col?.expertCards ?? [],
	};
};
