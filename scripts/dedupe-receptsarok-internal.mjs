import fs from 'node:fs'
import path from 'node:path'
import { chooseWinner } from '../src/lib/receptsarokDedupeShared.js'
import { normalizeText } from './lib/modx-to-rs-parser.mjs'

const RECIPES_PATH = path.resolve(process.cwd(), 'src/lib/data/recipes.json')
const AUDIT_PATH = path.resolve(process.cwd(), 'src/lib/data/receptsarok-internal-dedupe-audit.json')

const applyLocal = process.argv.includes('--apply-local')

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`)
}

const recipes = readJson(RECIPES_PATH)
if (!Array.isArray(recipes)) throw new Error('recipes.json must be an array')

const clusters = new Map()
for (const recipe of recipes) {
  if (recipe?.published === false) continue
  const key = normalizeText(recipe?.title || '')
  if (!key) continue
  if (!clusters.has(key)) clusters.set(key, [])
  clusters.get(key).push(recipe)
}

const duplicateClusters = [...clusters.values()].filter((cluster) => cluster.length > 1)
const losersToUnpublish = new Set()
const entries = []

for (const cluster of duplicateClusters) {
  const { winner, reason } = chooseWinner(cluster)
  if (!winner) continue
  const winnerKey = `${winner.year}-${winner.id}`
  for (const candidate of cluster) {
    const key = `${candidate.year}-${candidate.id}`
    if (key === winnerKey) continue
    losersToUnpublish.add(key)
  }
  entries.push({
    title: winner.title,
    winner: winnerKey,
    reason,
    clusterSize: cluster.length,
    matched: cluster.map((candidate) => `${candidate.year}-${candidate.id}`),
  })
}

if (applyLocal) {
  for (const recipe of recipes) {
    const key = `${recipe.year}-${recipe.id}`
    if (losersToUnpublish.has(key)) recipe.published = false
  }
  writeJson(RECIPES_PATH, recipes)
}

writeJson(AUDIT_PATH, {
  generatedAt: new Date().toISOString(),
  sourceRecipes: 'src/lib/data/recipes.json',
  summary: {
    applyLocal,
    publishedRecipes: recipes.filter((recipe) => recipe?.published !== false).length,
    duplicateClusters: duplicateClusters.length,
    losersUnpublished: losersToUnpublish.size,
  },
  entries: entries.sort((a, b) => a.title.localeCompare(b.title, 'hu')),
})

console.log(
  `internal dedupe: duplicateClusters=${duplicateClusters.length}, losers=${losersToUnpublish.size}, applyLocal=${applyLocal}`
)
