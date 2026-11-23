/**
 * Writes `_redirects` (project root) with Netlify rules that answer relative-link crawler
 * paths with a static 404 page, before the SvelteKit function is started.
 *
 * Run by `npm run build` before `vite build`; @sveltejs/adapter-netlify copies the root
 * `_redirects` into the publish directory and appends its own catch-all
 * (`* /.netlify/functions/sveltekit-render 200`) after these rules. Netlify uses the first
 * matching rule, so a matching path never reaches the function.
 *
 * The rules are the `_redirects` form of `isRelativeLinkArtifact`
 * (src/lib/magazine/relativeLinkArtifact.ts), built from the same section lists. Netlify
 * patterns have no regex: a placeholder (`:a`) matches one segment and a splat (`*`) only
 * the rest of the path, so there is one rule per (section, position) for positions
 * 1..MAX_INDEX. In the live MODX access log of 2026-10-31…11-23 the first offending
 * segment of every crawler page path was at position 1–5, and of 99.96% of the nested
 * `…/assets/…` file requests at position 1–6; a deeper one is not matched here and still
 * reaches the function, where `isRelativeLinkArtifact` handles it.
 *
 * Usage: tsx scripts/gen-relative-link-redirects.mts [outFile]
 */
import { writeFileSync } from 'node:fs';
import {
	LEGACY_RECIPE_CATEGORIES,
	LIVE_ROOT_SECTIONS,
	MAGAZINE_FOLDERS,
	ROOT_ASSETS_FOLDER
} from '../src/lib/magazine/relativeLinkArtifact.ts';

export const MAX_INDEX = 6;
export const NOT_FOUND_PAGE = '/relative-link-404.html';
/** Function name written by @sveltejs/adapter-netlify (lambda mode, split: false). */
export const RENDER_FUNCTION = '/.netlify/functions/sveltekit-render';
const NESTING_ROOTS = ['junior', 'rendezveny'];

/** MODX folders whose files stay on the MODX server (the manager too, for the editors). */
export const MODX_FILE_FOLDERS = [ROOT_ASSETS_FOLDER, 'manager', 'favicon'];

const hostOf = (url: string | undefined) => {
	try {
		return url ? new URL(url).hostname.replace(/^www\./, '') : '';
	} catch {
		return '';
	}
};

/**
 * Rule 0. The MODX file folders are redirected (301) to the MODX server, `PUBLIC_BASE_URL`
 * (the same base the synced content puts in front of every asset URL): before the domain
 * move `https://diabetes.hu/`, after it `https://old.diabetes.hu/`. A static redirect, so no
 * function run. `/favicon.ico` (requested by browsers and bots even with `<link rel="icon">`)
 * is answered with the site's own `static/icon.png`.
 *
 * If `PUBLIC_BASE_URL` points to this site itself (Netlify's `URL` build variable, `www.`
 * ignored), a redirect would loop, so the folders get the static 404 instead and the build
 * log warns: set `PUBLIC_BASE_URL` to the MODX server's own host.
 */
export function modxFolderRules(
	baseUrl = process.env.PUBLIC_BASE_URL || 'https://diabetes.hu/',
	siteUrl = process.env.URL
): string[] {
	const base = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
	const loops = !hostOf(base) || hostOf(base) === hostOf(siteUrl);
	if (loops)
		console.warn(
			`gen-relative-link-redirects: PUBLIC_BASE_URL (${baseUrl}) is this site (${siteUrl}) — MODX file folders get a 404`
		);
	return [
		...MODX_FILE_FOLDERS.map((folder) =>
			loops
				? `/${folder}/*  ${NOT_FOUND_PAGE}  404`
				: `/${folder}/*  ${base}${folder}/:splat  301`
		),
		'/favicon.ico  /icon.png  200'
	];
}

/** `/:a/:b` — `n` placeholders, one per segment before position `n`. */
const prefix = (n: number) =>
	Array.from({ length: n }, (_, k) => '/:' + String.fromCharCode(97 + k)).join('');

export function buildRules(): string[] {
	const block = (from: string) => [
		`${from}  ${NOT_FOUND_PAGE}  404`,
		`${from}/*  ${NOT_FOUND_PAGE}  404`
	];
	const rules: string[] = [];

	// 0. MODX root folders. `/assets/` holds the MODX files, whose subfolders are named like
	//    the sections (`/assets/cache/images/cikkek/…`), so rules 1–4 must never see them; it
	//    has to stay first. A file that exists in the publish directory (`static/assets/…`)
	//    is served before these non-forced rules.
	rules.push(...modxFolderRules());

	// 1. A live root section at any position 1..MAX_INDEX, except the two real nestings.
	for (let i = 1; i <= MAX_INDEX; i++) {
		for (const section of LIVE_ROOT_SECTIONS) {
			if (section === 'cikkek' && i === 2) continue; // see 3. and 4.
			if (section === 'receptsarok' && i === 3) {
				// `…/{lapszam}/receptsarok/{group}` is a real recipe group folder, unless the
				// next segment is an old root recipe category.
				for (const category of LEGACY_RECIPE_CATEGORIES)
					rules.push(...block(`${prefix(3)}/receptsarok/${category}`));
				continue;
			}
			rules.push(...block(`${prefix(i)}/${section}`));
		}
	}
	// 2. `junior/{ev}/cikkek/diabetes…` — the magazine folders exist only under the root `cikkek`.
	for (const root of NESTING_ROOTS)
		for (const folder of MAGAZINE_FOLDERS) rules.push(...block(`/${root}/:a/cikkek/${folder}`));
	// 3. `junior/{ev}/cikkek/…` and `rendezveny/{esemeny}/cikkek/…` are real: hand them to
	//    SvelteKit before rule 4 can match. Deeper crawler paths below them were caught by 1.
	for (const root of NESTING_ROOTS) {
		rules.push(`/${root}/:a/cikkek  ${RENDER_FUNCTION}  200`);
		rules.push(`/${root}/:a/cikkek/*  ${RENDER_FUNCTION}  200`);
	}
	// 4. `cikkek` as the third segment anywhere else.
	rules.push(...block(`${prefix(2)}/cikkek`));
	return rules;
}

if (import.meta.url === `file://${process.argv[1]}`) {
	const out = process.argv[2] ?? '_redirects';
	const rules = buildRules();
	writeFileSync(
		out,
		[
			'# GENERATED by scripts/gen-relative-link-redirects.mts during `npm run build` — do not edit.',
			'# Relative-link crawler paths -> static 404 page without starting the SvelteKit function.',
			...rules,
			''
		].join('\n')
	);
	console.log(`gen-relative-link-redirects: ${rules.length} rules -> ${out}`);
}
