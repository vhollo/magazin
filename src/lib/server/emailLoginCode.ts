// Email sign-in with a 6-digit code (replaces Firebase's email-link sign-in in the login modal).
//
// The Firebase client SDK has no email-code sign-in, so the server does it:
//   1. sendLoginCode: random 6-digit code → HMAC stored in `authCodes/{email}` (admin SDK;
//      the Firestore rules give clients no access) with a 10-minute expiry → emailed via SMTP (SES).
//   2. verifyLoginCode: checks the code (max 5 attempts), deletes the doc, finds or creates the
//      Firebase user for the email and returns a custom token for `signInWithCustomToken`.
// Everything happens in the same browser tab, so a pending Facebook credential in Nav.svelte
// survives and gets linked after the code sign-in.
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import nodemailer, { type Transporter } from 'nodemailer';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { env } from '$env/dynamic/private';
import { db, getAdminAuth } from '$lib/firebase-admin';

const COLLECTION = 'authCodes';
const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
/** Minimum gap between two codes for the same email. */
const RESEND_GAP_MS = 60 * 1000;
/** At most MAX_SENDS_PER_WINDOW codes per email per SEND_WINDOW_MS. */
const SEND_WINDOW_MS = 60 * 60 * 1000;
const MAX_SENDS_PER_WINDOW = 5;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(raw: unknown): string | null {
	if (typeof raw !== 'string') return null;
	const email = raw.trim().toLowerCase();
	return email.length <= 254 && EMAIL_RE.test(email) ? email : null;
}

export class LoginCodeError extends Error {
	constructor(
		public code: 'rate_limited' | 'expired' | 'invalid' | 'locked' | 'send_failed' | 'disabled',
		public status: number,
		public extra: Record<string, unknown> = {}
	) {
		super(code);
	}
}

function codeHash(email: string, code: string): string {
	// Keyed with the admin service-account key: a leaked `authCodes` doc alone can't be brute-forced.
	return createHmac('sha256', env.FIREBASE_ADMIN_KEY ?? '').update(`${email}:${code}`).digest('hex');
}

let transporter: Transporter | undefined;
function getTransporter(): Transporter {
	if (transporter) return transporter;
	const port = Number(env.SMTP_PORT || 587);
	transporter = nodemailer.createTransport({
		host: env.SMTP_HOST,
		port,
		// 465/2465 = implicit TLS; 587/2587/25 = STARTTLS, required.
		secure: port === 465 || port === 2465,
		requireTLS: true,
		auth: { user: env.SMTP_USER, pass: env.SMTP_PASS }
	});
	return transporter;
}

