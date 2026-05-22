import MiniSearch from 'minisearch';
import { fetchSearchIndexText } from '$lib/magazine/loadSearchIndex';

export const MINISEARCH_LOAD_OPTIONS = {
	fields: ['szerzo', 'longtitle', 'description', 'ellipsis', 'content'],
	storeFields: [
		'id',
		'path',
		'title',
		'longtitle',
		'description',
		'ellipsis',
		'content',
		'img',
		'tv',
		'szerzo',
		'free',
		'recipeTeaser'
	]
} as const;

export type ClientSearchMeta = {
	indexUrl: string;
	version?: number | string;
	articleCount?: number;
	recipeCount?: number;
	generatedAt?: string;
};

let cached: MiniSearch | null = null;
let cachedVersion: number | string | null = null;
let loadPromise: Promise<MiniSearch> | null = null;

async function fetchSearchMeta(): Promise<ClientSearchMeta> {
	const sources = ['/api/search-meta', '/search-meta.json'];
	let lastError: Error | null = null;
	for (const url of sources) {
		try {
			const resp = await fetch(url);
			if (!resp.ok) {
				lastError = new Error(`${url}: HTTP ${resp.status}`);
				continue;
			}
			const meta = (await resp.json()) as ClientSearchMeta;
			if (typeof meta?.indexUrl === 'string' && meta.indexUrl.trim()) {
				return meta;
			}
			lastError = new Error(`${url}: indexUrl missing`);
		} catch (err) {
			lastError = err instanceof Error ? err : new Error(String(err));
		}
	}
	throw lastError ?? new Error('search-meta unavailable');
}

function parseIndex(text: string): MiniSearch {
	return MiniSearch.loadJSON(text, MINISEARCH_LOAD_OPTIONS);
}

async function loadIndex(): Promise<MiniSearch> {
	const meta = await fetchSearchMeta();
	if (
		cached &&
		cachedVersion != null &&
		meta.version != null &&
		meta.version !== cachedVersion
	) {
		cached = null;
	}
	if (cached) return cached;

	const text = await fetchSearchIndexText(meta.indexUrl);
	cached = parseIndex(text);
	cachedVersion = meta.version ?? null;
	return cached;
}

/** In-memory index from an earlier /keres visit in this tab. */
export function getCachedSearchIndex(): MiniSearch | null {
	return cached;
}

/** Load or reuse the MiniSearch index (dedupes concurrent loads). */
export function getSearchIndex(): Promise<MiniSearch> {
	if (cached) return Promise.resolve(cached);
	if (!loadPromise) {
		loadPromise = loadIndex().finally(() => {
			loadPromise = null;
		});
	}
	return loadPromise;
}
