/** diabetes.hu / old.diabetes.hu absolute media → same-origin path (proxied via MODX_ASSET_ORIGIN). */
const MODX_ASSET_HOST = '(?:www\\.|old\\.)?diabetes\\.hu';
const MODX_ASSET_IN_HTML = new RegExp(
	`https?:\\/\\/${MODX_ASSET_HOST}(\\/assets\\/[^"'>\s]+)`,
	'gi'
);
const MODX_ASSET_ABSOLUTE = new RegExp(`^https?:\\/\\/${MODX_ASSET_HOST}`, 'i');

export function resolveAssetUrl(url: string | undefined | null): string {
	if (!url || typeof url !== 'string') return url ?? '';
	if (!MODX_ASSET_ABSOLUTE.test(url)) return url;
	const path = url.replace(MODX_ASSET_ABSOLUTE, '');
	return path.startsWith('/') ? path : `/${path}`;
}

/** Rewrite diabetes.hu `/assets/…` URLs inside HTML attribute values. */
export function rewriteModxAssetHtml(html: string): string {
	return html.replace(MODX_ASSET_IN_HTML, '$1');
}
