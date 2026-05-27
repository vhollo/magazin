import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import type { Firestore } from 'firebase-admin/firestore';
import { env } from '$env/dynamic/private';

let dbInstance: Firestore | undefined;

function getAdminDb(): Firestore {
	if (dbInstance) return dbInstance;

	if (!getApps().length) {
		const raw = env.FIREBASE_ADMIN_KEY?.trim();
		if (!raw) {
			throw new Error('FIREBASE_ADMIN_KEY is not set');
		}
		let credential;
		try {
			credential = cert(JSON.parse(raw));
		} catch {
			throw new Error('FIREBASE_ADMIN_KEY is not valid JSON');
		}
		initializeApp({ credential });
	}

	dbInstance = getFirestore();

	// Only call settings() once - wrap in try-catch to handle cases where
	// it's already been called (e.g., during HMR or module reloads)
	try {
		dbInstance.settings({ ignoreUndefinedProperties: true });
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : '';
		if (!message.includes('already been initialized')) {
			throw error;
		}
	}

	return dbInstance;
}

/** Lazy Firestore handle — reads FIREBASE_ADMIN_KEY at first use, not at import. */
export const db: Firestore = new Proxy({} as Firestore, {
	get(_target, prop, receiver) {
		const instance = getAdminDb();
		const value = Reflect.get(instance, prop, receiver);
		return typeof value === 'function' ? value.bind(instance) : value;
	}
});