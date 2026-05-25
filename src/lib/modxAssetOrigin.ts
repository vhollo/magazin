import { MODX_ASSET_ORIGIN } from '$env/static/private';

const DEFAULT = 'https://www.diabetes.hu';

/** MODX media host without trailing slash (from MODX_ASSET_ORIGIN). */
export function modxAssetOriginBase(): string {
	return (MODX_ASSET_ORIGIN || DEFAULT).replace(/\/$/, '');
}