export async function sendLoginCode(email: string): Promise<void> {
	if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS || !env.SMTP_FROM) {
		throw new Error('SMTP_HOST / SMTP_USER / SMTP_PASS / SMTP_FROM is not set');
	}
	const ref = db.collection(COLLECTION).doc(email);
	const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
	const now = Date.now();

	await db.runTransaction(async (tx) => {
		const snap = await tx.get(ref);
		const prev = snap.data();
		const lastSentAt = prev?.lastSentAt?.toMillis?.() ?? 0;
		if (now - lastSentAt < RESEND_GAP_MS) {
			throw new LoginCodeError('rate_limited', 429, {
				retryAfter: Math.ceil((RESEND_GAP_MS - (now - lastSentAt)) / 1000)
			});
		}
		const windowStart = prev?.windowStart?.toMillis?.() ?? 0;
		const inWindow = now - windowStart < SEND_WINDOW_MS;
		const sends = inWindow ? (prev?.sends ?? 0) : 0;
		if (sends >= MAX_SENDS_PER_WINDOW) {
			throw new LoginCodeError('rate_limited', 429, {
				retryAfter: Math.ceil((windowStart + SEND_WINDOW_MS - now) / 1000)
			});
		}
		tx.set(ref, {
			email,
			codeHash: codeHash(email, code),
			expiresAt: Timestamp.fromMillis(now + CODE_TTL_MS),
			attempts: 0,
			lastSentAt: Timestamp.fromMillis(now),
			windowStart: inWindow ? Timestamp.fromMillis(windowStart) : Timestamp.fromMillis(now),
			sends: sends + 1
		});
	});

	try {
		await getTransporter().sendMail({
			from: env.SMTP_FROM,
			to: email,
			subject: `${code} – belépési kódod (diabetes.hu)`,
			text:
				`A belépési kódod: ${code}\n\n` +
				`Írd be a diabetes.hu belépési ablakába. A kód 10 percig érvényes.\n\n` +
				`Ha nem te kérted, hagyd figyelmen kívül ezt a levelet.`,
			html:
				`<p>A belépési kódod:</p>` +
				`<p style="font-size:28px;font-weight:bold;letter-spacing:6px;margin:16px 0">${code}</p>` +
				`<p>Írd be a diabetes.hu belépési ablakába. A kód 10 percig érvényes.</p>` +
				`<p style="color:#666">Ha nem te kérted, hagyd figyelmen kívül ezt a levelet.</p>`
		});
	} catch (error) {
		console.error('Login code email failed:', error instanceof Error ? error.message : error);
		// Let the user retry at once instead of waiting out the resend gap for a mail that never left.
		await ref.update({ lastSentAt: Timestamp.fromMillis(0) }).catch(() => {});
		throw new LoginCodeError('send_failed', 502);
	}
}

/** Checks the code and returns a Firebase custom token for the email's account. */
export async function verifyLoginCode(email: string, code: string): Promise<string> {
	const ref = db.collection(COLLECTION).doc(email);
	const now = Date.now();

	const outcome = await db.runTransaction(async (tx) => {
		const snap = await tx.get(ref);
		const data = snap.data();
		if (!data?.codeHash || (data.expiresAt?.toMillis?.() ?? 0) < now) return 'expired' as const;
		if ((data.attempts ?? 0) >= MAX_ATTEMPTS) return 'locked' as const;
		const expected = Buffer.from(data.codeHash, 'hex');
		const given = Buffer.from(codeHash(email, code), 'hex');
		if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
			tx.update(ref, { attempts: FieldValue.increment(1) });
			return { remaining: MAX_ATTEMPTS - (data.attempts ?? 0) - 1 };
		}
		// Used up: drop the code but keep the send counters for the rate limit.
		tx.update(ref, { codeHash: FieldValue.delete(), expiresAt: FieldValue.delete(), attempts: 0 });
		return 'ok' as const;
	});

	if (outcome === 'expired') throw new LoginCodeError('expired', 410);
	if (outcome === 'locked') throw new LoginCodeError('locked', 429);
	if (outcome !== 'ok') {
		if (outcome.remaining <= 0) throw new LoginCodeError('locked', 429);
		throw new LoginCodeError('invalid', 400, { remaining: outcome.remaining });
	}

	const auth = getAdminAuth();
	let user = await auth.getUserByEmail(email).catch((error) => {
		if (error?.code === 'auth/user-not-found') return null;
		throw error;
	});
	if (!user) {
		user = await auth.createUser({ email, emailVerified: true });
	} else if (user.disabled) {
		throw new LoginCodeError('disabled', 403);
	} else if (!user.emailVerified) {
		// The account was created by a provider that doesn't verify the address (e.g. Facebook).
		// The code proves the address, so — like Firebase's own email-link sign-in — mark it
		// verified and unlink those providers, so nobody who registered the address elsewhere
		// keeps access. The user can link Facebook again (account-exists flow in Nav.svelte).
		const providersToUnlink = user.providerData
			.map((p) => p.providerId)
			.filter((id) => id !== 'password');
		user = await auth.updateUser(user.uid, { emailVerified: true, providersToUnlink });
	}
	return auth.createCustomToken(user.uid);
}
