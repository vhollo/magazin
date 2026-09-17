/**
 * Stable, unique keys for the pharmacies behind `/patika`.
 *
 * A pharmacy name does not identify a row: "KORONA PATIKA" is a chain with
 * branches in several towns. Keying the MiniSearch index on `patika` therefore
 * threw `duplicate ID` and took the whole page down.
 *
 * Neither data path carries a key that can be leaned on unconditionally:
 *
 *   • `collections/patika` — now carries the source Firestore document id, but
 *     only for entries written since `sync-patika-collection.mjs` started
 *     keeping it; the doc currently in production predates that.
 *   • `src/lib/data/patika.json` — the bundled fallback snapshot, refreshed
 *     only on a credentialed dev/build run, so copies in the repo lag behind.
 *
 * So prefer the Firestore id, fall back to a slug of the fields that identify a
 * branch, and break any remaining tie with a counter. The result is unique *by
 * construction*, which is the property the index actually needs — a derived key
 * alone would only be unique as long as the data happens to cooperate.
 */

export interface PatikaLike {
  id?: string;
  patika?: string;
  irsz?: string | number;
  varos?: string;
  cim?: string;
}

/**
 * Accent-folded, punctuation-free slug. NFD decomposition handles the Hungarian
 * long vowels (ő, ű) that a plain a-z fold would otherwise drop entirely.
 */
function slug(value: string | number | undefined): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** The fields that together pin down one branch of a chain. */
function derivedKey(patika: PatikaLike): string {
  return [patika.patika, patika.irsz, patika.varos, patika.cim]
    .map(slug)
    .filter(Boolean)
    .join("_");
}

/**
 * Give every entry an `id` that is unique within the list.
 *
 * Callers can index and key on the result without re-checking for collisions.
 * Note that a content-derived key changes if the branch's name or address is
 * corrected upstream; entries carrying a real Firestore id keep it across such
 * an edit, which is why that is preferred when present.
 */
export function withPatikaKeys<T extends PatikaLike>(
  patikas: T[],
): (T & { id: string })[] {
  const seen = new Map<string, number>();
  return patikas.map((patika, index) => {
    const base =
      (typeof patika.id === "string" && patika.id) ||
      derivedKey(patika) ||
      `patika-${index}`;
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    return { ...patika, id: count === 1 ? base : `${base}-${count}` };
  });
}
