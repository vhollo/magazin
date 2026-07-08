/**
 * Shared tag-collection definitions and projection helpers used by:
 *   - the SvelteKit route at `/[...path]` (filtering listedDocs on the fly), and
 *   - the MODX → Firestore sync worker (precomputing `collections/{slug}` docs).
 *
 * Keep the `collectionQueries` map and the ranking algorithm in lockstep with
 * `src/routes/[...path]/+layout.server.ts` so the pre-built collection docs
 * match what the route would compute on the fly.
 */

/** Tag-collection queries used by `/[...path]` route slugs. */
export const collectionQueries: Record<string, string[]> = {
	's-o-s': ['diabpont', 'edukáció', '-covid-19'],
	junior: ['+junior', '-covid-19'],
	gdm: ['+várandósság', '-személyes'],
	varandossag: ['+várandósság', '+személyes'],
	gyermekvallalas: ['+várandósság', 'edukáció'],
	inzulinok: ['+inzulin', 'piac', 'kezelés', '-önellenőrzés'],
	gyogyszerek: ['+gyógyszer', 'piac', 'kezelés', '-önellenőrzés'],
	'technikai-eszkozok': ['+készülék', 'piac', 'kezelés', '-önellenőrzés', '-megelőzés'],
	receptek: ['recept', '-táplálkozás'],
	taplalkozas: ['+táplálkozás', '+edukáció', '-recept', '-covid-19'],
	'orvos-beteg': [
		'+orvosok',
		'+személyes',
		'psziché',
		'kezelés',
		'edukáció',
		'önellenőrzés',
		'társbetegségek',
		'szövődmények',
		'-elismerés',
		'-covid-19'
	],
	onmenedzseles: ['önellenőrzés', '-covid-19'],
	testmozgas: ['testmozgás', '-covid-19'],
	psziche: ['psziché', '-covid-19'],
	muveszet: ['művészet', '-covid-19'],
	'jogi-utmutatok': ['jog', '-covid-19'],
	idegrendszer: ['+neuropátia', 'szövődmények', 'edukáció', '-covid-19'],
	vese: ['vese'],
	latas: ['retinopátia'],
	vegtagok: ['neuropátia', 'megelőzés'],
	'sziv-errendszer': ['hypertonia', '-covid-19'],
	tarsbetegsegek: ['társbetegségek', '-covid-19'],
	megelozes: ['+megelőzés', '+szövődmények', '-covid-19'],
	kozosseg: ['+közösség', '+személyes', '-egyesület', '-rendezvény', '-covid-19'],
	egyesulet: ['+egyesület', '-covid-19'],
	esemenyek: [
		'beszámoló',
		'közösség',
		'egyesület',
		'-személyes',
		'-rendezvény',
		'-covid-19'
	],
	rendezvenyek: ['+rendezvény', '-covid-19'],
	gyogyitok: [
		'+személyes',
		'#orvosok',
		'szakellátás',
		'elismerés',
		'-kezelés',
		'-covid-19'
	],
	sorstarsak: [
		'+személyes',
		'elismerés',
		'-szakellátás',
		'-orvosok',
		'-önellenőrzés',
		'-kezelés',
		'-várandósság',
		'-közösség',
		'-edukáció',
		'-egyesület',
		'-covid-19'
	],
	// `parent==1` news is auto-tagged `hírek` (transform.ts); editors also tag other
	// docs by hand and often type `hirek` without the accent — accept both so the two
	// sources merge into one news bucket.
	hirek: ['hírek', 'hirek'],
	diaeuro: ['+diaeuro'],
	all: []
};

/** Top-N for each collection (18 * 4 = 72) — matches `docsByTags` page size. */
export const COLLECTION_LIMIT = 18 * 4;

export type Tv = {
	tags?: string[];
	szerzo?: Array<{ val?: string; name?: string; full?: string }>;
	cat?: string;
	ogi?: string;
};

export type DocLike = {
	id?: number | string;
	path?: string;
	title?: string;
	longtitle?: string;
	description?: string;
	ellipsis?: string;
	img?: unknown;
	video?: string;
	table?: boolean;
	redirect?: string;
	isfolder?: boolean | number;
	editedon?: number;
	publishedon?: number;
	tv?: Tv;
};

