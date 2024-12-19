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
  'gdm': ['+várandósság'],
  'receptek': ['+recept', '-táplálkozás'],
  'taplalkozas': ['táplálkozás', '-recept', '-covid-19'],
  'orvos-beteg': ['+orvosok', '+személyes', 'psziché', 'kezelés', 'edukáció', 'önellenőrzés', 'társbetegségek', 'szövődmények', '-elismerés', '-covid-19'],
  'onmenedzseles': ['önellenőrzés', '-covid-19'],
  'testmozgas': ['testmozgás', '-covid-19'],
  'psziche': ['psziché', '-covid-19'],
  'jogi-utmutatok': ['jog', '-covid-19'],
  'idegrendszer': ['neuropátia', 'szövődmények', 'edukáció', '-covid-19'],
  'vese': ['vese'],
  'latas': ['retinopátia'],
  'vegtagok': ['neuropátia', 'megelőzés'],
  'sziv-errendszer': ['hypertonia', '-covid-19'],
  'tarsbetegsegek': ['társbetegségek', '-covid-19'],
  'kozosseg': ['+közösség', '-egyesület', '-rendezvény', '-covid-19'],
  'egyesulet': ['+egyesület', '-covid-19'],
  'esemenyek': ['+beszámoló', 'közösség', '-covid-19'],
  'rendezvenyek': ['+rendezvény', '-covid-19'],
  'hirek': ['rendezvény', 'beszámoló', 'közösség', 'egyesület', '-covid-19'],
  'gyogyitok': ['+személyes', '+orvosok', 'elismerés', '-kezelés'],
  'sorstarsak': ['+személyes', '-orvosok', '-kezelés', '-várandósság', '-közösség', '-edukáció', '-egyesület', '-covid-19'], 
  'tags': [],
}

const docsByTags = (tags, id) => {
  console.log(id,{tags})
  let docs = modxDocs.filter(doc => {
    doc.rank = tags.length && !doc.tvs.tag.find(tag => tags.includes(`-${tag}`)) && (tags.filter(t => t.startsWith('+')).length == doc.tvs.tag.filter(tag => tags.includes(`+${tag}`)).length) && doc.tvs.tag.filter(tag => tags.includes(tag) || tags.includes(`+${tag}`)).length || 0
    
    doc.rank = doc.tvs.tag.filter(tag => tags.includes(`+${tag}`)).length ? doc.rank * 10 : doc.rank
    //if (doc.id == '4091') console.log(doc.tvs.tag,tags,doc.rank)
    //if (doc.rank > 0) console.log('R',doc.rank)
    return doc.id != id && !doc.isfolder && doc.rank > 0
  }) || []
  docs.sort((a, b) => parseFloat(b.rank) - parseFloat(a.rank))
  console.log('docs:',docs.length)
  return docs//.slice(18 * page, 18 * (page + 1))
}


export async function load({ params }) {
  const pp = params.path?.split('/') || []
  const path = pp[0] || undefined
  //const page = +pp[1] || 0
  console.log('pp:',params)
  let query, doc, docs:Docs = {}, page = 0

  switch (true) {
    case params.path === undefined: /// start page
      console.log('undefined:',params.path)
      //query = queries
      doc = {'path': '/'}
      break
    case !!queries[path]: /// a collection
      console.log('queries:',queries[path])
      query = queries[path] ///?
      doc = {'path': path}
      console.log('path:',path)
      break
    default: /// page path
      console.log('default:',params.path)
      doc = modxDoc(params.path) || {}
      query = doc.tvs && doc.tvs.tag || []
      //console.log('ID:',doc.id)
  }

  //console.log(Object.keys(query))
  if (query) {
    //for (let k of Object.keys(query)) {
      docs = docsByTags(query, doc?.id)
      //console.log('K;',k,query[k], docs[k].length)
    //}
  } else docs = modxDocs.filter(doc => doc.tvs.tag?.length).slice(0, 18 * 5)


  console.log('l.s.:',docs.length)
  return {doc, docs}
}

/// 3834: /cikkek/diabetes/2306/lent-es-fent