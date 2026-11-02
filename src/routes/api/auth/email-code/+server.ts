// POST { email } → emails a 6-digit sign-in code (see $lib/server/emailLoginCode).
import { json } from '@sveltejs/kit';
import { LoginCodeError, normalizeEmail, sendLoginCode } from '$lib/server/emailLoginCode';
import type { RequestHandler } from './$types';

const NO_STORE = { 'Cache-Control': 'no-store' };

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => null);
	const email = normalizeEmail(body?.email);
	if (!email) return json({ error: 'invalid_email' }, { status: 400, headers: NO_STORE });

	try {
		await sendLoginCode(email);
		return json({ ok: true }, { headers: NO_STORE });
	} catch (error) {
		if (error instanceof LoginCodeError) {
			return json({ error: error.code, ...error.extra }, { status: error.status, headers: NO_STORE });
		}
		console.error('Login code send failed:', error instanceof Error ? error.message : error);
		return json({ error: 'server_error' }, { status: 500, headers: NO_STORE });
	}
};