export type ThinCard = {
	id?: number | string;
	path?: string;
	title?: string;
	longtitle?: string;
	description?: string;
	ellipsis?: string;
	img?: unknown;
	video?: string;
	table?: boolean;
	tv: { tags: string[]; szerzo: Array<{ val?: string; name?: string }> };
	rank?: number;
};

/** Compact projection of a processed doc suitable for grid/card rendering. */
export function toThinCard(doc: DocLike, rank?: number): ThinCard {
	const tags = doc.tv?.tags ?? [];
	const szerzo = (doc.tv?.szerzo ?? []).map((s) => ({ val: s?.val, name: s?.name }));
	const card: ThinCard = {
		id: doc.id,
		path: doc.path,
		title: doc.title,
		longtitle: doc.longtitle,
		description: doc.description,
		ellipsis: doc.ellipsis,
		img: doc.img,
		video: doc.video,
		table: doc.table,
		tv: { tags, szerzo }
	};
	if (typeof rank === 'number') card.rank = rank;
	return card;
}

/** True for docs eligible to appear in card lists (collections, home, related). */
export function isListedDoc(doc: DocLike): boolean {
	if (doc.redirect) return false;
	const tags = doc.tv?.tags ?? [];
	if (!tags.length) return false;
	if (tags[0] === 'folder') return false;
	return true;
}

/**
 * Compute the per-doc rank for a tag query. Faithful translation of the
 * algorithm in `src/routes/[...path]/+layout.server.ts` so the precomputed
 * collection docs match what the live route would produce.
 *
 * Tag prefixes:
 *   `+tag` — required (10 points)
 *   `#tag` — important (2 points)
 *   `tag`  — optional (1 point)
 *   `-tag` — excluded (any match zeroes the base rank, but bonus tags can
 *            still raise it — preserved from the legacy algorithm).
 */
export function rankDocByTags(doc: DocLike, queryTags: string[]): number {
	const docTags = doc.tv?.tags ?? [];
	const hasNegated = docTags.some((t) => queryTags.includes(`-${t}`));
	const baseRank =
		queryTags.length > 0 && !hasNegated
			? docTags.filter(
					(t) =>
						queryTags.includes(t) ||
						queryTags.includes(`+${t}`) ||
						queryTags.includes(`#${t}`)
				).length
			: 0;
	const bonusRequired =
		docTags.filter((t) => queryTags.includes(`+${t}`)).length * 10;
	const bonusImportant =
		docTags.filter((t) => queryTags.includes(`#${t}`)).length * 2;
	return bonusRequired + bonusImportant + baseRank;
}

/**
 * Return the top `COLLECTION_LIMIT` listed docs matching a tag query, sorted by
 * rank descending, then `publishedon` descending (newest first) as a tie-break.
 * Does NOT mutate inputs. Mirrors `docsByTags` in the route.
 *
 * The `publishedon` tie-break is what orders all-optional-tag collections like
 * `hirek` (`['hírek', 'hirek']`), where every match scores rank 1 — without it they
 * would fall back to arbitrary projection order. For rank-discriminating collections
 * it only reorders docs within an equal rank bucket.
 *
 * Folders (`isfolder`) are skipped by default. Pass `includeFolders: true` to admit
 * content-tagged folders — a folder then appears in every collection one of its tags
 * matches (folders whose first tag is `folder` are already dropped upstream by
 * `isListedDoc`, so this only admits folders with real content tags). Collection
 * building enables this; the related-cards tag-based fallback keeps the default so
 * folder hubs don't surface as "similar articles".
 *
 * Returns docs with an injected `rank` field. Callers should typically project
 * each with `toThinCard(doc, doc.rank)` before writing to Firestore.
 */
