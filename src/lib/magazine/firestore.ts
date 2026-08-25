import { db } from '$lib/firebase-admin';
import { encodeDocPathId } from '$lib/magazine/docPathId';
import type { DocLike, ThinCard } from '$lib/modx/collections';
import { collectionQueries, toThinCard } from '$lib/modx/collections';

export type MagazineArticle = DocLike & {
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
 * Sibling magazine recipe articles under the same MODX parent that redirect into
 * Receptsarok — e.g. hypertonia/1601 hub (1689) listing four `recept` siblings.
 */
export async function getSiblingReceptModxIds(
	parentModxId: number,
	excludeModxId: number
): Promise<number[]> {
	const snap = await db
		.collection('docs')
		.where('parent', '==', parentModxId)
		.select('id', 'tv', 'redirect')
		.get();
	return snap.docs
		.map((d) => ({
			id: Number(d.get('id')),
			tags: (d.get('tv') as { tags?: string[] } | undefined)?.tags,
			redirect: String(d.get('redirect') ?? '')
		}))
		.filter(
			({ id, tags, redirect }) =>
				Number.isFinite(id) &&
				id !== excludeModxId &&
				tags?.includes('recept') &&
				redirect.startsWith('/receptsarok/')
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
