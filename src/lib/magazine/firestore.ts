import { db } from '$lib/firebase-admin';
import { encodeDocPathId } from '$lib/magazine/docPathId';
import type { DocLike, ThinCard } from '$lib/modx/collections';
import { collectionQueries, toThinCard } from '$lib/modx/collections';

export type MagazineArticle = DocLike & {
	/** Article body HTML. Not on `DocLike` — cards carry `ellipsis`, not the full body. */
	content?: string;
	/** Author slugs, flattened from `tv.szerzo` so the author page can query them. */
	authorSlugs?: string[];
	relatedCards?: ThinCard[];
	/** Precomputed recipe-group keys (`{year}-{id}`); replaces the tag-based grid when set. */
	related?: string[];
	linkedModxIds?: number[];
};

export type CollectionDoc = {
	slug?: string;
	queryTags?: string[];
	cards: ThinCard[];
	count?: number;
	generatedAt?: string;
	/** `collections/home` only — Dr.-authored, expert-tagged picks (see `expertDocs` in `$lib/modx/collections`). */
	expertCards?: ThinCard[];
};

export type SearchMeta = {
	indexUrl: string;
	version: number | string;
	generatedAt?: string;
	articleCount?: number;
	recipeCount?: number;
};

const COLLECTION_SLUGS = new Set(Object.keys(collectionQueries));

export function isCollectionSlug(path: string): boolean {
	return COLLECTION_SLUGS.has(path);
}

export async function getMagazineArticle(path: string): Promise<MagazineArticle | null> {
	const snap = await db.collection('docs').doc(encodeDocPathId(path)).get();
	if (!snap.exists) return null;
	return snap.data() as MagazineArticle;
}

/** Direct children's MODX ids — used to surface a recipe folder's own child recipes. */
export async function getChildModxIds(parentModxId: number): Promise<number[]> {
	const snap = await db.collection('docs').where('parent', '==', parentModxId).select('id').get();
	return snap.docs.map((d) => Number(d.get('id'))).filter((n) => Number.isFinite(n));
}

/**
 * Depth of the issue container a doc lives in — the folder that *is* the publication,
 * so anything deeper is an editorial grouping.
 *
 *   `cikkek/{magazin}/{lapszam}/…`      → 3   (`cikkek/diabetes/2501`)
 *   `junior/{ev}/cikkek/…`              → 3   (Junior 2011–2019 keeps an intermediate
 *                                              `cikkek` folder; `{ev}` may be `2021-2`)
 *   `junior/{ev}/…`                     → 2   (Junior from 2020 — the year is the issue,
 *                                              and group folders sit directly under it)
 *   `{gyoker}/{kiadas}/[cikkek/]…`      → 2/3 (same shape for `rendezveny`, `diaeuro-futsal`)
 *
 * Only the `cikkek` root carries an extra magazine level; every other root numbers its
 * issues directly. The optional literal `cikkek` folder is recognised on any root.
 */
function issueContainerDepth(parentSegments: string[]): number {
	const base = parentSegments[0] === 'cikkek' ? 3 : 2;
	return parentSegments[base] === 'cikkek' ? base + 1 : base;
}

/**
 * The doc's path-parent when it is a **group folder** — a folder below the issue
 * container, e.g. `cikkek/diabetes/1806/karacsonyi-receptsarok`,
 * `junior/2015/cikkek/receptsarok` or `junior/2021/nyari-taborok-2021`. `null` when the
 * doc sits directly in its issue, since **merely appearing in the same issue does not
 * relate two articles**. Mirrored in `docRelatedKeys`
 * (`scripts/lib/related-recipe-cards.mjs`) — keep the two in sync.
 */
function groupFolderOf(docPath: string): string | null {
	const parent = docPath.slice(0, docPath.lastIndexOf('/'));
	if (!parent) return null;
	const segments = parent.split('/').filter(Boolean);
	return segments.length > issueContainerDepth(segments) ? parent : null;
}

/**
 * Sibling magazine recipe articles (Receptsarok redirects under the same MODX parent)
 * that this doc is grouped with. A sibling counts on **either** signal:
 *
 *  - **structural** — the two share a group folder below the issue, e.g. the recipes
 *    sitting next to a hub page inside `…/1806/karacsonyi-receptsarok`; or
 *  - **editorial** — this doc's `content` links that sibling's path, which is how a
 *    recipe round-up marks its own dishes even when it never got its own folder
 *    (e.g. `cikkek/diabetes/1804/mexiko` linking the issue's six Mexican recipes).
 *
 * What neither signal allows is bare issue co-location: a leaf's path-parent is always
 * its issue (`cikkek/diabetes/2501`), so without one of the two every article of an
 * issue would inherit that issue's recipes. Mirrors tier 3 of `docRelatedKeys`.
 *
 * Cost: the `parent ==` query bills one read per sibling (~14 on a magazine issue) and
 * would otherwise run on every article SSR miss. A doc outside a group folder whose body
 * does not even mention the sibling path prefix can match nothing, and that pure string
 * test runs first — so the common case, a plain article in an issue folder, reaches this
 * tier at zero Firestore reads.
 */