export function docsByTags<T extends DocLike>(
	listedDocs: T[],
	queryTags: string[],
	excludeId?: string | number | null,
	{ includeFolders = false }: { includeFolders?: boolean } = {}
): Array<T & { rank: number }> {
	const ranked: Array<T & { rank: number }> = [];
	const exclude = excludeId == null ? null : String(excludeId);
	for (const doc of listedDocs) {
		if (doc.isfolder && !includeFolders) continue;
		if (exclude != null && doc.id != null && String(doc.id) === exclude) continue;
		const rank = rankDocByTags(doc, queryTags);
		if (rank > 0) ranked.push({ ...doc, rank } as T & { rank: number });
	}
	ranked.sort(
		(a, b) =>
			b.rank - a.rank || Number(b.publishedon ?? 0) - Number(a.publishedon ?? 0)
	);
	return ranked.slice(0, COLLECTION_LIMIT);
}

/**
 * News tags for the home grid — same pair the `hirek` collection accepts
 * (`parent==1` rows are auto-tagged `hírek`; editors often type `hirek` unaccented).
 */
const NEWS_TAGS = ['hírek', 'hirek'];

/** True if a doc carries a news tag. */
export function isNewsDoc(doc: DocLike): boolean {
	const tags = doc.tv?.tags ?? [];
	return tags.some((t) => NEWS_TAGS.includes(t));
}

/**
 * Top N docs for the `collections/home` grid (publishedon desc, id desc tie-break).
 * Homepage redesign 2026: no longer "latest of everything" — only expert picks
 * (`isExpertDoc`: Dr.-authored + expert-tagged) merged with the latest news
 * (`isNewsDoc`), so a new visitor meets curated professional content plus news.
 */
export function homeDocs<T extends DocLike>(listedDocs: T[]): T[] {
	return listedDocs
		.filter((doc) => isExpertDoc(doc) || isNewsDoc(doc))
		.sort(
			(a, b) =>
				Number(b.publishedon ?? 0) - Number(a.publishedon ?? 0) ||
				Number(b.id ?? 0) - Number(a.id ?? 0)
		)
		.slice(0, COLLECTION_LIMIT);
}

/**
 * Tags that mark a doc as suitable for the home page's "Szakértőink válogatása"
 * (expert picks) section — combined with the "Dr." author check in `isExpertDoc`.
 */
export const EXPERT_TAGS = [
	'edukáció',
	'jog',
	'kezelés',
	'lexikon',
	'neuropátia',
	'piac',
	'retinopátia',
	'szakellátás',
	'szövődmények',
	'társbetegségek',
	'vese',
	'önellenőrzés',
	'táplálkozás'
];

/** Top-N for the `collections/home` `expertCards` field. */
export const EXPERT_LIMIT = 24;

/**
 * True if any author name on the doc carries a "Dr." title, as a standalone token
 * (prefix "Dr. Kovács János" or Hungarian postfix "Kovács János dr."). Tokenizes on
 * whitespace rather than using a `\b`-based regex — JS regex word boundaries only
 * recognize ASCII word characters, so `\bdr\b` would false-positive inside names
 * like "Drágffy" (the accented "á" reads as a boundary right after "Dr").
 */
function hasDoctorAuthor(doc: DocLike): boolean {
	return (doc.tv?.szerzo ?? []).some((s) =>
		(s?.name ?? '')
			.split(/\s+/)
			.some((token) => token.replace(/\.+$/, '').toLowerCase() === 'dr')
	);
}

/** True if a doc qualifies for the expert-picks section: Dr.-authored AND tagged with an expert topic. */
export function isExpertDoc(doc: DocLike): boolean {
	if (!hasDoctorAuthor(doc)) return false;
	const tags = doc.tv?.tags ?? [];
	return tags.some((t) => EXPERT_TAGS.includes(t));
}

/**
 * Top `EXPERT_LIMIT` Dr.-authored, expert-tagged listed docs for the home page's
 * "Szakértőink válogatása" section, sorted by `publishedon` desc, `id` desc tie-break.
 * Mirrors `homeDocs` but pre-filtered — stored as `collections/home.expertCards`
 * alongside the general `cards`, so the home route stays a single Firestore read.
 */
export function expertDocs<T extends DocLike>(listedDocs: T[]): T[] {
	return listedDocs
		.filter(isExpertDoc)
		.sort(
			(a, b) =>
				Number(b.publishedon ?? 0) - Number(a.publishedon ?? 0) ||
				Number(b.id ?? 0) - Number(a.id ?? 0)
		)
		.slice(0, EXPERT_LIMIT);
}
