import { redirect } from '@sveltejs/kit';
import { MAGAZINE_CACHE_CONTROL } from '$lib/magazine/cacheHeaders';
import { collectionQueries, rankDocByTags, type ThinCard } from '$lib/modx/collections';
import { getMagazineArticle, getMagazineCollection, isCollectionSlug } from '$lib/magazine/firestore';
import type { LayoutServerLoad } from './$types';

/** Best tag-collection slug for an article's tags (fallback similar-articles source). */
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

function similarCards(
	doc: { id?: number | string; relatedCards?: ThinCard[] },
	articleTags: string[],
	slug: string | null
): Promise<ThinCard[]> {
	const stored = doc.relatedCards?.filter((c) => String(c.id) !== String(doc.id));
	if (stored?.length) return Promise.resolve(stored);
	if (!slug) return Promise.resolve([]);
	return getMagazineCollection(slug).then((col) =>
		(col?.cards ?? []).filter((c) => String(c.id) !== String(doc.id))
	);
}

export const load: LayoutServerLoad = async ({ params, setHeaders }) => {
	const path: string = params.path ?? '';

	setHeaders({ 'Cache-Control': MAGAZINE_CACHE_CONTROL });

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

	const articleTags: string[] = (doc.tv?.tags as string[]) ?? [];
	const docs = await similarCards(doc, articleTags, bestCollectionSlug(articleTags));

	return { doc, docs };
};
