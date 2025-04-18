// place files you want to import through the `$lib` alias in this folder.

import { PUBLIC_BASE_URL } from '$env/static/public';

import { eq, gt, lt, gte, lte, ne, asc, desc, and, or } from "drizzle-orm"
//import { json, text, error } from '@sveltejs/kit'
//import { mysqlTable, serial, text } from 'drizzle-orm/mysql-core'
import { modx_site_content } from '../../../drizzle/schema'
//import { modx_site_tmplvars } from '../../drizzle/schema'
import { modx_site_tmplvar_contentvalues } from '../../../drizzle/schema'
import { modx_site_htmlsnippets } from '../../../drizzle/schema'
import { modxdb } from '$lib/modx/db'

import { render } from 'svelte/server'
import Nagyito from '$lib/components/Nagyito.svelte'

//const modxSiteContent = await modxdb.query.modx_site_content.findMany(10);

let modxSiteContent: object[], tmplvarContentvalues: object[]
modxSiteContent = /*modxSiteContent ||*/ await modxdb.select().from(modx_site_content).orderBy(desc(modx_site_content.id)).where(
  and(
    /*gt(modx_site_content.id, '3900'),*/
    eq(modx_site_content.deleted, 0),
    eq(modx_site_content.published, 1),
    eq(modx_site_content.type, 'document'),
    or(
      // eq(modx_site_content.template, 7), //magazine
      eq(modx_site_content.template, 9), //junior
      eq(modx_site_content.template, 13) //szemlelet
    )
  ),
)
tmplvarContentvalues = /*tmplvarContentvalues ||*/ await modxdb.select().from(modx_site_tmplvar_contentvalues)

console.log('modxSiteContent',modxSiteContent.length)
// console.log('3284',modxSiteContent.find(d => d.id == '3284'))

export const modxSzerzok = await modxdb.select().from(modx_site_htmlsnippets).where(eq (modx_site_htmlsnippets.category, 24))
//console.log(modxSzerzok)

/* Functions */

interface TemplateVariable {
  tmplvarid: number;
  value: string;
  contentid: number;
}

const cats: { [key: string]: string } = {
  'null': '',
  'orvos': 'Orvosok üzenetei',
  'szemle': 'Hasznos tudnivalók',
  'elet': 'Személyes történetek',
  'mod': 'Egészséges életmód',
  'recept': 'Receptek'
}
const _addTVs = (doc:object) => {
  const tvs: TemplateVariable[] = tmplvarContentvalues.filter((tv: TemplateVariable) => tv.contentid == doc.id) || [];
  doc.tvs = {}

  const cat:string = tvs.find(tv => tv.tmplvarid == 23)?.value || 'null'
  doc.tvs.cat = cats[cat]

  const tags = tvs.find(tv => tv.tmplvarid == 3)?.value || ''
  doc.tvs.tag = tags.replace('diabetes','').replace('terhesség','várandósság').replace('családorvos','orvosok').split(' ').filter(t => t != '') || []
  if (tvs.find(tv => tv.tmplvarid == 30)) {
    doc.tvs.tag.push('diabpont')
    if (doc.description.match(/diabpont/gi) || doc.description == '') doc.description = 'DiabPONT Továbbképző Program'
  }

  if (doc.longtitle.match(/inzulin/gi) || doc.introtext.match(/inzulin/gi) || doc.description.match(/inzulin/gi)) doc.tvs.tag.push('inzulin')
  if (doc.longtitle.match(/gyógyszer/gi) || doc.introtext.match(/gyógyszer/gi) || doc.description.match(/gyógyszer/gi)) doc.tvs.tag.push('gyógyszer')
  if (doc.longtitle.match(/készülék/gi) || doc.introtext.match(/készülék/gi) || doc.description.match(/készülék/gi)) doc.tvs.tag.push('készülék')
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

    snippet = snippet && snippet.replace('src="/','src="' + PUBLIC_BASE_URL).replace('src="assets','src="' + PUBLIC_BASE_URL + 'assets') || null
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
  //doc.tvs.pos = pos.replace('T', '50% 10%').replace('B', '50% 90%').replace('L', 'left').replace('R', 'right')
  
  //doc.tvs.credit = tvs.find(tv => tv.tmplvarid == 28)?.value || ''
  
  const img = tvs.find(tv => tv.tmplvarid == 4)?.value || ''
  //img = img && PUBLIC_BASE_URL + img || ''
  doc.img = img && {
    'src': img && PUBLIC_BASE_URL + img || '',
    'pos': pos.replace('T', '50% 10%').replace('B', '50% 90%').replace('L', 'left').replace('R', 'right'),
    'ext': img && img.split('.').pop() || '',
    'caption': tvs.find(tv => tv.tmplvarid == 28)?.value || '',
  } || null

  //doc.tvs.img = img && PUBLIC_BASE_URL + img || ''
  doc.tvs.ogi = tvs.find(tv => tv.tmplvarid == 25)?.value || ''
  
  return doc
}

