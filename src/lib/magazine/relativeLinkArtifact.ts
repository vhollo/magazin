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
 *
 * The same happens to the templates' relative file links (`src="assets/cache/images/…"`):
 * `cikkek/diabetes/1503/assets/cache/images/…png`, ~162k requests per 30 days in the MODX
 * access log of 2026-10-31…11-23, mostly from one bot on AWS addresses. So `assets` is in the
 * section list too. Paths under the root `/assets/` folder are files (the MODX image cache has
 * subfolders named `cikkek`, `receptsarok`, …), never artifacts.
 *
 * The live MODX site rejects the same paths with 410 via an .htaccess block:
 * scripts/modx/htaccess-relative-link-artifacts.conf. Keep the two rules in sync.
 */

/** First segments of real paths, plus the root-level pages the live templates link to. */
export const LIVE_ROOT_SECTIONS = new Set([
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
	'adatkezelesi-tajekoztato',
	// The MODX file folder: the templates link images, PDFs and videos as `assets/…`.
	'assets'
]);

/** Root folder of the MODX files; everything below it is a file path. */
export const ROOT_ASSETS_FOLDER = 'assets';

/** Old MODX `receptsarok/{category}` folders — only ever at the root. */
export const LEGACY_RECIPE_CATEGORIES = new Set([
	'levesek',
	'zoldsegetelek',
	'haletelek',
	'husetelek',
	'egytaletelek',
	'koretek-italok-hidegkonyha',
	'desszertek'
]);

/** Magazine folders — only directly under the root `cikkek`. */
export const MAGAZINE_FOLDERS = new Set(['diabetes', 'hypertonia']);

export function isRelativeLinkArtifact(path: string): boolean {
	const segments = path.split('/').filter(Boolean);
	if (segments[0] === ROOT_ASSETS_FOLDER) return false;
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
