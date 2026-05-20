import fs from 'node:fs';
import { fromHtmlEntities } from '../utils/index';

export interface TemplateVariable {
	tmplvarid: number;
	value: string;
	contentid: number;
}

export interface ModxSzerzoSnippet {
	name: string;
	snippet: string;
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
	related: ModxDoc['related'];
	ellipsis: string;
	table: boolean;
	video: string;
	redirect?: string;
	publishedon: number;
	editedon: number;
	isfolder: boolean;
}

export type ReceptsarokRedirectMaps = {
	byContentId: Map<number, string>;
	byPath: Map<string, string>;
};

export interface ModxTransformDeps {
	publicBaseUrl: string;
	tmplvarContentvalues: TemplateVariable[];
	modxSzerzok: ModxSzerzoSnippet[];
	/** Returns the current full document list (for path resolution and MODX links). */
	getEveryDocs: () => ModxDoc[];
	redirectMaps?: ReceptsarokRedirectMaps;
}

export interface ModxTransform {
	addTVs: (doc: ModxDoc) => void;
	findPath: (doc: ModxDoc) => ModxDoc;
	extraTags: (doc: ModxDoc) => void;
	nagyito: (doc: ModxDoc) => void;
	alapjav: (doc: ModxDoc) => void;
	ellipsis: (doc: ModxDoc) => void;
	docFields: (doc: ModxDoc) => ProcessedDocFields;
	setReceptsarokRedirect: (doc: ModxDoc, fallbackRedirect?: string) => void;
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

function renderNagyitoHtml(img: {
	file: string;
	desc: string;
	align: string;
	zoom: string;
	bg: string;
}): string {
	const zoomAttr = img.zoom ? ' class="zoom"' : '';
	const figcaption = img.desc ? `<figcaption class="">${img.desc}</figcaption>` : '';
	return `<figure class="${img.align}"><img src="${img.file}" alt="${img.desc}"${zoomAttr} data-theme="dark" style="background-color: ${img.bg}">${figcaption}</figure>`;
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
	const { publicBaseUrl, tmplvarContentvalues, modxSzerzok, getEveryDocs, redirectMaps } = deps;

	const findPath = (doc: ModxDoc): ModxDoc => {
		if (!doc.path) {
			if (doc.parent == 0) {
				doc.path = doc.alias;
			} else if (doc.parent == 1) {
				doc.path = 'hirek/' + doc.alias;
			} else {
				const parentDoc = getEveryDocs().find((d) => d.id == doc.parent);
				if (!parentDoc) {
					console.log('parentDoc not found', doc.id);
					return doc;
				}
				const parent = findPath(parentDoc);
				if (!parent.tv?.tags?.includes('folder')) {
					parent.tv = parent.tv || { tags: [] };
					parent.tv.tags.push('folder');
				}
				doc.path = [parent.path || '', doc.alias].filter((x) => x).join('/');
				if (
					typeof doc.path === 'string' &&
					doc.path.includes('junior') &&
					doc.tv?.tags &&
					!doc.tv.tags.includes('recept')
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
			doc.description = 'DiabPONT Továbbképző Program';
		}

		doc.tv.szerzo = [];
		const sze = tvs.find((tv) => tv.tmplvarid == 18)?.value.split(' ') || [];

		for (let i = 0; i < sze.length; i++) {
			let val = sze[i];
			let name = val.replaceAll('_', ' ') || '';
			const span = name.match(/(?:<span\b.*?>.*?<\/span>\s*)/gi);

			let snippet: string | undefined = modxSzerzok.find((sz) => sz.name.normalize() == val)?.snippet;
			if (snippet) {
				snippet = snippet
					.replace('src="/', 'src="' + publicBaseUrl)
					.replace('src="assets', 'src="' + publicBaseUrl + 'assets');
			}
			if (!snippet && span) {
				snippet = name;
				name = name.replace(span[0], '');
				val = val.replace(span[0], '');
			}
			if (snippet && snippet.indexOf('<') !== 0) snippet = `<p class="alairas">${snippet}</p>`;

			doc.tv.szerzo.push({ val: val, name: name, full: snippet });
		}

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

		if (doc.parent == 1 && !doc.tv.tags.includes('hírek')) {
			doc.tv.tags.push('hírek');
		}

		for (const sz of doc.tv.szerzo) {
			if (typeof sz.full === 'string') {
				sz.full = replaceNagyitoTags(sz.full, doc, publicBaseUrl);
			}
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
		const comments = /<!--.*?-->/gs;
		doc.content = doc.content
			.replaceAll(comments, '')
			.replaceAll('http:', 'https:')
			.replaceAll('"www.', '"https://www.')
			.replaceAll('"//', 'https://')
			.replaceAll('&#160;', '&nbsp;')
			.replaceAll('<p></p>\r\n', '')
			.replaceAll('<p></p>', '')
			.replaceAll('&nbsp;m2', '&nbsp;m²')
			.replaceAll(' m2', '&nbsp;m²')
			.replaceAll('/m2', '/m²')
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
				.replaceAll(/\[~\[\*id\*\]~\]/g, '')
				.replaceAll(/\/\[~\[\*id\*\]~\]/g, '')
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
		title: doc.pagetitle,
		longtitle: doc.longtitle,
		description: doc.description,
		content: doc.content,
		introtext: doc.introtext,
		img: doc.img,
		tv: doc.tv,
		related: doc.related,
		ellipsis: doc.ellipsis,
		table: doc.table,
		video: doc.video,
		redirect: doc.redirect,
		publishedon: doc.publishedon,
		editedon: doc.editedon,
		isfolder: doc.isfolder
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

	return {
		addTVs,
		findPath,
		extraTags,
		nagyito,
		alapjav,
		ellipsis,
		docFields,
		setReceptsarokRedirect
	};
}
