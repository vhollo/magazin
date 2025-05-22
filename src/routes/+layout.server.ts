///** @type {import('./$types').PageServerLoad} */
import MiniSearch from 'minisearch'

// export const prerender = true
import { modxDoc, modxDocs } from '$lib/modx'
console.log('docs:',modxDocs.length)
// import { PUBLIC_BASE_URL } from '$env/static/public'

import { getSiteConf } from '$lib/siteConf';
const conf = await getSiteConf();
// let conf = JSON.parse(JSON.stringify(c))

const miniSearch = new MiniSearch({
  fields: ['longtitle', 'description', 'introtext', 'content'], // fields to index for full-text search
  storeFields: ['longtitle', 'path', 'description', 'introtext', 'content', 'tvs', 'img'], // fields to return with search results
})
miniSearch.addAll(modxDocs)


interface Docs {
  [key: string]: object;
}
interface Queries {
  [key: string]: string[];
}

const queries: Queries = {
  //'s-o-s': ['testmozgás', 'megelőzés', 'önellenőrzés', 'kezelés', 'szakellátás'],
  's-o-s': ['diabpont', 'edukáció', '-covid-19'],
  'junior': ['+junior', '-covid-19'],
  'gdm': ['+várandósság', '-személyes'],
  'varandossag': ['+várandósság', '+személyes'],
  'gyermekvallalas': ['+várandósság', 'edukáció'],
  'inzulinok': ['+inzulin', 'piac', 'kezelés', '-önellenőrzés'],
  'gyogyszerek': ['+gyógyszer', 'piac', 'kezelés', '-önellenőrzés'],
  'technikai-eszkozok': ['+készülék', 'piac', 'kezelés', '-önellenőrzés', '-megelőzés'],
  'receptek': ['recept', '-táplálkozás'],
  'taplalkozas': ['+táplálkozás', '+edukáció', '-recept', '-covid-19'],
  // 'dieta': ['+táplálkozás', '+edukáció', '-recept', '-covid-19'],
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
  'megelozes': ['+megelőzés', '+szövődmények', '-covid-19'],
  'kozosseg': ['+közösség', '+személyes', '-egyesület', '-rendezvény', '-covid-19'],
  'egyesulet': ['+egyesület', '-covid-19'],
  'esemenyek': ['beszámoló', 'közösség', 'egyesület', '-személyes', '-rendezvény', '-covid-19'],
  'rendezvenyek': ['+rendezvény', '-covid-19'],
  'hirek': ['hirek'],
  'gyogyitok': ['+személyes', '#orvosok', 'szakellátás', 'elismerés', '-kezelés', '-covid-19'],
  'sorstarsak': ['+személyes', 'elismerés', '-szakellátás', '-orvosok', '-önellenőrzés', '-kezelés', '-várandósság', '-közösség', '-edukáció', '-egyesület', '-covid-19'], 
  'all': [],
}

const docsByTags = (tags:Array<string>, id:string | undefined) => {
  // console.log(id,{tags})
  let docs = modxDocs.filter(doc => {
    // doc.rank = tags.length && !doc.tvs.tag.find(tag => tags.includes(`-${tag}`)) && (tags.filter(t => t.startsWith('+')).length == doc.tvs.tag.filter(tag => tags.includes(`+${tag}`)).length) && doc.tvs.tag.filter(tag => (tags.includes(tag) || tags.includes(`+${tag}`) || tags.includes(`#${tag}`))).length || 0
    doc.rank = tags.length && !doc.tvs.tag.find(tag => tags.includes(`-${tag}`)) && doc.tvs.tag.filter(tag => (tags.includes(tag) || tags.includes(`+${tag}`) || tags.includes(`#${tag}`))).length || 0
    
    // doc.rank = doc.tvs.tag.filter(tag => tags.includes(`+${tag}`)).length * 1
    doc.rank = doc.tvs.tag.filter(tag => tags.includes(`+${tag}`)).length * 100 + doc.tvs.tag.filter(tag => tags.includes(`#${tag}`)).length * 10 + doc.rank
    //if (doc.id == '4091') console.log(doc.tvs.tag,tags,doc.rank)
    //if (doc.rank > 0) console.log('R',doc.rank)
    return doc.id != id && !doc.isfolder && doc.rank > 0
  }) || []
  docs.sort((a, b) => b.rank - a.rank)
  console.log('docs:',docs.length)
  return docs.slice(0, 18 * 4)
  // return docs
}


export async function load({ params, url }) {

  const q = url.searchParams.get('q')
  const path:string = params.path || '/'
  let doc, docs:Docs = {}//, query, page = 0

  switch (true) {
    case path === '/': /// start page
      // doc = {'path': '/'}
      doc = {'path': '/'}
      docs = modxDocs.slice(0, 18 * 4)
      break
    case !!queries[path]: /// a collection
      //console.log('queries:',queries[path])
      // query = queries[path] ///?
      doc = {'path': path}
      docs = docsByTags(queries[path], '0')
      //console.log('path:',path)
      break
    case path === 'keres': /// search results
      doc = {'path': 'keres' , 'pagetitle': `Keresés: "${q}"` }
      docs = miniSearch.search(q)
      console.log('search:',docs.length)
      break
    default: /// page path
      // console.log('default:',params.path)
      doc = modxDoc(path) || {}
      // query = doc.tvs && doc.tvs.tag || []
      // docs = modxDocs.filter((doc: { tvs: { tag: string | any[]; }; }) => doc.tvs.tag?.length).slice(0, 18 * 3)
      docs = docsByTags(doc.tvs.tag, doc.id)
      // console.log('ID:',doc.id, doc.tvs.tag, docs.length)
    }

  //console.log(Object.keys(query))
  /* if (query) {
    docs = docsByTags(query, doc?.id)
  } else if (path === 'keres') {
    docs = miniSearch.search(q)
    console.log('search:',docs.length)
  } else docs = modxDocs.filter((doc: { tvs: { tag: string | any[]; }; }) => doc.tvs.tag?.length).slice(0, 18 * 5) */

  /* if (!doc && !docs.length) {
    doc = {'path': '/'}
  } */
  return {doc, docs, conf}
}

/// 3834: /cikkek/diabetes/2306/lent-es-fent