import { getStorage } from 'firebase-admin/storage'
import { getFirestoreDb } from './firebase-admin.mjs'

/** @type {import('firebase-admin/storage').Storage | undefined} */
let storage

function getFirebaseStorage() {
  if (storage) return storage
  getFirestoreDb()
  storage = getStorage()
  return storage
}

/**
 * Upload a buffer to Firebase Storage and return a public download URL.
 * @param {string} objectPath e.g. search/index-1716123456.json.gz
 * @param {Buffer} buffer
 * @param {string} contentType
 * @param {Record<string, string>} [metadata]
 */
export async function uploadPublicFile(objectPath, buffer, contentType, metadata = {}) {
  const bucketName = process.env.FIREBASE_STORAGE_BUCKET
  if (!bucketName) {
    throw new Error('FIREBASE_STORAGE_BUCKET is required for Storage uploads')
  }
  const bucket = getFirebaseStorage().bucket(bucketName)
  const file = bucket.file(objectPath)
  await file.save(buffer, {
    metadata: {
      contentType,
      cacheControl: 'public, max-age=31536000, immutable',
      metadata,
    },
    gzip: false,
  })
  await file.makePublic()
  return `https://storage.googleapis.com/${bucket.name}/${encodeURIComponent(objectPath).replace(/%2F/g, '/')}`
}
