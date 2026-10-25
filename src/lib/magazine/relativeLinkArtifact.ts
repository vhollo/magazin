/**
 * Paths that are not dead links but relative links resolved against the wrong base.
 *
 * The live MODX site writes every internal link root-relative without the leading slash
 * (`href="alapitvany/rolunk"`, `href="cikkek/diabetes/2604/…"`) and relies on
 * `<base href="/">`. A crawler that ignores `<base>` appends them to the current page's
 * folder, and keeps appending on the resulting 404 page:
 * `cikkek/diabetes/0803/cikkek/alapitvany/receptsarok/haletelek/…`. The MODX 404 page runs
 * the load-test iframe, so these reach this site. In the Simple Analytics export of
 * 2026-10-23/24 they were 140 of the 142 `/404/…` visits.
 *
 * Rule: a live root section appears below the root. No real document path does that,
 * except the two nestings the MODX tree really has (see below). Checked against every
 * listed article and recipe path (4660). Add a section here when the live site gets a
 * new root-level page that its templates link to.
 */

/** First segments of real paths, plus the root-level pages the live templates link to. */
const LIVE_ROOT_SECTIONS = new Set([
	'cikkek',
	'receptsarok',
	'hirek',
	'alapitvany',
	'junior',
	'rendezveny',
	'diaeuro-futsal',
	'oktatas',
	'findrisk',
	'clicks',
	'patika',
	'kiadvanyok',
	'adatkezelesi-tajekoztato'
]);

/** Old MODX `receptsarok/{category}` folders — only ever at the root. */
const LEGACY_RECIPE_CATEGORIES = new Set([
	'levesek',
	'zoldsegetelek',
	'haletelek',
	'husetelek',
	'egytaletelek',
	'koretek-italok-hidegkonyha',
	'desszertek'
]);

/** Magazine folders — only directly under the root `cikkek`. */
const MAGAZINE_FOLDERS = new Set(['diabetes', 'hypertonia']);

export function isRelativeLinkArtifact(path: string): boolean {
	const segments = path.split('/').filter(Boolean);
	return segments.some((segment, i) => {
		if (i === 0 || !LIVE_ROOT_SECTIONS.has(segment)) return false;
		const next = segments[i + 1] ?? '';
		// `junior/{ev}/cikkek/…`, `rendezveny/{esemeny}/cikkek/…`
		if (
			segment === 'cikkek' &&
			i === 2 &&
			(segments[0] === 'junior' || segments[0] === 'rendezveny') &&
			!MAGAZINE_FOLDERS.has(next)
		)
			return false;
		// Recipe group folders: `cikkek/{mag}/{lapszam}/receptsarok`, `junior/{ev}/cikkek/receptsarok`
		if (segment === 'receptsarok' && i === 3 && !LEGACY_RECIPE_CATEGORIES.has(next)) return false;
		return true;
	});
}
