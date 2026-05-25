const DEFAULT = 'https://www.diabetes.hu'

/** MODX media host without trailing slash (from MODX_ASSET_ORIGIN). */
export function getModxAssetOrigin() {
	return (process.env.MODX_ASSET_ORIGIN || DEFAULT).replace(/\/$/, '')
}

/** Base URL with trailing slash for sync transform `publicBaseUrl`. */
export function getModxAssetOriginWithSlash() {
	return `${getModxAssetOrigin()}/`
}