const _nagyito = doc => {
  doc.content = doc.content.replaceAll('`/assets', '`assets')
  const regexp1 = /\[\[nagyito(.*?)\]\]/g
  const regexp2 = /\[!nagyito(.*?)!\]/g
  const matches = [...doc.content.matchAll(regexp1)] || [...doc.content.matchAll(regexp2)]
  matches?.forEach(match => {
    //console.log(match[1]);  // Text between [[nagyito and ]]
    let f, file
    if (match[1].indexOf('file=') !== -1) {
      f = [...match[1].match(/file=\`(.*?)\`/)]
      file = PUBLIC_BASE_URL + 'assets/images/' + f[1] 
    } else if (match[1].indexOf('path=') !== -1) {
      f = [...match[1].match(/path=\`(.*?)\`/)]
      file = PUBLIC_BASE_URL + f[1] 
    } else if (match[1].indexOf('url=') !== -1) {
      f = [...match[1].match(/url=\`(.*?)\`/)]
      file = PUBLIC_BASE_URL + f[1] 
    }
    if (doc.img && doc.img.src.indexOf(f[1]) !== -1) {
      doc.content = doc.content.replace(match[0], '<!-- PAGEIMAGE -->')
    } else {        
      const align = match[1].indexOf('align=') !== -1 && [...match[1].match(/align=\`(.*?)\`/)]
      const zoom = match[1].indexOf('zoom=') !== -1 && [...match[1].match(/zoom=\`(.*?)\`/)]
      const bg = match[1].indexOf('bg=') !== -1 && [...match[1].match(/bg=\`(.*?)\`/)]
      const desc = match[1].indexOf('desc=') !== -1 && [...match[1].match(/desc=\`(.*?)\`/)]
      const { html } = file[1] && render(Nagyito, { props: {
        img: { 
          file: file,
          desc: desc[1] || '',
          align: align[1] || '',
          zoom: zoom[1] || '',
          bg: bg[1] || 'transparent',
        }
      }}) || ''
      doc.content = doc.content.replace(match[0], html)
    }
  })
  return doc
}

const _findPath = (doc => {
  if (!doc) {
    return {}
  }
  if (!doc.path) {
    if (doc.parent == 0) {
      doc.path = doc.alias
    } else {
      const parent = _findPath(modxSiteContent.find(d => d.id == doc.parent))
      //if (!parent.path) console.log(doc.id,doc.parent)
      doc.path = [ parent.path || '', doc.alias ].filter(x => x).join('/')
    }
  }
  return doc
})

const _pathById = (match: string, p1: number) => {
  // console.log('pathById', match, p1)
  let doc = modxSiteContent.find(d => d.id == p1)
  if (!doc) {
    // console.log('Nincs',p1)
    return ''
  }
  if (!doc.path) doc = _findPath(doc)
  return `/${doc.path}`
}

const _findChildren = (doc: object) => {
  /* if (!doc?.isfolder) {
    return doc
  } */
  let dc = doc.isfolder && doc.tvs.tag.length && modxSiteContent.filter(d => d.parent == doc.id) || []
  // let ids = dc.map(d1 => d1.id)
  if (doc.content != '') {
    dc.forEach((d2, i) => d2.children = [doc, ...dc.filter(d3 => d3.id != dc[i].id)])
    doc.children = dc
  } else {
    dc.forEach((d2, i) => d2.children = [...dc.filter(d3 => d3.id != dc[i].id)])
  }
  return doc
}

const _alapjav = doc => {
  doc.content = doc.content.replaceAll(' m2', ' m<sup>2</sup>').replaceAll('A1c', 'A<sub>1c</sub>').replaceAll('®', '<sup>®</sup>').replaceAll('rel="external"', 'rel="noopener" target="_blank"').replaceAll('"/assets', `"${PUBLIC_BASE_URL}assets`).replaceAll('"assets', `"${PUBLIC_BASE_URL}assets`)
  
  const modxlink = /\[\~(\d*)\~\]/g
  doc.content = doc.content.replaceAll(modxlink, _pathById)
  doc.description = doc.description.replaceAll(modxlink, _pathById)
  doc.introtext = doc.introtext.replaceAll(modxlink, _pathById)

  /*const script = /(<script\b(.*?)<\/script>)/g
  const repl = doc.content.match(script)
  if(repl) {
    //doc.script = repl
    //doc.content.replace(repl, '')
    console.log(doc.id,repl)
  }*/
  
  const regexp1 = /\[\[.*?\]\]/gs
  const regexp2 = /\[!.*?!\]/gs
  const regexp3 = /\{\{.*?\}\}/gs
  const regexp4 = /\[\+.*?\+\]/gs
  const regexp5 = /<!--.*?-->/gs
  doc.content = doc.content.replaceAll(regexp1, '').replaceAll(regexp2, '').replaceAll(regexp3, '').replaceAll(regexp4, '').replaceAll(regexp5, '')

  return doc
}

for (let doc of modxSiteContent) {
  doc = _findPath(doc)
  doc = _addTVs(doc)
  //console.log(doc.id)
  doc = _nagyito(doc)
  doc = _alapjav(doc)
  //if (doc.id == 3991) console.log(doc)
  doc = _findChildren(doc)
}

export const modxDocs = modxSiteContent.filter(doc => doc.tvs.tag.length && doc.content.length) //&& !doc.isfolder && doc.path !== doc.alias)

export const modxDoc = (p: string) => {
  // console.log('P:',p)
  return modxDocs.find(d => d.path == p)
}

