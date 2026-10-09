import { env } from '$env/dynamic/private';

/**
 * Origin that Netlify Forms submissions are relayed to (`/kviz/form`, `/hirlevel/form`).
 *
 * The prerendered form pages carry the `data-netlify` markup that Netlify's build detects,
 * and only a deployed Netlify site processes the POST. The origin comes from `.env`, tied
 * to `PHASE`:
 *
 *  - `PHASE=dev`            -> `FORMS_RELAY_ORIGIN_DEV` (dev project `diabeteshu`)
 *  - `PHASE` empty or unset -> `FORMS_RELAY_ORIGIN`
 *
 * There is no fallback between the two variables. When the selected variable is empty, a
 * deployed site relays to itself (`url.origin`), which is what Netlify does with no `.env`.
 * A local request (`localhost` / `192.168.x`) with no configured origin throws instead of
 * posting to a dev server that cannot process Netlify Forms.
 */
export function formRelayOrigin(url: URL): string {
	const name = env.PHASE === 'dev' ? 'FORMS_RELAY_ORIGIN_DEV' : 'FORMS_RELAY_ORIGIN';
	const configured = env[name]?.trim().replace(/\/+$/, '');
	if (configured) return configured;

	const host = url.hostname;
	if (host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.')) {
		throw new Error(`Form relay: ${name} is not set (needed for local requests)`);
	}
	return url.origin;
}
