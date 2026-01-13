import { redirect } from '@sveltejs/kit';
import { /* modxDoc,  */allDocs } from '$lib/modx'
console.log('docs:',allDocs.length)

// import MiniSearch from 'minisearch'
// const stopWords = new Set(['a', 'az', 'és', 'vagy', 'de', 'ha', 'hogy', 'is', 'nem', 'csak', 'meg', 'mint', 'mert', 'egy', 'kell', 'lehet', 'volt', 'lesz', 'van', 'itt', 'ott', 'ahol', 'amikor', 'akkor', 'így', 'úgy', 'még', 'már', 'sem', 'se', 'sok', 'kevés', 'több', 'kevesebb', 'nagyon', 'igen', 'majd', 'most', 'mindig', 'soha', 'talán', 'persze', 'valami', 'valaki', 'valahol', 'valamikor', 'minden', 'senki', 'semmi', 'sehol', 'semikor', 'ez', 'azt', 'ezt', 'ebben', 'abban', 'ettől', 'attól', 'ilyen', 'olyan', 'én', 'te', 'ő', 'mi', 'ti', 'ők', 'aki', 'ami', 'akik', 'amik', 'amely', 'amelyek', 'ahogy', 'amint', 'amíg', 'hiszen', 'hanem', 'illetve', 'valamint', 'tehát', 'azaz', 'vagyis', 'azonban', 'viszont', 'pedig', 'mégis', 'annak', 'ennek', 'azzal', 'ezzel', 'arra', 'erre', 'arról', 'erről' ])
// const miniSearch = new MiniSearch({
//   fields: ['szerzo', 'longtitle', 'description', 'ellipsis', 'content'], // fields to index for full-text search
//   storeFields: ['longtitle', 'path', 'description', 'ellipsis', 'content', 'tv', 'img', 'video', 'table'], // fields to return with search results
//   processTerm: (term, _fieldName) => stopWords.has(term) ? null : term.toLowerCase(),
//   extractField: (document, fieldName) => {
//     if (fieldName === 'szerzo') {
//       const authors = document.tv?.szerzo;
//       if (Array.isArray(authors)) {
//         return authors.map(author => author.name).join(' ');
//       }
//       return null;
//     }

//     // Access nested fields for other cases
//     return fieldName.split('.').reduce((doc, key) => doc && doc[key], document)
//   }
// })
// miniSearch.addAll(allDocs)


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
  'muveszet': ['művészet', '-covid-19'],
  'jogi-utmutatok': ['jog', '-covid-19'],
  'idegrendszer': ['+neuropátia', 'szövődmények', 'edukáció', '-covid-19'],
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
  'diaeuro': ['+diaeuro'],
  // 'kviz': ['diabpont'],
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
  // console.log('docs:',docs.length)
  return docs.slice(0, 18 * 4)
  // return docs
}


export async function load({ params, url }) {

  // const from = url?.searchParams?.get('from') || ''
  const path:string = (params.path/* ?.split('/')[0] || '/' */)//.replace(/.html/, '').replace('index', '/')
  // const urlpath:string = url.pathname.split('/')[1]
  let doc, docs:Docs = {}//, query, page = 0

  switch (true) {
    /* case path === '': /// start page
      // doc = {'path': '/'}
      doc = {'path': '/'}
      docs = allDocs//.slice(0, 18 * 4)
      console.log('load:',allDocs.length)
      break */
    case !!queries[path]: /// a collection
      // console.log('collection:',queries[path])
      // query = queries[path] ///?
      doc = {'path': path}
      docs = docsByTags(queries[path], '0')
      console.log(path,queries[path],docs.length)
      break
    // case path === 'keres': /// search results
    //   doc = {'path': 'keres' , 'title': `Keresés: "${q}"` }
    //   docs = q ? miniSearch.search(q, { boost: { longtitle: 2 } })/* .sort((a, b) => b.id - a.id) */ : []
    //   console.log('search:',q,docs.length)
    //   // console.log(docs[1])
    //   break
    default: /// page path
      // console.log('click:',path)
      doc = allDocs.find(d => d.path == path)
      if (!doc) {
        console.log('_miss:', path)
        doc = {'path': path , 'title': `Nem található: "${path}"` }
        redirect(307, '/keres?q=' + encodeURIComponent(path))
      } else {
        // console.log('found:', doc.path)
      }
      // query = doc.tv && doc.tv.tags || []
      // docs = allDocs.filter((doc: { tvs: { tag: string | any[]; }; }) => doc.tv.tags?.length).slice(0, 18 * 3)
      docs = doc.tv && docsByTags(doc.tv.tags, doc.id) || allDocs.slice(0, 18 * 4)
      // console.log('ID:',doc.id, 'path:', path, docs.length)
  }

  return {doc, docs, count: allDocs.length}
}

/// 3834: /cikkek/diabetes/2306/lent-es-fent