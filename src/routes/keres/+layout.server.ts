///** @type {import('./$types').PageServerLoad} */
export const prerender = false
import MiniSearch from 'minisearch'

import { /* modxDoc,  */allDocs } from '$lib/modx'

// const stopWords = new Set(['a', 'az', 'és', 'vagy', 'de', 'ha', 'hogy', 'is', 'nem', 'csak', 'meg', 'mint', 'mert', 'egy', 'kell', 'lehet', 'volt', 'lesz', 'van', 'itt', 'ott', 'ahol', 'amikor', 'akkor', 'így', 'úgy', 'még', 'már', 'sem', 'se', 'sok', 'kevés', 'több', 'kevesebb', 'nagyon', 'igen', 'majd', 'most', 'mindig', 'soha', 'talán', 'persze', 'valami', 'valaki', 'valahol', 'valamikor', 'minden', 'senki', 'semmi', 'sehol', 'semikor', 'ez', 'azt', 'ezt', 'ebben', 'abban', 'ettől', 'attól', 'ilyen', 'olyan', 'én', 'te', 'ő', 'mi', 'ti', 'ők', 'aki', 'ami', 'akik', 'amik', 'amely', 'amelyek', 'ahogy', 'amint', 'amíg', 'hiszen', 'hanem', 'illetve', 'valamint', 'tehát', 'azaz', 'vagyis', 'azonban', 'viszont', 'pedig', 'mégis', 'annak', 'ennek', 'azzal', 'ezzel', 'arra', 'erre', 'arról', 'erről' ])

const miniSearch = new MiniSearch({
  fields: ['szerzo', 'longtitle', 'description', 'ellipsis', 'content'], // fields to index for full-text search
  storeFields: ['longtitle', 'path', 'description', 'ellipsis', 'content'/* , 'tv', 'img', 'video', 'table' */], // fields to return with search results
  // processTerm: (term, _fieldName) => stopWords.has(term) ? null : term.toLowerCase(),
  extractField: (document, fieldName) => {
    if (fieldName === 'szerzo') {
      const authors = document.tv.szerzo;
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
miniSearch.addAll(allDocs)


interface Docs {
  [key: string]: object;
}


export async function load({ url }) {

  const q = url?.searchParams?.get('q') || ''
  let doc, docs:Docs = {}//, query, page = 0

    doc = {'path': 'keres' , 'title': `Keresés: "${q}"` }
    docs = q ? miniSearch.search(q, { boost: { ellipsis: 2 }, fuzzy: 0.2 })/* .sort((a, b) => b.id - a.id) */ : []
    console.log('search:',q,docs[0])
    // console.log(docs[1])

    /* if (!docs.length) {
      doc = {'path': 'keres' , 'title': `Nem található: "${q}"` }
    } */

  /* if (!doc && !docs.length) {
    doc = {'path': '/'}
  } */
  return {doc, docs, count: allDocs.length}
}

/// 3834: /cikkek/diabetes/2306/lent-es-fent