///** @type {import('./$types').PageServerLoad} */

export const prerender = true
import { modxDoc, modxDocs } from '$lib/index'
// import { PUBLIC_BASE_URL } from '$env/static/public'

interface Docs {
  [key: string]: object;
}
interface Queries {
  [key: string]: string[];
}

const queries: Queries = {
  //'s-o-s': ['testmozgás', 'megelőzés', 'önellenőrzés', 'kezelés', 'szakellátás'],
  's-o-s': ['diabpont', '-covid-19'],
  'gdm': ['+várandósság', '-személyes'],
  'varandossag': ['+várandósság', '+személyes'],
  'gyermekvallalas': ['+várandósság', 'edukáció'],
  'inzulinok': ['+inzulin', 'piac', 'kezelés', '-önellenőrzés'],
  'gyogyszerek': ['+gyógyszer', 'piac', 'kezelés', '-önellenőrzés'],
  'technikai-eszkozok': ['+készülék', 'piac', 'kezelés', '-önellenőrzés', '-megelőzés'],
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
  'kozosseg': ['+közösség', '+személyes', '-egyesület', '-rendezvény', '-covid-19'],
  'egyesulet': ['+egyesület', '-covid-19'],
  'esemenyek': ['+közösség', '-személyes', '-egyesület', '-rendezvény', '-covid-19'],
  'rendezvenyek': ['+rendezvény', '-covid-19'],
  'hirek': ['rendezvény', 'beszámoló', 'közösség', 'egyesület', '-covid-19'],
  'gyogyitok': ['+személyes', '#orvosok', '#szakellátás', 'elismerés', '-kezelés', '-covid-19'],
  'sorstarsak': ['+személyes', '+szekellátás', '-orvosok', '-önellenőrzés', '-kezelés', '-várandósság', '-közösség', '-edukáció', '-egyesület', '-covid-19'], 
  'all': [],
}

const docsByTags = (tags:Array<string>, id:string) => {
  console.log(id,{tags})
  let docs = modxDocs.filter((doc: { tvs: { tag: string[] }; rank: number; id: string; isfolder: number }) => {
    doc.rank = tags.length && !doc.tvs.tag.find(tag => tags.includes(`-${tag}`)) && (tags.filter(t => t.startsWith('+')).length == doc.tvs.tag.filter(tag => tags.includes(`+${tag}`)).length) && doc.tvs.tag.filter(tag => (tags.includes(tag) || tags.includes(`+${tag}`) || tags.includes(`#${tag}`))).length || 0
    
    // doc.rank = doc.tvs.tag.filter(tag => tags.includes(`+${tag}`)).length * 1
    doc.rank = doc.tvs.tag.filter(tag => tags.includes(`+${tag}`)).length * 100 + doc.tvs.tag.filter(tag => tags.includes(`#${tag}`)).length * 10 + doc.rank
    //if (doc.id == '4091') console.log(doc.tvs.tag,tags,doc.rank)
    //if (doc.rank > 0) console.log('R',doc.rank)
    return doc.id != id && !doc.isfolder && doc.rank > 0
  }) || []
  docs.sort((a: { rank: string; }, b: { rank: string; }) => parseFloat(b.rank) - parseFloat(a.rank))
  console.log('docs:',docs.length)
  return docs.slice(0, 18 * 3)
}


export async function load({ params }) {
  const pp = params.path?.split('/') || []
  // const path = pp[0] || undefined
  //const page = +pp[1] || 0
  console.log('pp:',params)
  const path:string = params.path || 'all'
  let query, doc, docs:Docs = {}//, page = 0

  switch (true) {
    case path === 'all': /// start page
      //console.log('undefined:',params.path)
      //query = queries
      doc = {'path': '/'}
      break
    case !!queries[path]: /// a collection
      //console.log('queries:',queries[path])
      query = queries[path] ///?
      doc = {'path': path}
      //console.log('path:',path)
      break
    default: /// page path
      //console.log('default:',params.path)
      doc = modxDoc(path) || {}
      query = doc.tvs && doc.tvs.tag || []
      //console.log('ID:',doc.id)
  }

  //console.log(Object.keys(query))
  if (query) {
    //for (let k of Object.keys(query)) {
      docs = docsByTags(query, doc?.id)
      //console.log('K;',k,query[k], docs[k].length)
    //}
  } else docs = modxDocs.filter((doc: { tvs: { tag: string | any[]; }; }) => doc.tvs.tag?.length).slice(0, 18 * 5)


  console.log('l.s.:',docs.length)
  return {doc, docs, path: params.path}
}

/// 3834: /cikkek/diabetes/2306/lent-es-fent