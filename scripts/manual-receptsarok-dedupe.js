import { runMagazinRecipeDedupeFromDataFile } from '../src/lib/receptsarokDedupePipeline.js'

const applyLocal = process.argv.includes('--apply-local')
const createLocal = process.argv.includes('--create-local')
const allowMissingData = process.argv.includes('--allow-missing-data')

const result = await runMagazinRecipeDedupeFromDataFile({
  applyLocal,
  createLocal,
  allowMissingData,
})

if (!result) {
  console.warn('dedupe skipped: missing input file src/lib/data/data.json (allowed with --allow-missing-data)')
  process.exit(0)
}

console.log(
  `dedupe complete: candidates=${result.summary.magazineCandidates}, redirects=${result.summary.redirects}, unpublish=${result.summary.unpublishCount}, createDrafts=${result.summary.createDrafts}, unresolved=${result.summary.unresolvedCategoryDrafts}, applyLocal=${applyLocal}, createLocal=${createLocal}`
)
