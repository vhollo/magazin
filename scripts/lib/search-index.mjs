import { gzipSync } from 'node:zlib'
import MiniSearch from 'minisearch'
import { pathToFileURL } from 'node:url'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { uploadPublicFile } from './firebase-storage.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '../..')

const SEARCH_FIELDS = ['szerzo', 'longtitle', 'description', 'ellipsis', 'content']
const SEARCH_STORE_FIELDS = [
  'id',
  'path',
  'title',
  'longtitle',
  'description',
  'ellipsis',
  'content',
  'img',
  'tv',
  'szerzo',
  'free',
  'recipeTeaser',
]

/**
 * @param {Record<string, unknown>} doc
 */
export function articleToSearchDoc(doc) {
  const authors = doc.tv?.szerzo
  let szerzo = ''
  if (Array.isArray(authors)) {
    szerzo = authors.map((a) => a?.name || a?.val || '').filter(Boolean).join(' ')
  }
  return {
    id: doc.id,
    path: doc.path,
    title: doc.title,
    longtitle: doc.longtitle,
    description: doc.description,
    ellipsis: doc.ellipsis,
    content: doc.content,
    img: doc.img,
    tv: doc.tv,
    szerzo,
  }
}

/**
 * @param {import('firebase-admin/firestore').Firestore} firestore
 */
export async function loadRecipesForSearch(firestore) {
  const snap = await firestore.collection('recipes').get()
  if (snap.empty) {
    try {
      const fs = await import('node:fs')
      const data = fs.readFileSync(
        path.join(root, 'src/lib/data/recipes.json'),
        'utf8'
      )
      const parsed = JSON.parse(data)
      return Array.isArray(parsed) ? parsed.filter((r) => r.published !== false) : []
    } catch {
      return []
    }
  }
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((r) => r.published !== false)
}

/**
 * @param {Record<string, unknown>} r
 */
export function recipeToSearchDoc(r) {
  const ing = (r.ingredientNames ?? []).join(' ')
  const terms = (r.searchTerms ?? []).join(' ')
  const path = `receptsarok/${r.year}/${r.id}`
  return {
    id: `rs-${r.year}-${r.id}`,
    path,
    title: r.title,
    longtitle: r.title,
    description: r.description ?? '',
    ellipsis: r.description ?? '',
    szerzo: r.author ?? '',
    content: `${terms} ${ing} ${r.title} ${r.author ?? ''}`.trim(),
    img: r.image,
    tv: { tags: ['recept'] },
    free: r.free === true,
    recipeTeaser: {
      year: r.year,
      id: r.id,
      title: r.title,
      author: r.author,
      image: r.image,
      free: r.free === true,
    },
  }
}

/**
 * @param {Record<string, unknown>[]} articles
 * @param {Record<string, unknown>[]} recipes
 */
export function buildMiniSearchIndex(articles, recipes) {
  const miniSearch = new MiniSearch({
    fields: SEARCH_FIELDS,
    storeFields: SEARCH_STORE_FIELDS,
    extractField: (document, fieldName) => {
      if (fieldName === 'szerzo') {
        if (typeof document.szerzo === 'string') return document.szerzo
        const authors = document.tv?.szerzo
        if (Array.isArray(authors)) {
          return authors.map((a) => a?.name).filter(Boolean).join(' ')
        }
        return null
      }
      return document[fieldName]
    },
  })
  const listed = articles.filter((d) => {
    const tags = d.tv?.tags ?? []
    if (!tags.length || tags[0] === 'folder' || d.redirect) return false
    return true
  })
  const docs = [
    ...listed.map(articleToSearchDoc),
    ...recipes.map(recipeToSearchDoc),
  ]
  miniSearch.addAll(docs)
  return { miniSearch, articleCount: listed.length, recipeCount: recipes.length, docs }
}

/**
 * @param {import('firebase-admin/firestore').Firestore} firestore
 * @param {Record<string, unknown>[]} allDocs
 */
export async function buildAndUploadSearchIndex(firestore, allDocs) {
  const recipes = await loadRecipesForSearch(firestore)
  const { miniSearch, articleCount, recipeCount } = buildMiniSearchIndex(allDocs, recipes)
  const version = Date.now()
  const json = JSON.stringify(miniSearch.toJSON())
  const gzipped = gzipSync(Buffer.from(json, 'utf8'))

  const objectPath = `search/index-${version}.json.gz`
  const indexUrl = await uploadPublicFile(objectPath, gzipped, 'application/gzip')

  const collectionsMod = await import(
    pathToFileURL(path.join(root, 'src/lib/modx/collections.ts')).href
  )
  const { isListedDoc } = collectionsMod
  const listedCount = allDocs.filter(isListedDoc).length

  await firestore.collection('meta').doc('search').set({
    indexUrl,
    version,
    generatedAt: new Date().toISOString(),
    articleCount,
    recipeCount,
  })

  await firestore.collection('meta').doc('stats').set({
    articleCount,
    listedCount,
    recipeCount,
    updatedAt: new Date().toISOString(),
  })

  const staticMetaPath = path.join(root, 'static', 'search-meta.json')
  const fs = await import('node:fs')
  fs.mkdirSync(path.dirname(staticMetaPath), { recursive: true })
  fs.writeFileSync(
    staticMetaPath,
    JSON.stringify({ indexUrl, version, articleCount, recipeCount }, null, 2)
  )

  console.log(
    `search index: ${objectPath} (${(gzipped.length / 1024 / 1024).toFixed(2)} MiB gzip), articles=${articleCount}, recipes=${recipeCount}`
  )

  return { indexUrl, version, articleCount, recipeCount, listedCount }
}
