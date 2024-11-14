///** @type {import('./$types').PageServerLoad} */

export const prerender = true
import { modxDoc, modxDocs } from '$lib/index.ts'

interface Docs {
  [key: string]: object;
}

const queries = {
  //'s-o-s': ['testmozgás', 'megelőzés', 'önellenőrzés', 'kezelés', 'szakellátás'],
  's-o-s': ['diabpont'],
  'gdm': ['várandósság'],
  'recept': ['recept'],
  'klub': ['egyesület', 'közösség'],
  'önellenőrzés': ['önellenőrzés'],
  'táplálkozás': ['táplálkozás'],
  'testmozgás': ['testmozgás'],
  'jog': ['jog'],
  'idegrendszer': ['neuropátia', 'szövődmények', 'edukáció'],
  'vese': ['vese'],
  'látás': ['retinopátia'],
  'végtag': ['neuropátia', 'megelőzés', 'önellenőrzés'],
  'hypertonia': ['hypertonia'],
  'társbetegségek': ['társbetegségek'],
  'egyesület-klub': ['egyesület'],
  'esemény': ['közösség', 'beszámoló'],
  'rendezvény': ['rendezvény'],
  'tags': [],
}

const docsByTags = (tags, id) => {
  console.log({tags})
  let docs = modxDocs.filter(doc => {
    doc.rank = tags.length && doc.tvs.tag.filter(tag => tags.includes(tag)).length || 0
    //if (doc.rank > 1) console.log('R',doc.rank)
    return doc.id != id && !doc.isfolder
  }) || []
  docs.sort((a, b) => parseFloat(b.rank) - parseFloat(a.rank))
  return docs.slice(0, 18)
}


export async function load({ params }) {
  //if (!params.path) return {}
  //console.log('path:',params.path)
  let query = {}, doc, docs:Docs = {}

  /*switch (params.path) {
    case 'gdm':
    case 's-o-s':
    case 'recept':
    case 'klub':
      query[params.path] = queries[params.path]
      break
    case undefined:
      query = queries
      break
    default:
      doc = modxDoc(params.path) || {}
      query['tags'] = doc.tvs?.tag || []
  }*/

  switch (true) {
    case params.path === undefined:
      query = queries
      break
    case !!queries[params.path]?.length:
      query[params.path] = queries[params.path]
      console.log('path:',params.path)
      break
    default:
      doc = modxDoc(params.path) || {}
      query['tags'] = doc.tvs?.tag || []
      console.log('ID:',doc.id)
  }

  //console.log(Object.keys(query))
  for (let k of Object.keys(query)) {
    docs[k] = docsByTags(query[k], doc?.id)
    //console.log(k,query[k], docs)
  }

  return {doc, docs}
}

/// 3834: /cikkek/diabetes/2306/lent-es-fent