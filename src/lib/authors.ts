import { env } from '$env/dynamic/public';

/**
 * One author, as stored in `authors/{slug}` (FireCMS-owned) and mirrored into the
 * `collections/authors` aggregate the site reads.
 *
 * Every text field holds plain text **with HTML entities intact** (`&#173;` soft
 * hyphens included) and no markup — render with `decodeHtmlEntities`, never with
 * `{@html}`. Multi-line values are arrays: in the source chunks a `<br>` always
 * separated list items (institution, department, city), never a prose line break.
 */
export type Author = {
	slug: string;
	name: string;
	prefix?: string;
	displayName: string;
	title?: string;
	affiliations?: string[];
	cv?: string[];
	quote?: string;
	/** Path relative to the MODX site root; use `authorPhotoUrl`. */
	photo?: string | null;
	links?: AuthorLink[];
	email?: string;
	support?: AuthorSupport | null;
	role?: string;
	published?: boolean;
	articleCount?: number;
};

export type AuthorLink = { label?: string; url?: string };

/** Donation box of the author's foundation — shown on the article and the profile. */
export type AuthorSupport = {
	lines?: string[];
	links?: AuthorLink[];
	email?: string;
	logo?: string | null;
};

/** Same default as the sync (`scripts/sync-modx-to-firestore.mjs`). */
const BASE_URL = env.PUBLIC_BASE_URL || 'https://www.diabetes.hu/';

/** Author images live on the MODX site, like every other magazine image. */
export function authorPhotoUrl(photo: string | null | undefined): string {
	if (!photo) return '';
	if (/^https?:\/\//i.test(photo)) return photo;
	return BASE_URL + String(photo).replace(/^\/+/, '');
}
