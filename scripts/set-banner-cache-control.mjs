/**
 * Set a long browser-cache `cacheControl` on every ad banner in Firebase Storage.
 *
 * The site loads banner videos/images straight from their Storage download URL
 * (`config/site/banners/{id}.video|image`, see getSiteConf in src/lib/siteConf.ts).
 * FireCMS uploaded them without cache metadata, so Storage served them with
 * `private, max-age=0` and every page view re-fetched the multi-MB videos.
 *
 * A one-year max-age is safe: FireCMS stores every upload under a new random-prefixed
 * object name with its own token (`banners/8mblr_…`), so a replaced banner always
 * gets a new URL and an existing URL's content never changes. New uploads get the
 * same value from the FireCMS field config (../firecms/src/collections/siteconfig.tsx).
 *
 * Only the `cacheControl` field is patched — content, content type and the download
 * token (custom metadata) are untouched, so the URLs stored in Firestore stay valid.
 *
 * Usage:
 *   node scripts/set-banner-cache-control.mjs           # dry run (report only)
 *   node scripts/set-banner-cache-control.mjs --apply   # write the metadata
 *
 * Env: FIREBASE_ADMIN_KEY, FIREBASE_STORAGE_BUCKET (optional)
 */
import 'dotenv/config'
import { getStorageBucket } from './lib/firebase-storage.mjs'

const BANNER_CACHE_CONTROL = 'public, max-age=31536000'
const PREFIX = 'banners/'

const apply = process.argv.includes('--apply')

const bucket = getStorageBucket()
const [files] = await bucket.getFiles({ prefix: PREFIX })

let changed = 0
for (const file of files) {
  if (file.name.endsWith('/')) continue // folder placeholder
  const current = file.metadata?.cacheControl ?? '-'
  if (current === BANNER_CACHE_CONTROL) {
    console.log(`ok       ${file.name}`)
    continue
  }
  changed++
  if (apply) await file.setMetadata({ cacheControl: BANNER_CACHE_CONTROL })
  console.log(`${apply ? 'updated ' : 'would set'} ${file.name}: ${current} → ${BANNER_CACHE_CONTROL}`)
}

console.log(
  `${bucket.name}/${PREFIX}: ${files.length} object(s), ${changed} ${apply ? 'updated' : 'to update (dry run, pass --apply)'}`
)
