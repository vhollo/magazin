import { db } from '$lib/firebase-admin';
import { encodeDocPathId } from '$lib/magazine/docPathId';
import type { DocLike, ThinCard } from '$lib/modx/collections';
import { collectionQueries } from '$lib/modx/collections';

export type MagazineArticle = DocLike & {
	relatedCards?: ThinCard[];
};

export type CollectionDoc = {
	slug?: string;
	queryTags?: string[];
	cards: ThinCard[];
	count?: number;
	generatedAt?: string;
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
