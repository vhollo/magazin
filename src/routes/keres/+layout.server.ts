///** @type {import('./$types').PageServerLoad} */
export const prerender = false
import { dev } from '$app/environment'
import MiniSearch from 'minisearch'

import { /* modxDoc,  */allDocs } from '$lib/modx'
import { getRecipes } from '$lib/siteConf'
import { recipeDetailSegments, type Recipe } from '$lib/receptsarok'

// const stopWords = new Set(['a', 'az', 'és', 'vagy', 'de', 'ha', 'hogy', 'is', 'nem', 'csak', 'meg', 'mint', 'mert', 'egy', 'kell', 'lehet', 'volt', 'lesz', 'van', 'itt', 'ott', 'ahol', 'amikor', 'akkor', 'így', 'úgy', 'még', 'már', 'sem', 'se', 'sok', 'kevés', 'több', 'kevesebb', 'nagyon', 'igen', 'majd', 'most', 'mindig', 'soha', 'talán', 'persze', 'valami', 'valaki', 'valahol', 'valamikor', 'minden', 'senki', 'semmi', 'sehol', 'semikor', 'ez', 'azt', 'ezt', 'ebben', 'abban', 'ettől', 'attól', 'ilyen', 'olyan', 'én', 'te', 'ő', 'mi', 'ti', 'ők', 'aki', 'ami', 'akik', 'amik', 'amely', 'amelyek', 'ahogy', 'amint', 'amíg', 'hiszen', 'hanem', 'illetve', 'valamint', 'tehát', 'azaz', 'vagyis', 'azonban', 'viszont', 'pedig', 'mégis', 'annak', 'ennek', 'azzal', 'ezzel', 'arra', 'erre', 'arról', 'erről' ])

const miniSearch = new MiniSearch({
  fields: ['szerzo', 'longtitle', 'description', 'ellipsis', 'content'], // fields to index for full-text search
  storeFields: ['longtitle', 'path', 'description', 'ellipsis', 'content'/* , 'tv', 'img', 'video', 'table' */], // fields to return with search results
  // processTerm: (term, _fieldName) => stopWords.has(term) ? null : term.toLowerCase(),
  extractField: (document, fieldName) => {
    if (fieldName === 'szerzo') {
      if (typeof document.szerzo === 'string') return document.szerzo
      const authors = document.tv?.szerzo;
      if (Array.isArray(authors)) {
        return authors.map(author => author.name).join(' ');
      }
      return null;
    }

    // Access nested fields for other cases
    // return fieldName.split('.').reduce((doc, key) => doc && doc[key], document)

    return document[fieldName]
  }
})

function recipeToKeresDoc(r: Recipe) {
  const path = `receptsarok/${recipeDetailSegments(r)}`
  const description = `${r.energy} kcal · ${r.protein} g fehérje · ${r.carbs} g szénhidrát · ${r.fiber} g rost`
  const ing = (r.ingredientNames ?? []).join(' ')
  const terms = (r.searchTerms ?? []).join(' ')
  const ellipsis = `<p class="text-sm opacity-80">Receptsarok · ${r.category} · ${description}</p>`
  const img = r.image
    ? {
        src: r.image.src,
        pos: '50% 40%',
        ext: r.image.src.split('.').pop()?.split('?')[0] || 'jpg',
      }
    : null
  return {
    id: `rs-${r.year}-${r.id}`,
    szerzo: r.author,
    longtitle: r.title,
    description,
    ellipsis,
    content: `${terms} ${ing} ${r.title} ${r.author}`.trim(),
    path,
    img,
    tv: { tags: ['receptsarok', 'recept'] },
  }
}

const rsRecipes: Recipe[] = await getRecipes()
const recipeKeresDocs = rsRecipes.map(recipeToKeresDoc)
miniSearch.addAll([...allDocs, ...recipeKeresDocs])


export async function load({ url }) {

  const q = url?.searchParams?.get('q') || ''
  let doc, docs: any[] = []//, query, page = 0

    doc = {'path': 'keres' , 'title': `Keresés: "${q}"` }
    docs = q ? miniSearch.search(q, { boost: { ellipsis: 2 }, fuzzy: 0.2 })/* .sort((a, b) => b.id - a.id) */ : []
    if (dev) console.log('search:', q, docs.length)
    // console.log(docs[1])

    /* if (!docs.length) {
      doc = {'path': 'keres' , 'title': `Nem található: "${q}"` }
    } */

  /* if (!doc && !docs.length) {
    doc = {'path': '/'}
  } */
  return {doc, docs, count: allDocs.length + rsRecipes.length}
}

/// 3834: /cikkek/diabetes/2306/lent-es-fent