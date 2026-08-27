/**
 * Sync trigger for the FireCMS admin ("Szinkron indítása" button).
 *
 * FireCMS writes Firestore directly, but the site renders precomputed read paths
 * (`collections/*` gyűjtőoldalak, search index, aggregate docs). This endpoint is
 * the bridge: it verifies the editor's Firebase ID token and dispatches the
 * `cms-sync.yml` GitHub Actions workflow, which runs the actual sync scripts
 * (they need the service-account key and minutes no serverless function has).
 *
 * Env (private):
 *   GITHUB_SYNC_TOKEN        — PAT with `actions: write` on the repo (required)
 *   GITHUB_SYNC_REPO         — `owner/repo`, default `vhollo/magazin`
 *   GITHUB_SYNC_REF          — branch to run the workflow on, default `main`
 *   CMS_SYNC_ADMIN_EMAILS    — comma-separated allowlist of editor emails (required
 *                              unless the user carries an `admin`/`cmsSync` claim)
 *   CMS_SYNC_ALLOWED_ORIGINS — comma-separated CORS origins, defaults to the
 *                              FireCMS Firebase Hosting sites + local dev
 */
import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { getAdminAuth } from '$lib/firebase-admin';
import type { RequestHandler } from './$types';

const WORKFLOW_FILE = 'cms-sync.yml';
const DEFAULT_REPO = 'vhollo/magazin';
const DEFAULT_REF = 'main';

/** Keep in sync with the `targets` input of `.github/workflows/cms-sync.yml`. */
const SYNC_TARGETS = ['magazine', 'authors', 'rs-collections', 'patika'] as const;
type SyncTarget = (typeof SYNC_TARGETS)[number];

const DEFAULT_ORIGINS = [
	'https://diabetes-hu.web.app',
	'https://diabetes-hu.firebaseapp.com',
	'http://localhost:5172',
	'http://localhost:4172'
];

function allowedOrigins(): string[] {
	const configured = env.CMS_SYNC_ALLOWED_ORIGINS?.split(',')
		.map((o) => o.trim())
		.filter(Boolean);
	return configured?.length ? configured : DEFAULT_ORIGINS;
}

/**
 * CORS headers for the calling origin. The CMS lives on a different host than the
 * site, so the browser preflights every POST; an unknown origin gets no
 * `Access-Control-Allow-Origin` and the browser blocks the response.
 */
function corsHeaders(request: Request): Record<string, string> {
	const origin = request.headers.get('Origin');
	const headers: Record<string, string> = {
		Vary: 'Origin',
		'Cache-Control': 'no-store'
	};
	if (origin && allowedOrigins().includes(origin)) {
		headers['Access-Control-Allow-Origin'] = origin;
		headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
		headers['Access-Control-Allow-Headers'] = 'Authorization, Content-Type';
		headers['Access-Control-Max-Age'] = '3600';
	}
	return headers;
}

function adminEmails(): string[] {
	return (env.CMS_SYNC_ADMIN_EMAILS ?? '')
		.split(',')
		.map((e) => e.trim().toLowerCase())
		.filter(Boolean);
}

function parseTargets(raw: unknown): { targets: SyncTarget[]; invalid: string[] } {
	const list = Array.isArray(raw)
		? raw
		: typeof raw === 'string'
			? raw.split(',')
			: [];
	const requested = list.map((t) => String(t).trim()).filter(Boolean);
	const targets = [
		...new Set(requested.filter((t): t is SyncTarget => SYNC_TARGETS.includes(t as SyncTarget)))
	];
	const invalid = requested.filter((t) => !SYNC_TARGETS.includes(t as SyncTarget));
	return { targets, invalid };
}

// `new Response('', { status: 204 })` throws — a 204 must carry a null body.
export const OPTIONS: RequestHandler = async ({ request }) =>
	new Response(null, { status: 204, headers: corsHeaders(request) });

export const POST: RequestHandler = async ({ request }) => {
	const headers = corsHeaders(request);

	const authHeader = request.headers.get('Authorization');
	if (!authHeader?.startsWith('Bearer ')) {
		return json({ error: 'Unauthorized' }, { status: 401, headers });
	}

	let decoded;
	try {
		decoded = await getAdminAuth().verifyIdToken(authHeader.slice(7));
	} catch {
		return json({ error: 'Invalid token' }, { status: 401, headers });
	}

	// Either an explicit custom claim, or the email allowlist. Fails closed: with
	// neither configured nobody can trigger a sync.
	const email = decoded.email?.toLowerCase();
	const hasClaim = decoded.admin === true || decoded.cmsSync === true;
	const allowed = hasClaim || (!!email && decoded.email_verified !== false && adminEmails().includes(email));
	if (!allowed) {
		return json(
			{ error: 'Forbidden', detail: 'Nincs jogosultságod szinkront indítani (CMS_SYNC_ADMIN_EMAILS).' },
			{ status: 403, headers }
		);
	}

	let body: Record<string, unknown> = {};
	try {
		body = (await request.json()) as Record<string, unknown>;
	} catch {
		// empty body → no targets → 400 below
	}

	const { targets, invalid } = parseTargets(body.targets);
	if (invalid.length) {
		return json(
			{ error: 'Unknown target', detail: invalid.join(', '), allowed: SYNC_TARGETS },
			{ status: 400, headers }
		);
	}
	if (!targets.length) {
		return json({ error: 'No targets', allowed: SYNC_TARGETS }, { status: 400, headers });
	}

	const token = env.GITHUB_SYNC_TOKEN?.trim();
	if (!token) {
		return json(
			{ error: 'Not configured', detail: 'GITHUB_SYNC_TOKEN is not set on the site.' },
			{ status: 503, headers }
		);
	}

	const repo = env.GITHUB_SYNC_REPO?.trim() || DEFAULT_REPO;
	const ref = env.GITHUB_SYNC_REF?.trim() || DEFAULT_REF;
	const source = [email ?? decoded.uid, typeof body.source === 'string' ? body.source : null]
		.filter(Boolean)
		.join(' · ')
		.slice(0, 200);

	const res = await fetch(
		`https://api.github.com/repos/${repo}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
		{
			method: 'POST',
			headers: {
				Authorization: `Bearer ${token}`,
				Accept: 'application/vnd.github+json',
				'X-GitHub-Api-Version': '2022-11-28',
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				ref,
				inputs: {
					targets: targets.join(','),
					source,
					purge_cdn: body.purgeCdn === false ? 'false' : 'true'
				}
			})
		}
	);

	if (!res.ok) {
		const detail = (await res.text()).slice(0, 500);
		return json(
			{ error: 'Dispatch failed', status: res.status, detail },
			{ status: 502, headers }
		);
	}

	// The dispatch API returns 204 with no run id — link the workflow's run list
	// instead of polling for the run that was just queued.
	return json(
		{
			ok: true,
			targets,
			runsUrl: `https://github.com/${repo}/actions/workflows/${WORKFLOW_FILE}`
		},
		{ status: 202, headers }
	);
};
