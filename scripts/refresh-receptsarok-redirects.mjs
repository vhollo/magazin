/**
 * Patch Firestore magazine doc redirects from receptsarok-redirects.json.
 * Use after manifest/recipes.json fixes when incremental sync had nothing to write.
 *
 * Usage:
 *   npm run sync:modx:refresh-redirects          # dry run
 *   npm run sync:modx:refresh-redirects:apply    # write + CDN purge
 */
import 'dotenv/config'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getFirestoreDb } from './lib/firebase-admin.mjs'
import { refreshReceptsarokRedirectsFromManifest } from './lib/refresh-receptsarok-redirects.mjs'
import { purgeNetlifyPaths } from './lib/netlify-purge.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const MANIFEST_PATH = path.join(root, 'src/lib/data/receptsarok-redirects.json')
const apply = process.argv.includes('--apply')

async function main() {
  const firestore = getFirestoreDb()
  const refresh = await refreshReceptsarokRedirectsFromManifest(firestore, MANIFEST_PATH, { apply })
  console.log(
    `${apply ? 'Updated' : 'Would update'} ${refresh.updated} redirect(s); ${refresh.missing} manifest path(s) missing in Firestore (${refresh.reads} reads)`
  )
  if (apply && refresh.updated > 0) {
    const purgePaths = [...refresh.changedPaths.map((p) => `/${p}`), ...refresh.redirectPaths]
    const purgeResult = await purgeNetlifyPaths(purgePaths)
    console.log(`CDN purge: ${purgeResult.skipped ? 'skipped' : purgeResult.ok ? 'ok' : 'failed'}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
