import { MAGAZINE_CACHE_HEADERS } from '$lib/magazine/cacheHeaders';
import { getPublishedAuthors } from '$lib/magazine/authorsCache';
import { recipeCountsByAuthor } from '$lib/server/similarRecipes';
import type { PageServerLoad } from './$types';

/**
 * Author index — one cached read of `collections/authors`, no per-author reads.
 * Article counts come with the aggregate (`articleCounts`, written by the sync);
 * recipe counts from the in-process recipe index (no Firestore read).
 */
export const load: PageServerLoad = async ({ setHeaders }) => {
	setHeaders(MAGAZINE_CACHE_HEADERS);
	const authors = await getPublishedAuthors();
	const recipeCounts = await recipeCountsByAuthor(authors);
	return {
		authors: authors.map((author) => ({ ...author, recipeCount: recipeCounts[author.slug] ?? 0 }))
	};
};