export async function getSiblingReceptModxIds(
	parentModxId: number,
	excludeModxId: number,
	docPath: string,
	content: string
): Promise<number[]> {
	if (!docPath) return [];
	const inGroupFolder = groupFolderOf(docPath) !== null;
	const pathParent = docPath.slice(0, docPath.lastIndexOf('/'));
	const mayLink = !!content && !!pathParent && content.includes(pathParent + '/');
	if (!inGroupFolder && !mayLink) return [];
	const snap = await db
		.collection('docs')
		.where('parent', '==', parentModxId)
		.select('id', 'path', 'tv', 'redirect')
		.get();
	return snap.docs
		.map((d) => ({
			id: Number(d.get('id')),
			path: String(d.get('path') ?? ''),
			tags: (d.get('tv') as { tags?: string[] } | undefined)?.tags,
			redirect: String(d.get('redirect') ?? '')
		}))
		.filter(
			({ id, path, tags, redirect }) =>
				Number.isFinite(id) &&
				id !== excludeModxId &&
				tags?.includes('recept') &&
				redirect.startsWith('/receptsarok/') &&
				!!path &&
				(inGroupFolder || content.includes(path))
		)
		.map(({ id }) => id)
		.sort((a, b) => a - b);
}

/**
 * An author's articles, newest first — backs `/szerzok/{slug}`.
 *
 * Queries the flat `authorSlugs` array the sync writes: `tv.szerzo` is an array of
 * maps, which Firestore cannot `array-contains`. Needs a composite index on
 * (`authorSlugs` array-contains, `publishedon` desc).
 */
export async function getArticlesByAuthor(slug: string, limit = 30): Promise<ThinCard[]> {
	if (!slug) return [];
	try {
		const snap = await db
			.collection('docs')
			.where('authorSlugs', 'array-contains', slug)
			.orderBy('publishedon', 'desc')
			.limit(limit)
			.select('id', 'path', 'title', 'longtitle', 'description', 'ellipsis', 'img', 'tv', 'redirect')
			.get();
		return snap.docs
			.map((doc) => doc.data() as DocLike & { redirect?: string })
			.filter((doc) => !doc.redirect)
			.map((doc) => toThinCard(doc));
	} catch (error) {
		// Missing or still-building index: show the profile without the article list
		// rather than failing the page.
		console.error(`Error listing articles for author ${slug}:`, error);
		return [];
	}
}

export async function getMagazineCollection(slug: string): Promise<CollectionDoc | null> {
	const snap = await db.collection('collections').doc(slug).get();
	if (!snap.exists) return null;
	return snap.data() as CollectionDoc;
}

export async function getSearchMeta(): Promise<SearchMeta | null> {
	const snap = await db.collection('meta').doc('search').get();
	if (!snap.exists) return null;
	const data = snap.data() as SearchMeta;
	if (!data?.indexUrl) return null;
	return data;
}

export async function getMagazineStats(): Promise<{ articleCount: number; listedCount: number }> {
	const snap = await db.collection('meta').doc('stats').get();
	if (snap.exists) {
		const data = snap.data();
		const articleCount = Number(data?.articleCount);
		const listedCount = Number(data?.listedCount);
		if (Number.isFinite(articleCount) && Number.isFinite(listedCount)) {
			return { articleCount, listedCount };
		}
	}
	const home = await getMagazineCollection('home');
	const listedCount = home?.count ?? home?.cards?.length ?? 0;
	return { articleCount: listedCount, listedCount };
}

export type SiteStats = {
	articleCount: number;
	/** NaN until sync:rs-collections has merged the recipe counts into meta/stats. */
	recipeCount: number;
	freeCount: number;
};

async function fetchSiteStats(): Promise<SiteStats> {
	const snap = await db.collection('meta').doc('stats').get();
	const data = snap.exists ? snap.data() : undefined;
	return {
		articleCount: Number(data?.articleCount ?? 0),
		recipeCount: Number(data?.recipeCount),
		freeCount: Number(data?.freeCount),
	};
}

// Short in-memory TTL cache (same shape as getKviz's). The root layout calls this
// on *every* request; a count that is a minute stale is harmless. This keeps the
// uncached renders — the live /kviz/tabella leaderboard, and any cold serverless
// instance — from doing a Firestore stats read on every hit. Per instance.
const SITE_STATS_TTL_MS = 60_000;
let siteStatsCache: { data: SiteStats; ts: number } | null = null;
let siteStatsInflight: Promise<SiteStats> | null = null;

/**
 * One read for every count the root layout needs. `recipeCount`/`freeCount`
 * are merged into meta/stats by sync:rs-collections; callers fall back to
 * `collections/rs-home` while they are missing.
 */
export async function getSiteStats(): Promise<SiteStats> {
	// Serve from cache while fresh.
	if (siteStatsCache && Date.now() - siteStatsCache.ts < SITE_STATS_TTL_MS) {
		return siteStatsCache.data;
	}
	// Coalesce concurrent refreshes into one Firestore read.
	if (siteStatsInflight) return siteStatsInflight;
	siteStatsInflight = fetchSiteStats()
		.then((data) => {
			siteStatsCache = { data, ts: Date.now() };
			return data;
		})
		.catch((error) => {
			console.error('Error getting site stats:', error);
			// Serve stale cache if we have one; otherwise the same empty/NaN shape
			// as a missing meta/stats doc, so the rs-home fallback still kicks in.
			return siteStatsCache?.data ?? { articleCount: 0, recipeCount: NaN, freeCount: NaN };
		})
		.finally(() => { siteStatsInflight = null; });
	return siteStatsInflight;
}
