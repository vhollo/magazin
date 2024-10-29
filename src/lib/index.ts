// place files you want to import through the `$lib` alias in this folder.

import { eq, gt, lt, gte, lte, ne, asc, desc, and, or } from "drizzle-orm"
//import { json, text, error } from '@sveltejs/kit'
//import { mysqlTable, serial, text } from 'drizzle-orm/mysql-core'
import { modx_site_content } from '../../drizzle/schema'
//import { modx_site_tmplvars } from '../../drizzle/schema'
import { modx_site_tmplvar_contentvalues } from '../../drizzle/schema'
import { modx_site_htmlsnippets } from '../../drizzle/schema'
import { modxdb } from '$lib/db'
//import { render } from 'svelte/server'
import Nagyito from '$lib/components/Nagyito.svelte'

//const modxSiteContent = await modxdb.query.modx_site_content.findMany(10);
let modxSiteContent:Array, tmplvarContentvalues:Array
modxSiteContent = /*modxSiteContent ||*/ await modxdb.select().from(modx_site_content).orderBy(desc(modx_site_content.id)).where(gt(modx_site_content.id, 3900)).where(eq(modx_site_content.published, 1)).where(eq(modx_site_content.type, 'document'))/*.where(
  or(
    eq(users.id, 42), 
    eq(users.name, 'Dan')
  )
)*/
tmplvarContentvalues = /*tmplvarContentvalues ||*/ await modxdb.select().from(modx_site_tmplvar_contentvalues)
export const modxSzerzok = await modxdb.select().from(modx_site_htmlsnippets).where(eq (modx_site_htmlsnippets.category, 24))
//console.log(modxSzerzok)


const _findPath = (doc => {
  if (!doc) {
    //console.log('ALERT', doc)
    return {}
  } //else console.log('GOOD', doc.id)
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
  //console.log('GOOD', doc.id)
  return doc
})

const cats = {
  'orvos': 'Orvosok üzenetei',
  'szemle': 'Hasznos tudnivalók',
  'elet': 'Személyes történetek',
  'mod': 'Egészséges életmód',
  'recept': 'Receptek'
}
const _addTVs = (doc => {
  //console.log('tvs', doc.id)
  const tvs = tmplvarContentvalues.filter(tv => tv.contentid == doc.id) || []
  doc.tvs = {}

  const cat = tvs.find(tv => tv.tmplvarid == 23)?.value
  doc.tvs.cat = cats[cat] || ''

  const tags = tvs.find(tv => tv.tmplvarid == 3)?.value || ''
  doc.tvs.tag = tags.replace('diabetes','').replace('terhesség','várandósság').split(' ').filter(t => t != '') || []
  //console.log(doc.tvs.tag)

  doc.tvs.sze = {}
  const sze = tvs.find(tv => tv.tmplvarid == 18)?.value
  doc.tvs.sze.val = sze || null
  doc.tvs.sze.name = sze && sze.replaceAll('_', ' ') || ''
  const snippet = modxSzerzok.find(sz => sz.name == sze)?.snippet
  doc.tvs.sze.full = snippet && snippet.replace('src="/','src="https://diabetes.hu/').replace('src="assets','src="https://diabetes.hu/assets') || null

  doc.tvs.img = tvs.find(tv => tv.tmplvarid == 4)?.value || ''

  const pos = tvs.find(tv => tv.tmplvarid == 29)?.value || ''
  doc.tvs.pos = pos.replace('T', 'top').replace('B', 'bottom').replace('L', 'left').replace('R', 'right')
  
  doc.tvs.ogi = tvs.find(tv => tv.tmplvarid == 25)?.value || ''
  
  return doc
})

const nagyito = (doc => {
  const regexp = /\[\[nagyito(.*?)\]\]/g
  const matches = [...doc.content.matchAll(regexp)]
  matches.forEach(match => {
    //console.log(match[0])  // Full match including [!nagyito and !]
    //console.log(match[1]);  // Text between [!nagyito and !]
    //filex = /file=\`(.*?)\`/;
    //console.log(match[1])
    let f, file
    if (match[1].indexOf('file=') !== -1) {
      f = [...match[1].match(/file=\`(.*?)\`/)]
      //console.log(!!match[1].indexOf('file='))
      file = 'https://diabetes.hu/assets/images/' + f[1] 
    } else if (match[1].indexOf('path=') !== -1) {
      //console.log(doc.id,match[1])
      f = [...match[1].match(/path=\`(.*?)\`/)]
      file = 'https://diabetes.hu/' + f[1] 
    } else if (match[1].indexOf('src=') !== -1) {
      //console.log(doc.id,match[1])
      f = [...match[1].match(/src=\`(.*?)\`/)]
      file = f[1] 
    }
    if (doc.tvs.img.indexOf(f[1]) !== -1) {
      doc.content = doc.content.replace(match[0], '<!-- PAGEIMAGE -->')
    } else {        
      //console.log(match[1].indexOf('align='))
      const align = match[1].indexOf('align=') !== -1 && [...match[1].match(/align=\`(.*?)\`/)]
      //console.log(match[1].indexOf('zoom='))
      const zoom = match[1].indexOf('zoom=') !== -1 && [...match[1].match(/zoom=\`(.*?)\`/)]
      //console.log(match[1].indexOf('desc='))
      const desc = match[1].indexOf('desc=') !== -1 && [...match[1].match(/desc=\`(.*?)\`/)]
      //console.log('nagyito:',file[1])
      //console.log('pageimg:',doc.tvs.img)
      const { html } = file[1] && Nagyito.render({
        img: { 
          file: file,
          desc: desc[1] || '',
          align: align[1] || '',
          zoom: zoom[1] || '',
        }
      }) || ''
      //console.log(replace)
      doc.content = doc.content.replace(match[0], html)
    }
    //console.log('  match:',match[0])
  })
  return doc
})


for (let doc of modxSiteContent) {
  doc = _findPath(doc)
  doc = _addTVs(doc)
  //console.log(doc.id)
  doc = nagyito(doc)
}

export const modxDocs = modxSiteContent

export const modxDoc = ((p) => {
  return modxSiteContent.filter(d => d.path == p)[0]
})
