///** @type {import('./$types').PageServerLoad} */
import MiniSearch from 'minisearch'

// export const prerender = true
import { /* modxDoc,  */allDocs } from '$lib/modx'
console.log('docs:',allDocs.length)

import { getSiteConf } from '$lib/siteConf';
// import { error } from '@sveltejs/kit';
const conf = await getSiteConf();
// let conf = JSON.parse(JSON.stringify(c))

const miniSearch = new MiniSearch({
  fields: ['longtitle', 'description', 'ellipsis', 'content'], // fields to index for full-text search
  storeFields: ['longtitle', 'path', 'description', 'ellipsis', 'content', 'tv', 'img', 'video', 'table'], // fields to return with search results
})
miniSearch.addAll(allDocs)


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
  'gyogyitok': ['+személyes', '#orvosok', 'szakellátás', 'elismerés', '-kezelés', '-covid-19'],
  'sorstarsak': ['+személyes', 'elismerés', '-szakellátás', '-orvosok', '-önellenőrzés', '-kezelés', '-várandósság', '-közösség', '-edukáció', '-egyesület', '-covid-19'], 
  'hirek': ['hírek'],
  'all': [],
}

const docsByTags = (tags:Array<string>, id:string | undefined) => {
  // console.log(id,{tags})
  let docs = allDocs.filter(doc => {
    // doc.rank = tags.length && !doc.tv.tags.find(tag => tags.includes(`-${tag}`)) && (tags.filter(t => t.startsWith('+')).length == doc.tv.tags.filter(tag => tags.includes(`+${tag}`)).length) && doc.tv.tags.filter(tag => (tags.includes(tag) || tags.includes(`+${tag}`) || tags.includes(`#${tag}`))).length || 0
    doc.rank = tags.length && !doc.tv.tags.find(tag => tags.includes(`-${tag}`)) && doc.tv.tags.filter(tag => (tags.includes(tag) || tags.includes(`+${tag}`) || tags.includes(`#${tag}`))).length || 0
    
    // doc.rank = doc.tv.tags.filter(tag => tags.includes(`+${tag}`)).length * 1
    doc.rank = doc.tv.tags.filter(tag => tags.includes(`+${tag}`)).length * 100 + doc.tv.tags.filter(tag => tags.includes(`#${tag}`)).length * 10 + doc.rank
    //if (doc.id == '4091') console.log(doc.tv.tags,tags,doc.rank)
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
      docs = allDocs.slice(0, 18 * 4)
      break
    case !!queries[path]: /// a collection
      //console.log('queries:',queries[path])
      // query = queries[path] ///?
      doc = {'path': path}
      docs = docsByTags(queries[path], '0')
      //console.log('path:',path)
      break
    case path === 'keres': /// search results
      doc = {'path': 'keres' , 'title': `Keresés: "${q}"` }
      docs = q ? miniSearch.search(q) : []
      console.log('search:',docs.length)
      // console.log(docs[1])
      break
    default: /// page path
      doc = allDocs.find(d => d.path == path) || {}
      // if (doc.id == '1045') console.log(doc.content)
      // query = doc.tv && doc.tv.tags || []
      // docs = allDocs.filter((doc: { tvs: { tag: string | any[]; }; }) => doc.tv.tags?.length).slice(0, 18 * 3)
      docs = doc.tv && docsByTags(doc.tv.tags, doc.id) || allDocs.slice(0, 18 * 4)
      // console.log('ID:',doc.id, doc.tv.tags, docs.length)
    }

    if (!doc.path) {
      doc = {'path': path , 'title': `Nem található: "${path}"` }
    }

  //console.log(Object.keys(query))
  /* if (query) {
    docs = docsByTags(query, doc?.id)
  } else if (path === 'keres') {
    docs = miniSearch.search(q)
    console.log('search:',docs.length)
  } else docs = allDocs.filter((doc: { tvs: { tag: string | any[]; }; }) => doc.tv.tags?.length).slice(0, 18 * 5) */

  /* if (!doc && !docs.length) {
    doc = {'path': '/'}
  } */
  return {doc, docs, conf}
}

/// 3834: /cikkek/diabetes/2306/lent-es-fent