// place files you want to import through the `$lib` alias in this folder.

import { PUBLIC_BASE_URL } from '$env/static/public';
// console.log('PUBLIC_BASE_URL',PUBLIC_BASE_URL)
import { eq, ne, desc, and, or, gt, lt, gte, lte, asc } from "drizzle-orm"
//import { json, text, error } from '@sveltejs/kit'
//import { mysqlTable, serial, text } from 'drizzle-orm/mysql-core'
import { modx_site_content } from '../../../drizzle/schema'
//import { modx_site_tmplvars } from '../../drizzle/schema'
import { modx_site_tmplvar_contentvalues } from '../../../drizzle/schema'
import { modx_site_htmlsnippets } from '../../../drizzle/schema'
import { modxdb } from '$lib/modx/db'

import { db } from '$lib/firebase-admin';
// import { doc, getDoc, collection, getDocs, setDoc } from 'firebase/firestore/lite';
// import { setDoc } from 'firebase/firestore';

import { render } from 'svelte/server'
import Nagyito from '$lib/components/Nagyito.svelte'

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
  const tvs: TemplateVariable[] = tmplvarContentvalues.filter(tv => tv.contentid == doc.id) || [];
  doc.tv = {}

  const cat:string = tvs.find(tv => tv.tmplvarid == 23)?.value || 'null'
  doc.tv.cat = cats[cat]

  const tags = tvs.find(tv => tv.tmplvarid == 3)?.value || ''
  doc.tv.tags = tags.replace('diabetes','').replace('terhesség','várandósság').replace('családorvos','orvos').split(' ').filter(t => t != '') || []
  if (tvs.find(tv => tv.tmplvarid == 30) || doc.description.match(/diabpont/gi)) {
    doc.tv.tags.push('diabpont')
    doc.description = 'DiabPONT Továbbképző Program'
  }

  if (doc.longtitle.match(/inzulin/gi) || doc.introtext.match(/inzulin/gi) || doc.description.match(/inzulin/gi)) doc.tv.tags.push('inzulin')
  if (doc.longtitle.match(/gyógyszer/gi) || doc.introtext.match(/gyógyszer/gi) || doc.description.match(/gyógyszer/gi)) doc.tv.tags.push('gyógyszer')
  if (doc.longtitle.match(/készülék/gi) || doc.introtext.match(/készülék/gi) || doc.description.match(/készülék/gi)) doc.tv.tags.push('készülék')
  //console.log(doc.tv.tags)

  doc.tv.szerzo = []
  const sze = tvs.find(tv => tv.tmplvarid == 18)?.value.split(' ') || []
  
  for (let i = 0; i < sze.length; i++) {
    let val = sze[i]
    let name = val.replaceAll('_', ' ') || ''
    const span = name.match(/(?:<span\b.*?>.*?<\/span>\s*)/gi)

    let snippet = modxSzerzok.find(sz => sz.name.normalize() == val)?.snippet
    snippet = snippet && snippet.replace('src="/','src="' + PUBLIC_BASE_URL).replace('src="assets','src="' + PUBLIC_BASE_URL + 'assets') || null
    if (!snippet && span) {
      snippet = name
      name = name.replace(span[0], '')
      val = val.replace(span[0], '')
    }
    if (snippet && snippet.indexOf('<') !== 0) snippet = `<p class="alairas">${snippet}</p>`

    doc.tv.szerzo.push({'val': val, 'name': name, 'full': snippet})
  }

  const pos = tvs.find(tv => tv.tmplvarid == 29)?.value || '50% 40%'
  const img = tvs.find(tv => tv.tmplvarid == 4)?.value || ''
  doc.img = img && {
    'src': img && PUBLIC_BASE_URL + img || '',
    'pos': pos.replace('T', '50% 10%').replace('B', '50% 90%').replace('L', 'left').replace('R', 'right'),
    'ext': img && img.split('.').pop() || '',
    'caption': tvs.find(tv => tv.tmplvarid == 28)?.value || '',
  } || null

  doc.tv.ogi = tvs.find(tv => tv.tmplvarid == 25)?.value || ''
  
  if (doc.parent == 1) {
    doc.tv.tags.push('hírek')
  }
  return doc
}

