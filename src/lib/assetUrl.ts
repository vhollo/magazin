/** diabetes.hu absolute media URL → same-origin path (proxied on Netlify / Vite dev). */
const DIABETES_HU_ASSET_IN_HTML =
	/https?:\/\/(?:www\.)?diabetes\.hu(\/assets\/[^"'>\s]+)/gi;

export function resolveAssetUrl(url: string | undefined | null): string {
	if (!url || typeof url !== 'string') return url ?? '';
	if (!/^https?:\/\/(?:www\.)?diabetes\.hu\//i.test(url)) return url;
	const path = url.replace(/^https?:\/\/(?:www\.)?diabetes\.hu/i, '');
	return path.startsWith('/') ? path : `/${path}`;
}

/** Rewrite diabetes.hu `/assets/…` URLs inside HTML attribute values. */
export function rewriteModxAssetHtml(html: string): string {
	return html.replace(DIABETES_HU_ASSET_IN_HTML, '$1');
}
