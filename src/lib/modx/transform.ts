import fs from 'node:fs';
import { fromHtmlEntities } from '../utils/index';
import { decodeHtmlEntities } from '../htmlEntities.js';
import { extractLinkedModxIds } from '../modxLinkedRecipes.js';

export interface TemplateVariable {
	tmplvarid: number;
	value: string;
	contentid: number;
}

/**
 * An author as stored in Firestore `authors/{slug}` (only the fields the
 * transform needs to resolve a `szerzo` TV value onto a record).
 */
export interface AuthorRecord {
	slug: string;
	name: string;
	displayName: string;
	/** `szerzo` TV values from before the slug migration, e.g. `Dr._Kováts_Boglárka`. */
	legacyTokens?: string[];
}

/** One author on a doc: the link is the slug, the name is what gets rendered. */
export interface DocAuthor {
	slug: string;
	name: string;
}

/** Loose MODX row / processed doc shape used during the transform pipeline. */
export type ModxDoc = Record<string, any>;

export interface ProcessedDocFields {
	id: number;
	path: string;
	alias: string;
	parent: number;
	title: string;
	longtitle: string;
	description: string;
	content: string;
	introtext: string;
	img: ModxDoc['img'];
	tv: ModxDoc['tv'];
	/** Recipe-group keys (`{year}-{id}`), written post-transform by the related pass — not from MODX. */
	related?: string[];
	ellipsis: string;
	table: boolean;
	video: string;
	redirect?: string;
	publishedon: number;
	editedon: number;
	isfolder: boolean;
	/** MODX doc ids from the article's "További receptek" list (curated related recipes). */
	linkedModxIds?: number[];
	/** Author slugs, flattened from `tv.szerzo` for `array-contains` queries. */
	authorSlugs?: string[];
}

export type ReceptsarokRedirectMaps = {
	byContentId: Map<number, string>;
	byPath: Map<string, string>;
};

export interface ModxTransformDeps {
	publicBaseUrl: string;
	tmplvarContentvalues: TemplateVariable[];
	/** `authors/{slug}` records — the source of truth for bylines (see `collections/authors`). */
	authors: AuthorRecord[];
	/** Returns the current full document list (for path resolution and MODX links). */
	getEveryDocs: () => ModxDoc[];
	redirectMaps?: ReceptsarokRedirectMaps;
	/**
	 * Log a warning when a doc's parent can't be resolved during path building.
	 * Off by default: path resolution runs in multiple passes (ancestors, then
	 * changed rows), so a parent is routinely absent on an early pass and present
	 * on a later one — making the warning a false positive. Genuinely unresolvable
	 * rows are caught at write time by the sync's `skip write:` guards.
	 */
	debugUnresolvedParents?: boolean;
}

export interface ModxTransform {
	addTVs: (doc: ModxDoc) => void;
	findPath: (doc: ModxDoc) => ModxDoc;
	extraTags: (doc: ModxDoc) => void;
	nagyito: (doc: ModxDoc) => void;
	alapjav: (doc: ModxDoc) => void;
	ellipsis: (doc: ModxDoc) => void;
	docFields: (doc: ModxDoc) => ProcessedDocFields;
	referenceDocFields: (doc: ModxDoc) => ProcessedDocFields;
	setReceptsarokRedirect: (doc: ModxDoc, fallbackRedirect?: string) => void;
	setReferenceRedirect: (doc: ModxDoc) => void;
	isReferenceDoc: (doc: ModxDoc) => boolean;
}

type RedirectManifestEntry = {
	modxContentId?: number;
	path?: string;
	year?: number;
	id?: string;
};

const cats: Record<string, string> = {
	null: '',
	orvos: 'Orvosok üzenetei',
	szemle: 'Hasznos tudnivalók',
	elet: 'Személyes történetek',
	mod: 'Egészséges életmód',
	recept: 'Receptek'
};

function normalizeDocPath(pathValue: unknown): string {
	return String(pathValue ?? '')
		.trim()
		.replace(/^\/+/, '');
}

/** MODX Evolution `reference` (= manager "weblink"); Revolution uses `weblink`. */
export function isModxReferenceType(type: unknown): boolean {
	return type === 'reference' || type === 'weblink';
}

