// POST { email, code } → { token } (Firebase custom token for signInWithCustomToken).
import { json } from '@sveltejs/kit';
import { LoginCodeError, normalizeEmail, verifyLoginCode } from '$lib/server/emailLoginCode';
import type { RequestHandler } from './$types';

const NO_STORE = { 'Cache-Control': 'no-store' };

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => null);
	const email = normalizeEmail(body?.email);
	const code = typeof body?.code === 'string' ? body.code.replace(/\D/g, '') : '';
	if (!email || code.length !== 6) {
		return json({ error: 'invalid_request' }, { status: 400, headers: NO_STORE });
	}

	try {
		const token = await verifyLoginCode(email, code);
		return json({ token }, { headers: NO_STORE });
	} catch (error) {
		if (error instanceof LoginCodeError) {
			return json({ error: error.code, ...error.extra }, { status: error.status, headers: NO_STORE });
		}
		console.error('Login code verify failed:', error instanceof Error ? error.message : error);
		return json({ error: 'server_error' }, { status: 500, headers: NO_STORE });
	}
};
