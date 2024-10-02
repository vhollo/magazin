import { gt } from "drizzle-orm"
//import { json, text, error } from '@sveltejs/kit'
//import { mysqlTable, serial, text } from 'drizzle-orm/mysql-core'
import { modx_site_content } from '../../drizzle/schema'
import { modx_site_tmplvars } from '../../drizzle/schema'
import { modx_site_tmplvar_contentvalues } from '../../drizzle/schema'
//console.log(modx_site_tmplvar_contentvalues)

import { modxdb } from '$lib/db'
let doc, docs

const _findPath = (doc => {
  if (!doc) console.log('ALERT', doc)
  if (doc.parent == 0) {
    //console.log('P', doc.parent)
    doc.path = doc.alias
    //console.log(doc.path)
  } else {
    //console.log('P', doc.parent)
    const parent = _findPath(modxSiteContent.find(d => d.id == doc.parent))
    doc.path = (parent.path || []) + '/' + doc.alias
    //doc.path.push(doc.alias)
  }
  //console.log('R', doc.path)
  return doc
})
const _findDoc = ((p) => {
  let path = p.split('/') || []
  //console.log(path[path.length - 1])
  const docs = modxSiteContent.filter(d => d.alias == path[path.length - 1])
  //console.log('1fdoc', modxSiteContent.length, docs.length)
  if (docs.length) {
    for (let doc of docs) {
      doc = _findPath(doc)
      //console.log('docp',doc.path)
      if (doc.path/*.join('/')*/ == path.join('/')) return doc
    }
  }
})
const _addTVs = (doc => {
  //console.log('tvs', doc.id)
  const tvs = tmplvarContentvalues.filter(tv => tv.contentid == doc.id) || []
  doc.tvs = {}
  doc.tvs.cat = tvs.find(tv => tv.tmplvarid == 23)?.value || ''
  doc.tvs.tag = tvs.find(tv => tv.tmplvarid == 3)?.value.split(' ') || []
  //console.log(typeof(doc.tvs.tag))
  doc.tvs.sze = tvs.find(tv => tv.tmplvarid == 18)?.value || ''
  doc.tvs.img = tvs.find(tv => tv.tmplvarid == 4)?.value || ''
  doc.tvs.ogi = tvs.find(tv => tv.tmplvarid == 25)?.value || ''
  return doc
})

//const modxSiteContent = await modxdb.query.modx_site_content.findMany(10);
let modxSiteContent:Array, tmplvarContentvalues:Array
modxSiteContent = modxSiteContent || await modxdb.select().from(modx_site_content)//.where(gt(modx_site_content.parent, 0))
tmplvarContentvalues = tmplvarContentvalues || await modxdb.select().from(modx_site_tmplvar_contentvalues)
//console.log(tmplvarContentvalues.length)

for (let doc of modxSiteContent) {
  doc = _addTVs(doc)
  //doc = _findPath(doc)
}


///** @type {import('./$types').PageServerLoad} */
export async function load({ params }) {
  if (!params.path) return {}
  //console.log('path',params.path)

  let query = {}, doc
  switch (params.path) {
    case 'gdm':
      query = {
        "id": [3556],
        "tags": [ 'terhesség'],
        /*"szerzo": [ 'Herth_Viktória', ],*/
      }
      break;
    case 's-o-s':
      query = {
        "id": [3729],
        //"tags": [ 'korai_felismerés'],
        //"tags": [ 'egyesület', 'mozgás'], // pl. Sportos Cukros
        "tags": ['testmozgás', 'megelőzés', 'önellenőrzés', 'kezelés', 'szakellátás'],
        /*"tags": [ 'személyes', 'közösség', 'egyesület'],*/
        /*"szerzo": [ 'Herth_Viktória', ],*/
      }
      break;
    case 'recept':
      query = {
        "id": [3867],
        "tags": ['recept'],
        /*"szerzo": [ 'Herth_Viktória', ],*/
      }
      break;
    default:
      //console.log(params.path)
      doc = _findDoc(params.path)
      //console.log(doc.id)
  }

  //console.log('2qid',query)
  if (query.id) {
    doc = modxSiteContent.find(d => query.id.includes(d.id)) || doc || {}
    doc = _findPath(doc)
  }
  //console.log('l.s', doc)
  //doc = _addTVs(doc)
  
  if (query.tags) {
    docs = modxSiteContent.filter(doc => {
      doc.rank = doc.tvs.tag.filter(tag => query.tags.includes(tag)).length
      return !doc.isfolder && doc.rank
    })/*.sort(d => d.rank)*/ || []
    docs.sort((a, b) => parseFloat(b.rank) - parseFloat(a.rank))
    docs = docs.slice(0, 9)
    console.log(docs.length)
    //const intersection = array1.filter(element => array2.includes(element))
    
    for (let doc of docs) {
      doc = _findPath(doc)
    }
  }
  return {doc, docs}
}

/// 3834: /cikkek/diabetes/2306/lent-es-fent