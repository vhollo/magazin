import { redirect } from '@sveltejs/kit';
import { hasArticleBody, wrapArticleTables } from '$lib/magazine/articleHtml';
import { MAGAZINE_CACHE_CONTROL } from '$lib/magazine/cacheHeaders';
import { collectionQueries, rankDocByTags, type ThinCard } from '$lib/modx/collections';
import {
	getFirstChildPath,
	getMagazineArticle,
	getMagazineCollection,
	isCollectionSlug
} from '$lib/magazine/firestore';
import { getAuthorsBySlugs } from '$lib/magazine/authorsCache';
import type { LayoutServerLoad } from './$types';

/**
 * Old MODX section folders (`cikkek`, `cikkek/{rovat}`) — no body of their own and no
 * listing of their children, still reachable from external/legacy links. Redirected
 * before the Firestore read, so a MODX re-save can't clear it the way sync clears
 * `doc.redirect`.
 */
const LEGACY_SECTION_REDIRECTS: Record<string, string> = {
	cikkek: '/',
	'cikkek/diabetes': '/',
	'cikkek/hypertonia': '/',
	'cikkek/elet': '/',
	'cikkek/mod': '/',
	'cikkek/szemle': '/',
	'cikkek/orvos': '/orvos-beteg',
	'cikkek/kereso': '/keres',
	'cikkek/recept': '/receptsarok'
};

/** Empty "Diabéteszegyesületek …" series folders — each child is one association's page. */
const ASSOCIATION_FOLDER = /\/[^/]*egyesulet[^/]*$/;

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

	// ── Legacy MODX section folder with no content of its own ─────────────────
	const legacyTarget = LEGACY_SECTION_REDIRECTS[path];
	if (legacyTarget) {
		redirect(308, legacyTarget);
	}

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

	// A doc without `path` is a stub a merge write re-created after its article was
	// deleted or moved (only `relatedCards` etc.) — as missing as no doc at all.
	if (!doc?.path) {
		redirect(307, '/keres?q=' + encodeURIComponent(path));
	}

	if (doc.redirect) {
		redirect(308, doc.redirect);
	}

	// An empty magazine issue/group folder (e.g. `cikkek/diabetes/0801`) would render a
	// bare title. A recipe group (`doc.related` / `linkedModxIds`) is not empty: the page
	// lists its recipes. 307, so the page comes back once an editor gives it a body.
	if (
		path.startsWith('cikkek/') &&
		!hasArticleBody(doc.content) &&
		!doc.related?.length &&
		!doc.linkedModxIds?.length
	) {
		const firstChild = ASSOCIATION_FOLDER.test(path) ? await getFirstChildPath(Number(doc.id)) : null;
		redirect(307, firstChild ? '/' + firstChild : '/');
	}

	// CMS tables get a horizontally scrollable wrapper here rather than at sync time,
	// so it applies to every existing document without a re-sync and lands in the SSR
	// HTML (no hydration reflow, works with JS off).
	if (doc.content) doc.content = wrapArticleTables(doc.content);

	const articleTags: string[] = (doc.tv?.tags as string[]) ?? [];
	// A precomputed recipe link group (`doc.related`) replaces the tag-based
	// "Kapcsolódó cikkek" grid — the recipes render via the ReceptsarokWidget instead.
	const hasRelatedRecipes = Array.isArray(doc.related) && doc.related.length > 0;
	const docs = hasRelatedRecipes
		? []
		: await similarCards(doc, articleTags, bestCollectionSlug(articleTags));

	// Signature boxes come from `collections/authors` (one cached read per instance),
	// not from the doc — so a CMS edit shows up without re-syncing every article.
	const authors = await getAuthorsBySlugs((doc.authorSlugs as string[]) ?? []);

	return { doc, docs, authors };
};
