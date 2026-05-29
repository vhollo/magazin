import type { LayoutServerLoad } from './$types';
import { MAGAZINE_CACHE_CONTROL } from '$lib/magazine/cacheHeaders';
import { getPatikaCollection } from '$lib/receptsarokFirestore';

export const load: LayoutServerLoad = async ({ setHeaders }) => {
	setHeaders({ 'Cache-Control': MAGAZINE_CACHE_CONTROL });
	const { patikas } = await getPatikaCollection();
	return {
		patikas,
		doc: { patikas, path: 'patika', title: 'Gyógyszertárkereső' },
	};
};
