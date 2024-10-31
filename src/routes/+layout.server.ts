///** @type {import('./$types').PageServerLoad} */

import { modxDoc, modxDocs } from '$lib/index.ts'

export async function load({ params }) {
  //if (!params.path) return {}
  console.log('path:',params.path)

  let query, doc, docs
  switch (params.path) {
    case 'gdm':
      query = {
        "id": [3552],
        "tags": [ 'várandósság'],
        /*"szerzo": [ 'Herth_Viktória', ],*/
      }
      doc = modxDocs.find(d => d.id == query.id)
      break
    case 's-o-s':
      query = {
        //"id": [3905],
        //"tags": [ 'korai_felismerés'],
        //"tags": [ 'egyesület', 'mozgás'], // pl. Sportos Cukros
        "tags": ['testmozgás', 'megelőzés', 'önellenőrzés', 'kezelés', 'szakellátás'],
        /*"tags": [ 'személyes', 'közösség', 'egyesület'],*/
        /*"szerzo": [ 'Herth_Viktória', ],*/
      }
      //doc = modxDocs.find(d => d.id == query.id)
      break
    case 'recept':
      query = {
        //"id": [3867],
        "tags": ['recept'],
        /*"szerzo": [ 'Herth_Viktória', ],*/
      }
      //doc = modxDocs.find(d => d.id == query.id)
      break
    case undefined:
      query = {
        //"id": [3867],
        "tags": [],
        /*"szerzo": [ 'Herth_Viktória', ],*/
      }
      break
    default:
      doc = modxDoc(params.path)
      query = {
        "id": [doc.id],
        "tags": doc.tvs.tag
      }
      //console.log('DEFAULT',query.id,query.tags)
  }

  if (query.tags) {
    docs = modxDocs.filter(doc => {
      //console.log(doc.id, query.id)
      doc.rank = doc.tvs.tag.filter(tag => query.tags.includes(tag) || !query.tags.length).length
      return doc.rank && doc.id != query.id && !doc.isfolder
    })/*.sort(d => d.rank)*/ || []
    docs.sort((a, b) => parseFloat(b.rank) - parseFloat(a.rank))
    docs = docs.slice(0, 19)
    //console.log(docs.length)
    //const intersection = array1.filter(element => array2.includes(element))
  }

  return {doc, docs}
}

/// 3834: /cikkek/diabetes/2306/lent-es-fent