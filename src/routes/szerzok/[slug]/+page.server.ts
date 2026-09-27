import { error } from '@sveltejs/kit';
import { MAGAZINE_CACHE_CONTROL } from '$lib/magazine/cacheHeaders';
import { getAuthor } from '$lib/magazine/authorsCache';
import { getArticlesByAuthor } from '$lib/magazine/firestore';
import { recipesByAuthor } from '$lib/server/similarRecipes';
import type { PageServerLoad } from './$types';

/**
 * Author profile. The record comes from the cached `collections/authors`
 * aggregate; only the article list costs a query. Their Receptsarok recipes come
 * from the in-process recipe index (no Firestore read).
 */
export const load: PageServerLoad = async ({ params, setHeaders }) => {
	setHeaders({ 'Cache-Control': MAGAZINE_CACHE_CONTROL });

	const author = await getAuthor(params.slug);
	if (!author) error(404, 'Ilyen szerzőnk nincs');

	const [cards, recipes] = await Promise.all([
		getArticlesByAuthor(author.slug),
		recipesByAuthor(author)
	]);
	return { author, cards, recipes };
};