const _nagyito = doc => {
  doc.content = doc.content.replaceAll('`/assets', '`assets')
  const regexp1 = /\[\[nagyito(.*?)\]\]/g
  const regexp2 = /\[!nagyito(.*?)!\]/g
  const matches = [...doc.content.matchAll(regexp1), ...doc.content.matchAll(regexp2)]
  // if (doc.id == '1045') console.log(matches)

  matches.forEach(match => {
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
    } else {
      // file = PUBLIC_BASE_URL + 'assets/images/' + match[1]
      console.log(file)
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
          align: align[1] || 'center',
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

const _findRelated = (doc) => {
  /* if (doc.related) {
    return doc
  } */
  let dc = allDocs.filter(d => d.parent == doc.id) || []
  // let ids = dc.map(d1 => d1.id)
  if (doc.content != '') {
    dc.forEach((d2, i) => d2.related = [_relFields(doc), ...dc.filter(d3 => d3.id != dc[i].id).map(d => _relFields(d))])
  } else {
    dc.forEach((d2, i) => d2.related = dc.filter(d3 => d3.id != dc[i].id).map(d => _relFields(d)))
  }
  doc.related = dc.map(d => _relFields(d))
  return doc
}

const _alapjav = doc => {
  doc.content = doc.content.replaceAll('http:', 'https:').replaceAll('&#160;', '&nbsp;').replaceAll('> </', '></').replaceAll('<p></p>\r\n', '').replaceAll('<p></p>', '').replaceAll(' m2', ' m<sup>2</sup>').replaceAll('A1c', 'A<sub>1c</sub>').replaceAll('®', '<sup>®</sup>').replaceAll('rel="external"', 'rel="noopener" target="_blank"').replaceAll('"/assets', `"${PUBLIC_BASE_URL}assets`).replaceAll('"assets', `"${PUBLIC_BASE_URL}assets`)
  
  const modxlink = /https:\/\/www.diabetes.hu\/?\[\~(\d*)\~\]/g
  doc.content = doc.content.replaceAll(modxlink, _pathById)
  doc.description = doc.description.replaceAll(modxlink, _pathById)
  doc.introtext = doc.introtext.replaceAll(modxlink, _pathById)

  const regexp1 = /\[\[.*?\]\]/gs
  const regexp2 = /\[!.*?!\]/gs
  const regexp3 = /\{\{.*?\}\}/gs
  const regexp4 = /\[\+.*?\+\]/gs
  const regexp5 = /<!--.*?-->/gs
  const regexp6 = /<div\s+class="cim">.*?<\/div>/gs
  const regexp7 = /<div\s+class="kep">(.*?)<\/div>/gs
  const regexp8 = /<div\s+class="j_cikk">(.*?)<\/div>\s*/gs

  doc.content = doc.content.replaceAll(regexp1, '').replaceAll(regexp2, '').replaceAll(regexp3, '').replaceAll(regexp4, '').replaceAll(regexp5, '').replaceAll(regexp6, '').replaceAll(regexp7, '$1').replaceAll(regexp8, '$1')

  return doc
}

const _ellipsis = doc => {
  if (!doc.ellipsis) {
    doc.ellipsis = doc.introtext.length > 0 ? doc.introtext : doc.content.match(/<(?!aside\b|figure\b|video\b|div\b|img\b|h2\b|h3\b|ul\b|li\b)(.*?)\b[^>]*>[\s\S]*?<\/\1>/gi)?.slice(0, 2).join('') || ''
    doc.ellipsis = doc.ellipsis.replace(/<blockquote>/g, '').replace(/<\/blockquote>/g, '<br>')
    doc.table = doc.ellipsis.indexOf('<table') > -1
    doc.video = doc.content.match(/<video\b(.*?)\b[^>]*>[\s\S]*?<\/video>/gi)?.join('')
    if (doc.ellipsis.indexOf('<p') != 0 && doc.ellipsis.indexOf('<table') != 0) {
      doc.ellipsis = `<p>${doc.ellipsis}</p>`
    }
    doc.ellipsis = doc.ellipsis.replace(/<br\s*\/?>/gi, '</p><p>')
    doc.ellipsis = doc.ellipsis.replace(/<span\b.*?\b[^>]*>(.*?)<\/span>/gi, '$1')
    doc.ellipsis = doc.ellipsis.replace(/<a\b.*?\b[^>]*>(.*?)<\/a>/gi, (m, p) => p.indexOf('.') > -1 && p.indexOf(' ') == -1 ? `<span class="break-all">${p}</span>` : p)
  }
  return doc
}

const _docFields = doc => {
  return {
    id: doc.id,
    path: doc.path,
    alias: doc.alias,
    parent: doc.parent,
    title: doc.pagetitle,
    longtitle: doc.longtitle,
    description: doc.description,
    content: doc.content,
    introtext: doc.introtext,
    img: doc.img,
    tv: doc.tv,
    related: doc.related,
    ellipsis: doc.ellipsis,
    table: doc.table,
    video: doc.video,
    publishedon: doc.publishedon,
    editedon: doc.editedon,
    isfolder: doc.isfolder,
  }
}

const _relFields = doc => {
  return {
    path: doc.path,
    title: doc.pagetitle,
    longtitle: doc.longtitle,
    description: doc.description,
    introtext: doc.introtext,
    img: doc.img,
    tv: doc.tv,
    ellipsis: doc.ellipsis,
    table: doc.table,
    video: doc.video,
  }
}


import { /* browser,  */building , dev/*, version */ } from '$app/environment';
import fs from 'fs';
import path from 'path';
async function writeData(data: object[]) {
  const outputPath = path.resolve(process.cwd(), 'static', 'data.json');
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
  console.log(`Adat sikeresen mentve: ${data.length}`);
}






/*  */
/* modxSiteContent and Firebase docs */
/*  */



let modxSiteContent: object[], modxSiteHirek: object[], tmplvarContentvalues: object[], allDocs: object[]

if (building) {
  /* Firebase read */
  const docsRef = db.collection('docs');
  const snapshot = await docsRef.get();
  allDocs = snapshot.docs.map(doc => doc.data()).reverse() || [];
} else {
  try {
    const data = fs.readFileSync(path.resolve(process.cwd(), 'static', 'data.json'), 'utf8');
    allDocs = JSON.parse(data) || [];
  } catch (error) {
    console.log('No data.json found, initializing with empty array');
    allDocs = [];
  }
}
const latestEditDate = allDocs.reduce((max, doc) => doc.editedon > max ? doc.editedon : max, 0)
console.log('allDocs',allDocs.length)
// console.log('latestEditDate',latestEditDate)

modxSiteContent = /*modxSiteContent ||*/ await modxdb.select().from(modx_site_content).orderBy(desc(modx_site_content.publishedon)).where(
  and(
    gt(modx_site_content.editedon, latestEditDate),
    eq(modx_site_content.deleted, 0),
    eq(modx_site_content.published, 1),
    eq(modx_site_content.type, 'document'),
    ne(modx_site_content.parent, 1),
    or(
      // eq(modx_site_content.template, 7), //magazine
      eq(modx_site_content.template, 9), //junior
      eq(modx_site_content.template, 13) //szemlelet
    )
  ),
)

modxSiteHirek = /*modxSiteHirek ||*/ await modxdb.select().from(modx_site_content).orderBy(desc(modx_site_content.publishedon)).where(
  or(
    and(
      eq(modx_site_content.id, 2797),
      gt(modx_site_content.editedon, latestEditDate)
    ),
    and(
      gt(modx_site_content.editedon, latestEditDate),
      eq(modx_site_content.parent, 1),
      eq(modx_site_content.deleted, 0),
      eq(modx_site_content.hidemenu, 0),
      eq(modx_site_content.published, 1),
      eq(modx_site_content.type, 'document')
    )
  ),
)

tmplvarContentvalues = /*tmplvarContentvalues ||*/ await modxdb.select().from(modx_site_tmplvar_contentvalues)

console.log('modxSiteContent',modxSiteContent.length)
//console.log('modxSiteHirek',modxSiteHirek.length)
modxSiteContent.push(...modxSiteHirek)

export const modxSzerzok = await modxdb.select().from(modx_site_htmlsnippets).where(eq (modx_site_htmlsnippets.category, 24))
//console.log(modxSzerzok)



for (let doc of modxSiteContent) {
  doc = _findPath(doc)
  doc = _addTVs(doc)
  doc = _nagyito(doc)
  doc = _alapjav(doc)
  doc = _ellipsis(doc)
  // doc = _docFields(doc)
}

// const fbWrite: object[] = modxSiteContent.filter(doc => doc.tv.tags.length /* && doc.ellipsis.length */)//.map(doc => _docFields(doc))

// allDocs = all modxSiteContent merged into allDocs and overwrite docs with identical ids
modxSiteContent.forEach(doc => {
  const idx = allDocs.findIndex(d => d.id == doc.id)
  if (idx > -1) {
    allDocs[idx] = _docFields(doc)
  } else {
    allDocs.push(_docFields(doc))
  }
})

for (let doc of allDocs) {
  if (doc.isfolder /* && doc.tv.tags.length */) doc = _findRelated(doc)
}

export {allDocs} // TODO: filter out docs without ellipsis

//export const allDocs = [...allDocs, ...modxSiteContent.filter(doc => doc.tv.tags.length && (doc.content.length || doc.introtext.length)).map(doc => _docFields(doc))]// && !doc.isfolder && doc.path !== doc.alias)

// Write fbWrite into Firestore's collection 'docs'
if (building) modxSiteContent.forEach(async doc => {
  const res = await db.collection('docs').doc(String(doc.id).padStart(4, '0')).set(_docFields(doc));
})

if ((dev || building) && modxSiteContent.length) writeData(allDocs)