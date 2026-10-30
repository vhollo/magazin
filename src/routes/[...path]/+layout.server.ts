import { redirect } from '@sveltejs/kit';
import { hasArticleBody, wrapArticleTables } from '$lib/magazine/articleHtml';
import { MAGAZINE_CACHE_CONTROL } from '$lib/magazine/cacheHeaders';
import { collectionQueries, isListedDoc, rankDocByTags, type ThinCard } from '$lib/modx/collections';
import {
	getFirstChildUrl,
	getMagazineArticle,
	getMagazineCollection,
	isCollectionSlug
} from '$lib/magazine/firestore';
import { getAuthorsBySlugs } from '$lib/magazine/authorsCache';
import { isRelativeLinkArtifact } from '$lib/magazine/relativeLinkArtifact';
import type { LayoutServerLoad } from './$types';

/**
 * Old MODX paths that no longer render anything — section folders (`cikkek`,
 * `cikkek/{rovat}`: no body, no listing of their children) and removed pages
 * (`alapitvany/rolunk`) — still reachable from external/legacy links. Redirected
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
	'cikkek/recept': '/receptsarok',
	// The live MODX templates still link `alapitvany/rolunk`, a page that no longer exists.
	'alapitvany/rolunk': '/alapitvany'
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

export const load: LayoutServerLoad = async ({ params, request, setHeaders, url }) => {
	const path: string = params.path ?? '';

	setHeaders({ 'Cache-Control': MAGAZINE_CACHE_CONTROL });

	// ── Legacy MODX section folder with no content of its own ─────────────────
	const legacyTarget = LEGACY_SECTION_REDIRECTS[path];
	if (legacyTarget) {
		// The live MODX search form submits `cikkek/kereso?s=…` — keep the search term.
		const term = path === 'cikkek/kereso' ? url.searchParams.get('s')?.trim() : '';
		redirect(308, term ? `${legacyTarget}?q=${encodeURIComponent(term)}` : legacyTarget);
	}

	// ── A link a crawler resolved against the page instead of `<base href>` ───
	// Not a dead link: the bare /404 page skips analytics for it, and no Firestore read.
	if (isRelativeLinkArtifact(path)) {
		redirect(307, '/404/' + path.split('/').map(encodeURIComponent).join('/'));
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
	// An iframe (the MODX load test) goes to the bare `/404/{path}` endpoint: analytics
	// records that path, and no /keres layout or search index is loaded. Everyone else
	// gets the search; `hianyzo` is for analytics only (`saPathOverwriter` in app.html
	// records the visit as `/404/{path}` instead of `/keres`). The CDN-cached redirect
	// differs by `Sec-Fetch-Dest`, hence the `Vary`.
	if (!doc?.path) {
		setHeaders({ Vary: 'Sec-Fetch-Dest' });
		if (request.headers.get('sec-fetch-dest') === 'iframe') {
			redirect(307, '/404/' + path.split('/').map(encodeURIComponent).join('/'));
		}
		redirect(
			307,
			'/keres?q=' + encodeURIComponent(path) + '&hianyzo=' + encodeURIComponent('/' + path)
		);
	}

	if (doc.redirect) {
		redirect(308, doc.redirect);
	}

	// A page with no body of its own is not rendered bare (307, so it comes back once an
	// editor gives it a body — or, for a recipe group, a tag):
	//   - an empty `cikkek/` issue/group folder (e.g. `cikkek/diabetes/0801`) → home, or an
	//     association series folder's first child;
	//   - a recipe group (`doc.related` / `linkedModxIds`) renders its recipe list only when
	//     tagged; untagged it is a card nowhere, so it opens its first page (its recipe).
	if (!hasArticleBody(doc.content)) {
		const recipeGroup = Boolean(doc.related?.length || doc.linkedModxIds?.length);
		if (!recipeGroup && path.startsWith('cikkek/')) {
			const first = ASSOCIATION_FOLDER.test(path) ? await getFirstChildUrl(Number(doc.id)) : null;
			redirect(307, first ?? '/');
		}
		if (recipeGroup && !isListedDoc(doc)) {
			const first = await getFirstChildUrl(Number(doc.id));
			if (first) redirect(307, first);
		}
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
