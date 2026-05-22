import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getSearchMeta } from '$lib/magazine/firestore';

/** GCS URL for the gzipped MiniSearch index (Firestore meta, then static fallback). */
export async function resolveSearchIndexUrl(): Promise<string | null> {
	const meta = await getSearchMeta();
	if (meta?.indexUrl) return meta.indexUrl;
	try {
		const staticPath = join(process.cwd(), 'static', 'search-meta.json');
		const data = JSON.parse(readFileSync(staticPath, 'utf8')) as { indexUrl?: string };
		return typeof data.indexUrl === 'string' && data.indexUrl.trim() ? data.indexUrl : null;
	} catch {
		return null;
	}
}
