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
db.settings({ ignoreUndefinedProperties: true });
export { db };