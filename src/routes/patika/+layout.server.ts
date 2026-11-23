import type { LayoutServerLoad } from './$types';
import { MAGAZINE_CACHE_HEADERS } from '$lib/magazine/cacheHeaders';
import { getPatikaCollection } from '$lib/patikaFirestore';

export const load: LayoutServerLoad = async ({ setHeaders }) => {
	setHeaders(MAGAZINE_CACHE_HEADERS);
	const { patikas } = await getPatikaCollection();
	return {
		patikas,
		doc: { patikas, path: 'patika', title: 'Gyógyszertárkereső' },
	};
};