export function parseModxReferenceTargetId(content: unknown): number | undefined {
	const trimmed = String(content ?? '').trim();
	if (!/^\d+$/.test(trimmed)) return undefined;
	const id = Number(trimmed);
	return Number.isFinite(id) && id > 0 ? id : undefined;
}

export function isRootReferenceDoc(doc: ModxDoc): boolean {
	return Number(doc.parent) === 0 && isModxReferenceType(doc.type);
}

export function loadReceptsarokRedirectMaps(manifestPath: string): ReceptsarokRedirectMaps {
	const byContentId = new Map<number, string>();
	const byPath = new Map<string, string>();

	try {
		const raw = fs.readFileSync(manifestPath, 'utf8');
		const parsed = JSON.parse(raw);
		const entries: RedirectManifestEntry[] = Array.isArray(parsed)
			? parsed
			: Array.isArray(parsed?.entries)
				? parsed.entries
				: [];

		for (const entry of entries) {
			const year = Number(entry?.year);
			const id = typeof entry?.id === 'string' ? entry.id.trim() : '';
			if (!Number.isFinite(year) || !id) continue;

			const redirect = `/receptsarok/${year}/${encodeURIComponent(id)}`;
			if (Number.isFinite(entry?.modxContentId)) {
				byContentId.set(Number(entry.modxContentId), redirect);
			}
			const keyPath = normalizeDocPath(entry?.path);
			if (keyPath) byPath.set(keyPath, redirect);
		}
	} catch {
		// Missing manifest is expected in normal development.
	}

	return { byContentId, byPath };
}

/** Plain-text alt from a desc that may contain HTML (e.g. an <a> link). Decode entities, strip tags, collapse whitespace, escape quotes so the attribute stays valid. */
function descToAltText(desc: string): string {
	if (!desc) return '';
	return decodeHtmlEntities(desc)
		.replace(/<[^>]+>/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
		.replace(/"/g, '&quot;');
}

function renderNagyitoHtml(img: {
	file: string;
	desc: string;
	align: string;
	zoom: string;
	bg: string;
}): string {
	const zoomAttr = img.zoom ? ' class="zoom"' : '';
	const figcaption = img.desc ? `<figcaption class="">${img.desc}</figcaption>` : '';
	return `<figure class="${img.align}"><img src="${img.file}" alt="${descToAltText(img.desc)}"${zoomAttr} data-theme="dark" style="background-color: ${img.bg}">${figcaption}</figure>`;
}

/** [[nagyito? …]], [[-nagyito? …-]] (MODX comment), [[!nagyito? …]] */
const NAGYITO_TAG_RE = /\[\[[!-]?nagyito\??([\s\S]*?)(?:\]\]|-\]\])/gi;
/** Uncached MODX tag */
const NAGYITO_UNCACHED_RE = /\[!nagyito([\s\S]*?)!\]/gi;
const NAGYITO_TAG_LEFT_RE = /\[\[[!-]?nagyito\??[\s\S]*?(?:\]\]|-\]\])/gi;
const NAGYITO_UNCACHED_LEFT_RE = /\[!nagyito[\s\S]*?!\]/gi;

function decodeModxParamEntities(params: string): string {
	return params.replace(/&amp;/g, '&');
}

function nagyitoAttr(params: string, name: string): string {
	const m = decodeModxParamEntities(params).match(new RegExp(`${name}=\`([^\`]*)\``, 'i'));
	return m?.[1] ?? '';
}

function resolveNagyitoImage(
	params: string,
	publicBaseUrl: string
): { file?: string; rel?: string } {
	const fileKey = nagyitoAttr(params, 'file');
	if (fileKey) return { file: publicBaseUrl + 'assets/images/' + fileKey, rel: fileKey };
	const pathKey = nagyitoAttr(params, 'path');
	if (pathKey) return { file: publicBaseUrl + pathKey, rel: pathKey };
	const urlKey = nagyitoAttr(params, 'url');
	if (urlKey) return { file: publicBaseUrl + urlKey, rel: urlKey };
	return {};
}

