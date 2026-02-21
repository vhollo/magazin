import { initializeApp, getApps, /* applicationDefault, */ cert } from 'firebase-admin/app';
import { getFirestore/* , Timestamp, FieldValue, Filter */ } from 'firebase-admin/firestore';
import type { Firestore } from 'firebase-admin/firestore';
import {FIREBASE_ADMIN_KEY} from '$env/static/private'
 
// console.log(FIREBASE_ADMIN_KEY)
if (!getApps().length) {
  initializeApp({
    credential: cert(JSON.parse(FIREBASE_ADMIN_KEY))
  });
}

const db: Firestore = getFirestore()

// Only call settings() once - wrap in try-catch to handle cases where
// it's already been called (e.g., during HMR or module reloads)
try {
  db.settings({ ignoreUndefinedProperties: true });
} catch (error: any) {
  // Settings already called, ignore the error
  // This can happen during HMR or module reloads when the module is re-imported
  if (!error?.message?.includes('already been initialized')) {
    // Re-throw if it's a different error
    throw error;
  }
}

export { db };