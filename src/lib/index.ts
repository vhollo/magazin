// place files you want to import through the `$lib` alias in this folder.

import { BASE_URL } from '$env/static/private';

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
modxSiteContent = /*modxSiteContent ||*/ await modxdb.select().from(modx_site_content).orderBy(desc(modx_site_content.id)).where(
  and(
    /*gt(modx_site_content.id, '3900'),*/
    eq(modx_site_content.published, '1'),
    eq(modx_site_content.type, 'document'),
    or(
      eq(modx_site_content.template, '7'), 
      eq(modx_site_content.template, '9'), 
      eq(modx_site_content.template, '13')
    )
  ),
)
console.log('modxSiteContent',modxSiteContent.length)

tmplvarContentvalues = /*tmplvarContentvalues ||*/ await modxdb.select().from(modx_site_tmplvar_contentvalues)
export const modxSzerzok = await modxdb.select().from(modx_site_htmlsnippets).where(eq (modx_site_htmlsnippets.category, 24))
//console.log(modxSzerzok)

export const modxDocs = modxSiteContent

export const modxDoc = ((p) => {
  return modxSiteContent.filter(d => d.path == p)[0]
})


const _findPath = (doc => {
  if (!doc) {
    return {}
  }
  if (doc.parent == 0) {
    doc.path = doc.alias
  } else {
    const parent = _findPath(modxSiteContent.find(d => d.id == doc.parent))
    doc.path = (parent.path || []) + '/' + doc.alias
  }
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
  if (tvs.find(tv => tv.tmplvarid == 30)) {
    doc.tvs.tag.push('diabpont')
    if (doc.description.match(/diabpont/gi) || doc.description == '') doc.description = 'DiabPONT Továbbképző program'
  }
  //console.log(doc.tvs.tag)

  doc.tvs.sze = []
  const sze = tvs.find(tv => tv.tmplvarid == 18)?.value.split(' ') || []
  //if (doc.id == '2961') console.log('TV:',sze)
  
  for (let i = 0; i < sze.length; i++) {
    let val = sze[i]
    let name = val.replaceAll('_', ' ') || ''
    const span = name.match(/(?:<span\b.*?>.*?<\/span>\s*)/g)

    //if (doc.id == '2961') console.log('VL',val);
    let snippet = modxSzerzok.find(sz => sz.name.normalize() == val)?.snippet
    //if (doc.id == '2961') console.log('SN:',snippet);

    snippet = snippet && snippet.replace('src="/','src="' + BASE_URL).replace('src="assets','src="' + BASE_URL + 'assets') || null
    if (!snippet && span) {
      snippet = name
      name = name.replace(span[0], '')
      val = val.replace(span[0], '')
    }
    if (snippet && snippet.indexOf('<') !== 0) snippet = `<p class="alairas">${snippet}</p>`
    //doc.tvs.sze[i]['full'] = snippet

    doc.tvs.sze.push({'val': val, 'name': name, 'full': snippet})
  }
  //if (doc.id == '2961') console.log('SZ:',doc.tvs.sze);

  const pos = tvs.find(tv => tv.tmplvarid == 29)?.value || 'center'
  doc.tvs.pos = pos.replace('T', '0 10%').replace('B', '0 90%').replace('L', 'left').replace('R', 'right')
  
  const credit = tvs.find(tv => tv.tmplvarid == 29)?.value || ''
  doc.tvs.img = tvs.find(tv => tv.tmplvarid == 4)?.value || ''
  /*doc.tvs.img = pimg!!pimg && Nagyito.render({
    img: { 
      file: pimg,
      desc: credit,
      align: doc.tvs.pos,
      zoom: true,
    }
  }) || ''*/

  doc.tvs.ogi = tvs.find(tv => tv.tmplvarid == 25)?.value || ''
  
  return doc
})

export const _nagyito = doc => {
  const regexp1 = /\[\[nagyito(.*?)\]\]/g
  const regexp2 = /\[\!nagyito(.*?)\!\]/g
  const matches = [...doc.content.matchAll(regexp1)] || [...doc.content.matchAll(regexp2)]
  matches?.forEach(match => {
    //console.log(match[1]);  // Text between [[nagyito and ]]
    let f, file
    if (match[1].indexOf('file=') !== -1) {
      f = [...match[1].match(/file=\`(.*?)\`/)]
      file = BASE_URL + 'assets/images/' + f[1] 
    } else if (match[1].indexOf('path=') !== -1) {
      f = [...match[1].match(/path=\`(.*?)\`/)]
      file = BASE_URL + f[1] 
    } else if (match[1].indexOf('url=') !== -1) {
      f = [...match[1].match(/url=\`(.*?)\`/)]
      file = BASE_URL + f[1] 
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
}

const _getById = (match, p1, p2) => {
  let doc = modxSiteContent.find(d => d.id == p1)
  doc = _findPath(doc)
  return `/${doc.path}`
}

const _alapjav = doc => {
  doc.content = doc.content.replaceAll(' m2', ' m<sup>2</sup>').replaceAll('A1c', 'A<sub>1c</sub>').replaceAll('®', '<sup>®</sup>').replaceAll('rel="external"', 'rel="noopener" target="_blank"').replaceAll('"assets', `"${BASE_URL}assets`)
  
  const modxlink = /\[\~(\d*)\~\]/g
  doc.content = doc.content.replaceAll(modxlink, _getById)
  doc.description = doc.description.replaceAll(modxlink, _getById)
  doc.introtext = doc.introtext.replaceAll(modxlink, _getById)

  /*const script = /(<script\b(.*?)<\/script>)/g
  const repl = doc.content.match(script)
  if(repl) {
    //doc.script = repl
    //doc.content.replace(repl, '')
    console.log(doc.id,repl)
  }*/
  
  const regexp1 = /\[\[(.*?)\]\]/g
  const regexp2 = /\[\!(.*?)\!\]/g
  const regexp3 = /\{\{(.*?)\}\}/g
  const regexp4 = /\[\+(.*?)\+\]/g
  doc.content = doc.content.replaceAll(regexp1, '').replaceAll(regexp2, '').replaceAll(regexp3, '').replaceAll(regexp4, '')

  return doc
}

for (let doc of modxSiteContent) {
  doc = _findPath(doc)

  doc = _addTVs(doc)
  //console.log(doc.id)
  doc = _nagyito(doc)
  doc = _alapjav(doc)
  //if (doc.id == 3991) console.log(doc)
}