function replaceNagyitoTags(html: string, doc: ModxDoc, publicBaseUrl: string): string {
	if (!html || !/nagyito/i.test(html)) return html;

	let out = html.replaceAll('`/assets', '`assets');

	const replaceOne = (full: string, params: string) => {
		if (/^\[\[-/.test(full)) return '';
		const { file, rel } = resolveNagyitoImage(params, publicBaseUrl);
		if (!file || !rel) return '';
		if (doc.img?.src?.includes(rel)) return '<!-- PAGEIMAGE -->';
		return renderNagyitoHtml({
			file,
			desc: nagyitoAttr(params, 'desc'),
			align: nagyitoAttr(params, 'align') || 'center',
			zoom: nagyitoAttr(params, 'zoom') || '',
			bg: nagyitoAttr(params, 'bg') || 'white'
		});
	};

	out = out.replace(NAGYITO_TAG_RE, (full, params) => replaceOne(full, params) || '');
	out = out.replace(NAGYITO_UNCACHED_RE, (full, params) => replaceOne(full, params) || '');
	out = out.replace(NAGYITO_TAG_LEFT_RE, '').replace(NAGYITO_UNCACHED_LEFT_RE, '');
	return out;
}

export function createModxTransform(deps: ModxTransformDeps): ModxTransform {
	const {
		publicBaseUrl,
		tmplvarContentvalues,
		authors,
		getEveryDocs,
		redirectMaps,
		debugUnresolvedParents = false
	} = deps;

	/**
	 * `szerzo` TV value → author record. The TV is a free-text field an editor
	 * types by hand, so three spellings have to resolve: the slug (what the
	 * migration writes), the pre-migration token, and the plain name.
	 */
	const authorByKey = new Map<string, AuthorRecord>();
	const authorKey = (value: string) =>
		value.replaceAll('_', ' ').normalize('NFC').toLowerCase().replace(/[.\s]+/g, ' ').trim();
	for (const author of authors) {
		if (!author?.slug) continue;
		authorByKey.set(author.slug, author);
		for (const key of [author.displayName, author.name, ...(author.legacyTokens ?? [])]) {
			if (key) authorByKey.set(authorKey(key), author);
		}
	}

	const findPath = (doc: ModxDoc): ModxDoc => {
		if (!doc.path) {
			if (doc.parent == 0) {
				doc.path = doc.alias;
			} else if (doc.parent == 1) {
				doc.path = 'hirek/' + doc.alias;
			} else {
				const parentDoc = getEveryDocs().find((d) => d.id == doc.parent);
				if (!parentDoc) {
					if (debugUnresolvedParents) {
						console.log('parentDoc not found', doc.id, '(parent', doc.parent + ')');
					}
					return doc;
				}
				const parent = findPath(parentDoc);
				if (!parent.tv?.tags?.includes('folder')) {
					parent.tv = parent.tv || { tags: [] };
					parent.tv.tags.push('folder');
				}
				doc.path = [parent.path || '', doc.alias].filter((x) => x).join('/');
				const contentTags = (doc.tv?.tags ?? []).filter((t: string) => t !== 'folder');
				if (
					typeof doc.path === 'string' &&
					doc.path.includes('junior') &&
					contentTags.length > 0 &&
					!doc.tv?.tags?.includes('recept')
				) {
					doc.tv = doc.tv || {};
					doc.tv.tags = doc.tv.tags || [];
					if (!doc.tv.tags.includes('junior')) {
						doc.tv.tags.push('junior');
					}
				}
			}
		}
		return doc;
	};

	const pathById = (p1: number): string => {
		let doc = getEveryDocs().find((d) => d.id == p1);
		if (!doc) {
			return '';
		}
		if (!doc.path) doc = findPath(doc);
		return `/${doc.path}`;
	};

	const addTVs = (doc: ModxDoc) => {
		const tvs: TemplateVariable[] =
			tmplvarContentvalues.filter((tv) => tv.contentid == doc.id) || [];
		doc.tv = {};

		const cat: string = tvs.find((tv) => tv.tmplvarid == 23)?.value || 'null';
		doc.tv.cat = cats[cat];

		const tags = tvs.find((tv) => tv.tmplvarid == 3)?.value || '';
		doc.tv.tags =
			tags
				.replace('diabetes', '')
				.replace('terhesség', 'várandósság')
				.replace('családorvos', 'orvos')
				.split(' ')
				.filter((t) => t != '') || [];
		if (tvs.find((tv) => tv.tmplvarid == 30) || doc.description.match(/diabpont/gi)) {
			doc.tv.tags.push('diabpont');
			doc.description = 'DiabPONT Továbbképző Program'; // TODO: létező description-t ne írjunk felül; DiabPONT chunk a cikk végére.
		}

		// Authors: the TV holds one token per author, resolved onto an `authors/{slug}`
		// record. A token with no record (an author who never had a chunk) still shows
		// up as a byline — just as a plain name, with no profile to link to.
		doc.tv.szerzo = [];
		const authorTokens = tvs.find((tv) => tv.tmplvarid == 18)?.value.split(' ') || [];

		for (const token of authorTokens) {
			if (!token) continue;
			const author = authorByKey.get(token) ?? authorByKey.get(authorKey(token));
			const entry: DocAuthor = {
				slug: author?.slug ?? '',
				name: author?.displayName || token.replaceAll('_', ' ').normalize('NFC')
			};
			doc.tv.szerzo.push(entry);
		}
		const authorSlugs = [
			...new Set((doc.tv.szerzo as DocAuthor[]).map((sz) => sz.slug).filter(Boolean))
		];
		if (authorSlugs.length) doc.authorSlugs = authorSlugs;
		else delete doc.authorSlugs;

		const pos = tvs.find((tv) => tv.tmplvarid == 29)?.value || '50% 40%';
		const img = tvs.find((tv) => tv.tmplvarid == 4)?.value || '';
		doc.img =
			(img && {
				src: (img && publicBaseUrl + img) || '',
				pos: pos.replace('T', '50% 5%').replace('B', '50% 90%').replace('L', 'left').replace('R', 'right'),
				ext: (img && img.split('.').pop()) || '',
				caption: tvs.find((tv) => tv.tmplvarid == 28)?.value || ''
			}) ||
			null;

		const ogi = tvs.find((tv) => tv.tmplvarid == 25)?.value;
		doc.tv.ogi = ogi ? publicBaseUrl + ogi : '';

		doc.tv.egyesulet = tvs.find((tv) => tv.tmplvarid == 31)?.value || '';

		if (doc.parent == 1 && !doc.tv.tags.includes('hírek')) {
			doc.tv.tags.push('hírek');
		}

	};

	const extraTags = (doc: ModxDoc) => {
		if (
			doc.longtitle.match(/inzulin/gi) ||
			doc.introtext.match(/inzulin/gi) ||
			doc.description.match(/inzulin/gi)
		)
			doc.tv.tags.push('inzulin');
		if (
			doc.longtitle.match(/gyógyszer/gi) ||
			doc.introtext.match(/gyógyszer/gi) ||
			doc.description.match(/gyógyszer/gi)
		)
			doc.tv.tags.push('gyógyszer');
		if (
			doc.longtitle.match(/készülék/gi) ||
			doc.introtext.match(/készülék/gi) ||
			doc.description.match(/készülék/gi)
		)
			doc.tv.tags.push('készülék');
	};

	const nagyito = (doc: ModxDoc) => {
		doc.content = replaceNagyitoTags(doc.content, doc, publicBaseUrl);
	};

	const alapjav = (doc: ModxDoc) => {
		// Curated "További receptek" links — must be read before the [~id~] → path
		// rewriting below destroys the MODX ids.
		const linkedModxIds = extractLinkedModxIds(doc.content).filter((id) => id !== Number(doc.id));
		if (linkedModxIds.length) doc.linkedModxIds = linkedModxIds;
		else delete doc.linkedModxIds;

		const comments = /<!--.*?-->/gs;
		doc.content = doc.content
			.replaceAll(comments, '')
			.replaceAll('http:', 'https:')
			.replaceAll('"www.', '"https://www.')
			.replaceAll('"//', 'https://')
			.replaceAll('&#160;', '&nbsp;')
			.replaceAll('<p></p>\r\n', '')
			.replaceAll('<p></p>', '')
			// `m2` → `m²`. The separator MODX stores before the unit is not reliably an
			// ASCII space: the editor writes a literal NBSP (U+00A0) as often as
			// `&nbsp;`/`&#160;`, and sometimes glues the unit to the number — so match
			// any of those instead of fixed literals. The trailing guard keeps `m2`
			// inside words/ids intact (`gdm2024`). `/m2` (`mg/m2`) keeps its slash and
			// gets no space.
			.replace(/\/m2(?![\p{L}\p{N}])/gu, '/m²')
			.replace(/(?:[ \u00A0\u202F]|&nbsp;)+m2(?![\p{L}\p{N}])/gu, '&nbsp;m²')
			.replace(/(?<=\p{N})m2(?![\p{L}\p{N}])/gu, '&nbsp;m²')
			.replaceAll('A1c', 'A<sub>1c</sub>')
			.replaceAll('®', '<sup>®</sup>')
			.replaceAll('rel="external"', 'rel="noopener" target="_blank"')
			.replaceAll('"/assets', `"${publicBaseUrl}assets`)
			.replaceAll('"assets', `"${publicBaseUrl}assets`);

		doc.introtext = doc.introtext.replaceAll('cikkek?szerzo=', '/keres?q=');
		doc.description = doc.description.replaceAll('cikkek?szerzo=', '/keres?q=');
		doc.content = doc.content.replaceAll('cikkek?szerzo=', '/keres?q=');

		doc.content = doc.content.replaceAll(
			/\[\*parent\*\]/g,
			getEveryDocs().find((d) => d.id == doc.parent)?.id || ''
		);
		doc.introtext = doc.introtext.replaceAll(
			/\[\*parent\*\]/g,
			getEveryDocs().find((d) => d.id == doc.parent)?.id || ''
		);
		doc.description = doc.description.replaceAll(
			/\[\*parent\*\]/g,
			getEveryDocs().find((d) => d.id == doc.parent)?.id || ''
		);

		const modxlink = /(?:https?:\/\/[^\/]+\/)?\[~(\d*)~\]/g;
		const replaceModxLink = (_match: string, id: string) => pathById(Number(id));
		for (const field of ['content', 'description', 'introtext'] as const) {
			doc[field] = doc[field]
				// Self-link tag `[~[*id*]~]`, optionally with a leading slash, e.g.
				// href="/[~[*id*]~]#anchor" → href="#anchor". The optional `/?` must be
				// in the SAME pass: stripping the tag first would orphan the slash.
				.replaceAll(/\/?\[~\[\*id\*\]~\]/g, '')
				.replaceAll(/\[\*id\*\]/g, doc.id)
				.replaceAll(modxlink, replaceModxLink);
		}

		const regexp1 = /\[\[.*?\]\]/gs;
		const regexp2 = /\[!.*?!\]/gs;
		const regexp3 = /\{\{.*?\}\}/gs;
		const regexp4 = /\[\+.*?\+\]/gs;
		const regexp6 = /<div\s+class="cim">.*?<\/div>/gs;
		const regexp7 = /<div\s+class="kep">(.*?)<\/div>/gs;
		const regexp8 = /<div\s+class="j_cikk">(.*?)<\/div>\s*/gs;

		doc.content = doc.content
			.replaceAll(regexp1, '')
			.replaceAll(regexp2, '')
			.replaceAll(regexp3, '')
			.replaceAll(regexp4, '')
			.replaceAll(regexp6, '')
			.replaceAll(regexp7, '$1')
			.replaceAll(regexp8, '$1')
			.trim();

		doc.content = fromHtmlEntities(doc.content);
	};

	const ellipsis = (doc: ModxDoc) => {
		if (!doc.ellipsis) {
			doc.ellipsis =
				doc.introtext.length > 0
					? doc.introtext
					: doc.content
								.match(
									/<(?!aside\b|figure\b|video\b|div\b|img\b|h2\b|h3\b|h4\b|h5\b|h6\b|ul\b|li\b)(.*?)\b[^>]*>[\s\S]*?<\/\1>/gi
								)
								?.slice(0, 2)
								.join('') || '';
			doc.ellipsis = doc.ellipsis.replace(/<blockquote>/g, '').replace(/<\/blockquote>/g, '<br>');
			doc.table = doc.ellipsis.indexOf('<table') > -1;
			doc.video = doc.content.match(/<video\b(.*?)\b[^>]*>[\s\S]*?<\/video>/gi)?.join('');
			if (doc.ellipsis.indexOf('<p') != 0 && doc.ellipsis.indexOf('<table') != 0) {
				doc.ellipsis = `<p>${doc.ellipsis}</p>`;
			}
			doc.ellipsis = doc.ellipsis.replace(/<br\s*\/?>/gi, '</p><p>');
			doc.ellipsis = doc.ellipsis.replace(/<span\b.*?\b[^>]*>(.*?)<\/span>/gi, '$1');
			doc.ellipsis = doc.ellipsis.replace(/<a\b.*?\b[^>]*>(.*?)<\/a>/gi, (_m: string, p: string) =>
				p.indexOf('.') > -1 && p.indexOf(' ') == -1 ? `<span class="break-all">${p}</span>` : p
			);
		}
	};

	const docFields = (doc: ModxDoc): ProcessedDocFields => ({
		id: doc.id,
		path: doc.path,
		alias: doc.alias,
		parent: doc.parent,
		// Decode named HTML entities in the plain-text title fields (used in <title>,
		// cards, search). `content` keeps its entities — they're valid in the HTML body.
		title: decodeHtmlEntities(doc.pagetitle),
		longtitle: decodeHtmlEntities(doc.longtitle),
		description: doc.description,
		content: doc.content,
		introtext: doc.introtext,
		img: doc.img,
		tv: doc.tv,
		ellipsis: doc.ellipsis,
		table: doc.table,
		video: doc.video,
		redirect: doc.redirect,
		publishedon: doc.publishedon,
		editedon: doc.editedon,
		isfolder: doc.isfolder,
		...(Array.isArray(doc.linkedModxIds) && doc.linkedModxIds.length
			? { linkedModxIds: doc.linkedModxIds }
			: {}),
		// Flat copy of the authors' slugs: `tv.szerzo` is an array of maps, which
		// Firestore cannot `array-contains` — the author page queries this instead.
		...(Array.isArray(doc.authorSlugs) && doc.authorSlugs.length
			? { authorSlugs: doc.authorSlugs }
			: {})
	});

	const setReceptsarokRedirect = (doc: ModxDoc, fallbackRedirect?: string) => {
		const byId =
			redirectMaps && Number.isFinite(doc.id)
				? redirectMaps.byContentId.get(Number(doc.id))
				: undefined;
		const byPath = redirectMaps ? redirectMaps.byPath.get(normalizeDocPath(doc.path)) : undefined;
		const target = byId || byPath || fallbackRedirect;
		if (typeof target === 'string' && target.trim().length > 0) {
			doc.redirect = target.trim();
		} else {
			delete doc.redirect;
		}
	};

	const setReferenceRedirect = (doc: ModxDoc) => {
		const targetId = parseModxReferenceTargetId(doc.content);
		if (!targetId) {
			delete doc.redirect;
			return;
		}
		const resolved = pathById(targetId);
		if (resolved && resolved !== '/') {
			doc.redirect = resolved;
		} else {
			delete doc.redirect;
		}
	};

	const referenceDocFields = (doc: ModxDoc): ProcessedDocFields => ({
		id: doc.id,
		path: doc.path,
		alias: doc.alias,
		parent: doc.parent,
		title: decodeHtmlEntities(doc.pagetitle),
		longtitle: '',
		description: '',
		content: '',
		introtext: '',
		img: null,
		tv: { tags: [], szerzo: [], cat: '' },
		ellipsis: '',
		table: false,
		video: '',
		redirect: doc.redirect,
		publishedon: doc.publishedon,
		editedon: doc.editedon,
		isfolder: false
	});

	const isReferenceDoc = (doc: ModxDoc) => isRootReferenceDoc(doc);

	return {
		addTVs,
		findPath,
		extraTags,
		nagyito,
		alapjav,
		ellipsis,
		docFields,
		referenceDocFields,
		setReceptsarokRedirect,
		setReferenceRedirect,
		isReferenceDoc
	};
}
