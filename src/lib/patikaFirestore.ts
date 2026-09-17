/**
 * SSR reader for `/patika`: one precomputed Firestore doc per request.
 *
 * Pattern mirrors `$lib/magazine/firestore` and `$lib/receptsarokFirestore`.
 * Falls back to `getPatika()` JSON when `collections/patika` is missing.
 */
import { db } from "$lib/firebase-admin";
import { getPatika } from "$lib/siteConf";
import { withPatikaKeys } from "$lib/patikaKey";

const COLLECTIONS = "collections";

export const PATIKA_DOC = "patika";

export type Patika = {
  /** Source Firestore document id, when the entry was synced with one. */
  id?: string;
  patika: string;
  irsz?: string;
  varos?: string;
  cim?: string;
  email?: string;
  cegnev?: string;
};

/** A `Patika` after `withPatikaKeys()` — `id` is present and list-unique. */
export type KeyedPatika = Patika & { id: string };

/** Shape as stored in Firestore: entries may predate the id-carrying sync. */
type StoredPatikaDoc = {
  patikas: Patika[];
  count: number;
  generatedAt?: string;
};

export type PatikaDoc = {
  patikas: KeyedPatika[];
  count: number;
  generatedAt?: string;
};

async function readDoc<T>(docId: string): Promise<T | null> {
  const snap = await db.collection(COLLECTIONS).doc(docId).get();
  if (!snap.exists) return null;
  return snap.data() as T;
}

/**
 * `/patika` list: aggregated single doc with every pharmacy entry.
 *
 * Both branches go through `withPatikaKeys()`, so every consumer gets entries
 * with a unique `id` regardless of which path served them or how old the stored
 * doc is. This is the only place that guarantee is established.
 */
export async function getPatikaCollection(): Promise<PatikaDoc> {
  const stored = await readDoc<StoredPatikaDoc>(PATIKA_DOC);
  if (stored && Array.isArray(stored.patikas)) {
    return { ...stored, patikas: withPatikaKeys(stored.patikas) };
  }
  const patikas = withPatikaKeys((await getPatika()) as Patika[]);
  return { patikas, count: patikas.length };
}
