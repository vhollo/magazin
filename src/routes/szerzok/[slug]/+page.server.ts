import { error } from '@sveltejs/kit';
import { MAGAZINE_CACHE_CONTROL } from '$lib/magazine/cacheHeaders';
import { getAuthor } from '$lib/magazine/authorsCache';
import { getArticlesByAuthor } from '$lib/magazine/firestore';
import type { PageServerLoad } from './$types';

/**
 * Author profile. The record comes from the cached `collections/authors`
 * aggregate; only the article list costs a query.
 */
export const load: PageServerLoad = async ({ params, setHeaders }) => {
	setHeaders({ 'Cache-Control': MAGAZINE_CACHE_CONTROL });

	const author = await getAuthor(params.slug);
	if (!author) error(404, 'Ilyen szerzőnk nincs');

	const cards = await getArticlesByAuthor(author.slug);
	return { author, cards };
};
