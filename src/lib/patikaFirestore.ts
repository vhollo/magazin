/**
 * SSR reader for `/patika`: one precomputed Firestore doc per request.
 *
 * Pattern mirrors `$lib/magazine/firestore` and `$lib/receptsarokFirestore`.
 * Falls back to `getPatika()` JSON when `collections/patika` is missing.
 */
import { db } from '$lib/firebase-admin';
import { getPatika } from '$lib/siteConf';

const COLLECTIONS = 'collections';

export const PATIKA_DOC = 'patika';

export type Patika = {
	patika: string;
	irsz?: string;
	varos?: string;
	cim?: string;
	email?: string;
	cegnev?: string;
};

export type PatikaDoc = {
	patikas: Patika[];
	count: number;
	generatedAt?: string;
};

async function readDoc<T>(docId: string): Promise<T | null> {
	const snap = await db.collection(COLLECTIONS).doc(docId).get();
	if (!snap.exists) return null;
	return snap.data() as T;
}

/** `/patika` list: aggregated single doc with every pharmacy entry. */
export async function getPatikaCollection(): Promise<PatikaDoc> {
	const stored = await readDoc<PatikaDoc>(PATIKA_DOC);
	if (stored && Array.isArray(stored.patikas)) return stored;
	const patikas = (await getPatika()) as Patika[];
	return { patikas, count: patikas.length };
}
