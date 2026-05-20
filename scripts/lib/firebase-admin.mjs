import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

/** @type {import('firebase-admin/firestore').Firestore | undefined} */
let db

function ensureFirebaseApp() {
  const raw = process.env.FIREBASE_ADMIN_KEY
  if (!raw) {
    throw new Error('FIREBASE_ADMIN_KEY is required (JSON service account in .env)')
  }
  if (!getApps().length) {
    initializeApp({
      credential: cert(JSON.parse(raw)),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || undefined,
    })
  }
}

/**
 * Firebase Admin for Node scripts (uses FIREBASE_ADMIN_KEY from .env).
 * @returns {import('firebase-admin/firestore').Firestore}
 */
export function getFirestoreDb() {
  if (db) return db

  ensureFirebaseApp()

  db = getFirestore()
  try {
    db.settings({ ignoreUndefinedProperties: true })
  } catch (error) {
    if (!error?.message?.includes('already been initialized')) throw error
  }

  return db
}
