import { initializeApp, /* applicationDefault, */ cert } from 'firebase-admin/app';
import { getFirestore/* , Timestamp, FieldValue, Filter */ } from 'firebase-admin/firestore';
import {FIREBASE_ADMIN_KEY} from '$env/static/private'
 
// console.log(FIREBASE_ADMIN_KEY)
initializeApp({
  credential: cert(JSON.parse(FIREBASE_ADMIN_KEY))
});

/* initializeApp({
  credential: applicationDefault(),
  databaseURL: 'https://diabetes-hu.firebaseio.com'
}); */

const db = getFirestore()
db.settings({ ignoreUndefinedProperties: true });
export { db };