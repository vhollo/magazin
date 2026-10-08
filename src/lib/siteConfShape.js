/**
 * Shape of the precomputed site config: the `config/site` SEO fields plus its
 * `top_banners` / `side_banners` references resolved to banner objects.
 *
 * Shared by the writer (`scripts/sync-site-conf.mjs`, which stores it in
 * `meta/stats.siteConf`) and the reader (`getSiteConf` in `$lib/siteConf`), so both
 * sides agree on one plain-JSON shape. Plain JS because Node scripts import it.
 */

/**
 * @typedef {{
 *   name: string;
 *   link?: string;
 *   video?: string;
 *   videoext?: string;
 *   image?: string;
 *   imageext?: string;
 *   prominent?: boolean;
 *   height?: number;
 * }} Banner
 */

/** Every Nth card slot in a `Cards` grid is a side banner. */
const ADS_DISTANCE = 4;

/**
 * File extension of a Storage download URL (`…/o/banners%2Fx_name.mp4?alt=media&token=…` → `mp4`).
 * @param {string} url
 */
const urlExt = (url) => url.split('.').pop()?.split('?')[0];

/**
 * Plain banner object with only the fields the components render. Drops Firestore
 * Timestamps (`starts_on` / `expires_on` are not applied by the site) and anything
 * else FireCMS stores. Idempotent.
 * @param {Record<string, any>} raw
 * @returns {Banner}
 */
export function toBanner(raw) {
	/** @type {Banner} */
	const b = { name: String(raw.name ?? '') };
	if (raw.link) b.link = String(raw.link);
	if (raw.video) {
		b.video = String(raw.video);
		const ext = urlExt(b.video);
		if (ext) b.videoext = ext;
	}
	if (raw.image) {
		b.image = String(raw.image);
		const ext = urlExt(b.image);
		if (ext) b.imageext = ext;
	}
	if (raw.prominent) b.prominent = true;
	if (raw.height) b.height = Number(raw.height);
	return b;
}

/**
 * Guarantee the fields pages use without a guard (`tags.join`,
 * `top_banners.length`, `ads_distance`). Idempotent.
 * @param {Record<string, any>} raw
 */
export function normalizeSiteConf(raw) {
	return {
		...raw,
		tags: Array.isArray(raw.tags) ? raw.tags.map(String) : [],
		top_banners: (Array.isArray(raw.top_banners) ? raw.top_banners : []).map(toBanner),
		side_banners: (Array.isArray(raw.side_banners) ? raw.side_banners : []).map(toBanner),
		ads_distance: Number(raw.ads_distance) || ADS_DISTANCE
	};
}
