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
function resolveBucketName() {
  if (process.env.FIREBASE_STORAGE_BUCKET) return process.env.FIREBASE_STORAGE_BUCKET
  const raw = process.env.FIREBASE_ADMIN_KEY
  if (raw) {
    try {
      const projectId = JSON.parse(raw).project_id
      if (projectId) return `${projectId}.firebasestorage.app`
    } catch {
      /* ignore */
    }
  }
  return null
}

export async function uploadPublicFile(objectPath, buffer, contentType, metadata = {}) {
  const bucketName = resolveBucketName()
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
