import { MAGAZINE_CACHE_HEADERS } from '$lib/magazine/cacheHeaders';
import { getPublishedAuthors } from '$lib/magazine/authorsCache';
import type { PageServerLoad } from './$types';

/** Author index — one cached read of `collections/authors`, no per-author reads. */
export const load: PageServerLoad = async ({ setHeaders }) => {
	setHeaders(MAGAZINE_CACHE_HEADERS);
	const authors = await getPublishedAuthors();
	return { authors };
};
