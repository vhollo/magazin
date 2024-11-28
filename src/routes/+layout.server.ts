///** @type {import('./$types').PageServerLoad} */

export const prerender = true
import { modxDoc, modxDocs } from '$lib/index.ts'
import { PUBLIC_BASE_URL } from '$env/static/public'

interface Docs {
  [key: string]: array;
}

const queries = {
  //'s-o-s': ['testmozgás', 'megelőzés', 'önellenőrzés', 'kezelés', 'szakellátás'],
  's-o-s': ['diabpont'],
  'gdm': ['várandósság'],
  'recept': ['recept'],
  'orvos-beteg': ['+orvosok', '+személyes', 'psziché', 'kezelés', 'edukáció', 'önellenőrzés', 'társbetegségek', 'szövődmények', '-elismerés', '-covid-19'],
  'önellenőrzés': ['önellenőrzés', '-covid-19'],
  'táplálkozás': ['táplálkozás', '-covid-19'],
  'testmozgás': ['testmozgás', '-covid-19'],
  'psziché': ['psziché', '-covid-19'],
  'jog': ['jog', '-covid-19'],
  'idegrendszer': ['neuropátia', 'szövődmények', 'edukáció', '-covid-19'],
  'vese': ['vese'],
  'látás': ['retinopátia'],
  'végtag': ['neuropátia', 'megelőzés'],
  'hypertonia': ['hypertonia', '-covid-19'],
  'társbetegségek': ['társbetegségek', '-covid-19'],
  'közösség': ['+közösség', '-egyesület', '-covid-19'],
  'egyesület': ['+egyesület', '-klub', 'közösség', '-covid-19'],
  'esemény': ['+beszámoló', 'közösség', '-covid-19'],
  'rendezvény': ['+rendezvény', 'közösség', '-covid-19'],
  'portrék': ['+személyes', '+orvosok', '-kezelés', 'elismerés'],
  'sorstársak': ['+személyes', '-orvosok', '-kezelés', '-várandósság', '-közösség', '-covid-19'], 
  //'tags': [],
}

const docsByTags = (tags, id, k) => {
  //console.log(id,{tags})
  let docs = modxDocs.filter(doc => {
    doc.rank = tags.length && !doc.tvs.tag.find(tag => tags.includes(`-${tag}`)) && (tags.filter(t => t.startsWith('+')).length == doc.tvs.tag.filter(tag => tags.includes(`+${tag}`)).length) && doc.tvs.tag.filter(tag => tags.includes(tag) || tags.includes(`+${tag}`)).length || 0
    
    doc.rank = doc.tvs.tag.filter(tag => tags.includes(`+${tag}`)).length ? doc.rank * 10 : doc.rank
    //if (doc.id == '4091') console.log(doc.tvs.tag,tags,doc.rank)
    //if (doc.rank > 0) console.log('R',doc.rank)
    return doc.id != id && !doc.isfolder && doc.rank > 0
  }) || []
  docs.sort((a, b) => parseFloat(b.rank) - parseFloat(a.rank))
  //console.log('docs:',docs.length, k)
  return docs//.slice(18 * page, 18 * (page + 1))
}


export async function load({ params }) {
  const pp = params.path?.split('/') || []
  const path = pp[0] || undefined
  //const page = +pp[1] || 0
  console.log('pp:',params)
  let query = {}, doc, docs:Docs = {}, page = 0

  switch (true) {
    case params.path === undefined: /// start page
      console.log('undefined:',params.path)
      query = queries
      doc = {'path': '/'}
      page = 1
      break
    case !!queries[path]: /// a collection
      console.log('queries:',queries[path])
      query['tags'] = queries[path] ///?
      doc = {'path': path}
      page = 1
      console.log('path:',path)
      break
    default: /// page path
      console.log('default:',params.path)
      doc = modxDoc(params.path)
      query['tags'] = doc && doc.tvs.tag || []
      //console.log('ID:',doc.id)
  }

  //console.log(Object.keys(query))
  for (let k of Object.keys(query)) {
    docs[k] = docsByTags(query[k], doc?.id, k)
    //console.log('K;',k,query[k], docs[k].length)
  }


  //console.log('page:',page)
  return {doc, docs, page}
}

/// 3834: /cikkek/diabetes/2306/lent-es-fent