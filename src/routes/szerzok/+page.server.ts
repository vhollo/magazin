import { MAGAZINE_CACHE_CONTROL } from '$lib/magazine/cacheHeaders';
import { getPublishedAuthors } from '$lib/magazine/authorsCache';
import type { PageServerLoad } from './$types';

/** Author index — one cached read of `collections/authors`, no per-author reads. */
export const load: PageServerLoad = async ({ setHeaders }) => {
	setHeaders({ 'Cache-Control': MAGAZINE_CACHE_CONTROL });
	const authors = await getPublishedAuthors();
	return { authors };
};
