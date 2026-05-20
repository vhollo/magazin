import { redirect } from '@sveltejs/kit';
import { collectionQueries, rankDocByTags } from '$lib/modx/collections';
import { getMagazineArticle, getMagazineCollection, isCollectionSlug } from '$lib/magazine/firestore';
import type { LayoutServerLoad } from './$types';

/**
 * Returns the collection slug whose tag query best matches the article's tags.
 * Used to populate the "Hasonló cikkek" grid on article pages.
 */
function bestCollectionSlug(articleTags: string[]): string | null {
	if (!articleTags.length) return null;
	let best: string | null = null;
	let bestScore = 0;
	for (const [slug, queryTags] of Object.entries(collectionQueries)) {
		if (slug === 'all') continue;
		const score = rankDocByTags({ tv: { tags: articleTags } }, queryTags);
		if (score > bestScore) {
			bestScore = score;
			best = slug;
		}
	}
	return best;
}

export const load: LayoutServerLoad = async ({ params, setHeaders }) => {
	const path: string = params.path ?? '';

	setHeaders({
		'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=2592000'
	});

	// ── Collection page ───────────────────────────────────────────────────────
	if (isCollectionSlug(path)) {
		const col = await getMagazineCollection(path);
		return {
			doc: { path },
			docs: col?.cards ?? []
		};
	}

	// ── Article / document page ───────────────────────────────────────────────
	const doc = await getMagazineArticle(path);

	if (!doc) {
		redirect(307, '/keres?q=' + encodeURIComponent(path));
	}

	if (doc.redirect) {
		redirect(308, doc.redirect);
	}

	// Load similar articles from the best-matching collection (one extra read).
	const articleTags: string[] = (doc.tv?.tags as string[]) ?? [];
	const slug = bestCollectionSlug(articleTags);
	let docs: unknown[] = [];

	if (slug) {
		const col = await getMagazineCollection(slug);
		if (col) {
			// Exclude the current article from the similar list
			docs = (col.cards ?? []).filter((c) => String(c.id) !== String((doc as any).id));
		}
	}

	return { doc, docs };
};
