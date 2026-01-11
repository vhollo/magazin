// place files you want to import through the `$lib` alias in this folder.

import { PUBLIC_BASE_URL } from '$env/static/public';
// console.log('PUBLIC_BASE_URL',PUBLIC_BASE_URL)
import { eq, ne, desc, and, or, gt/* , lt, gte, lte, asc */ } from "drizzle-orm"
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

import { /* browser,  */building , dev/*, version */ } from '$app/environment';
import fs from 'fs';
import path from 'path';

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

const _extraTags = (doc:object) => {
  // if (doc.id == 3400) console.log('_extraTags')
  if (doc.longtitle.match(/inzulin/gi) || doc.introtext.match(/inzulin/gi) || doc.description.match(/inzulin/gi)) doc.tv.tags.push('inzulin')
  if (doc.longtitle.match(/gyógyszer/gi) || doc.introtext.match(/gyógyszer/gi) || doc.description.match(/gyógyszer/gi)) doc.tv.tags.push('gyógyszer')
  if (doc.longtitle.match(/készülék/gi) || doc.introtext.match(/készülék/gi) || doc.description.match(/készülék/gi)) doc.tv.tags.push('készülék')
}

const _addTVs = (doc:object) => {
  // if (doc.id == 3400) console.log('_addTVs')
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
    'pos': pos.replace('T', '50% 5%').replace('B', '50% 90%').replace('L', 'left').replace('R', 'right'),
    'ext': img && img.split('.').pop() || '',
    'caption': tvs.find(tv => tv.tmplvarid == 28)?.value || '',
  } || null

  const ogi = tvs.find(tv => tv.tmplvarid == 25)?.value
  doc.tv.ogi = ogi ? PUBLIC_BASE_URL + ogi : ''
  
  if (doc.parent == 1 && !doc.tv.tags.includes('hírek')) {
    doc.tv.tags.push('hírek')
  }
  // return doc
}

const _nagyito = doc => {
  // if (doc.id == 3400) console.log('_nagyito')
  // const comments = /<!--.*?-->/gs /// TODO -> alapjav
  
  // if (doc.id=='3068') console.log(doc.content)
  doc.content = doc.content.replaceAll('`/assets', '`assets')
  const regexp1 = /\[\[nagyito(.*?)\]\]/gs
  const regexp2 = /\[!nagyito(.*?)!\]/gs
  const matches = [...doc.content.matchAll(regexp1), ...doc.content.matchAll(regexp2)]
  // if (doc.id == '1045') console.log(matches)

  matches.forEach(match => {
    // console.log(match.length,match[1]);  // Text between [[nagyito and ]]
    let f, file
    if (match[1].indexOf('file=') !== -1) {
      // console.log(doc.id, doc.path)
      // f = [...match[1].match(/file=\`(.*?)[\`\]^s]/)]
      try {
        // f = [...match[1].match(/file=`(.*?)`/)]
        // f = [...match[1].match(/file=`([^`\]]*)/)]
        f = [...match[1].match(/file=`([^`]*)/)]

        // console.log(doc.path, f)
        file = PUBLIC_BASE_URL + 'assets/images/' + f[1]
      } catch (error) {
        console.log(doc.id, doc.path, f)
      }
    } else if (match[1].indexOf('path=') !== -1) {
      f = [...match[1].match(/path=\`(.*?)\`/)]
      file = PUBLIC_BASE_URL + f[1] 
    } else if (match[1].indexOf('url=') !== -1) {
      f = [...match[1].match(/url=\`(.*?)\`/)]
      file = PUBLIC_BASE_URL + f[1] 
    } else {
      return doc
    }
    if (doc.img && doc.img.src.indexOf(f[1]) !== -1) {
      doc.content = doc.content.replace(match[0], '<!-- PAGEIMAGE -->')
    } else {        
      const align = match[1].indexOf('align=') !== -1 && [...match[1].match(/align=\`(.*?)\`/)]
      const zoom = match[1].indexOf('zoom=') !== -1 && [...match[1].match(/zoom=\`(.*?)\`/)]
      const bg = match[1].indexOf('bg=') !== -1 && [...match[1].match(/bg=\`(.*?)\`/)]
      const desc = match[1].indexOf('desc=') !== -1 && [...match[1].match(/desc=\`(.*?)\`/s)]
      let NagyitoHTML = ''
      const renderOutput = file[1] && render(Nagyito, { props: {
        img: { 
          file: file,
          desc: desc[1] || '',
          align: align[1] || 'center',
          zoom: zoom[1] || '',
          bg: bg[1] || 'white',
        }
      }});
      if(renderOutput) NagyitoHTML = renderOutput.html;

      doc.content = doc.content.replace(match[0], NagyitoHTML)
    }
  })
  // return doc
}

const _findPath = (doc: object) => {
  /* if (!doc) {
    // console.log('Nincs',doc)
    return
  } */
  // if (doc.id == 3400) console.log('_findPath')
  if (!doc.path) {
    if (doc.parent == 0) {
      doc.path = doc.alias
    } else if (doc.parent == 1) {
      doc.path = 'hirek/' + doc.alias
    } else {
      const parentDoc = everyDocs.find(d => d.id == doc.parent)
      if (!parentDoc) {
        console.log('parentDoc not found',doc.id)
        return
      }
      const parent = _findPath(parentDoc)
      if (!parent.tv?.tags?.includes('folder')) {
        parent.tv = parent.tv || {tags: []}
        parent.tv.tags.push('folder')
      }
      doc.path = [ parent.path || '', doc.alias ].filter(x => x).join('/')
    }
  }
  return doc
}

const _pathById = (p1: number) => {
  // if (p1 == 3400) console.log('_pathById')
  let doc = /* modxSiteContent.find(d => d.id == p1) || */ everyDocs.find(d => d.id == p1)
  if (!doc) {
    // console.log('Nincs',p1)
    return ''
  }
  if (!doc.path) doc = _findPath(doc)
  return `/${doc.path}`
}

const _findRelated = (doc: Object) => {
  // if (doc.id == 3400) console.log('_findRelated')
  /* if (doc.related) {
    return doc
  } */
  let dc = everyDocs.filter(d => d.parent == doc.id) || []
  // let ids = dc.map(d1 => d1.id)
  if (doc.content != '') {
    dc.forEach((d2, i) => {
      d2.related = [_relFields(doc), ...dc.filter(d3 => d3.id != dc[i].id && d3.content != '').map(d => _relFields(d))]
      const mRel = everyDocs.find(d => d.id == d2.id)
      if (mRel) mRel.related = d2.related
    })
    doc.related = dc.map(d => _relFields(d))
  } else {
    dc.forEach((d2, i) => {
      d2.related = dc.filter(d3 => d3.id != dc[i].id && d3.content != '').map(d => _relFields(d))
      const mRel = everyDocs.find(d => d.id == d2.id)
      if (mRel) mRel.related = d2.related
    })
  }
  // return doc
}

const _alapjav = doc => {
  // if (doc.id == 3400) console.log('_alapjav')
  const comments = /<!--.*?-->/gs
  doc.content = doc.content.replaceAll(comments, '').replaceAll('http:', 'https:').replaceAll('&#160;', '&nbsp;').replaceAll('<p></p>\r\n', '').replaceAll('<p></p>', '').replaceAll('&nbsp;m2', '&nbsp;m²').replaceAll(' m2', '&nbsp;m²').replaceAll('/m2', '/m²').replaceAll('A1c', 'A<sub>1c</sub>').replaceAll('®', '<sup>®</sup>').replaceAll('rel="external"', 'rel="noopener" target="_blank"').replaceAll('"/assets', `"${PUBLIC_BASE_URL}assets`).replaceAll('"assets', `"${PUBLIC_BASE_URL}assets`)
  
  doc.content = doc.content.replaceAll(/\[\*parent\*\]/g, /*modxSiteContent.find(d => d.id == doc.parent)?.id ||*/ everyDocs.find(d => d.id == doc.parent)?.id || '')
  doc.introtext = doc.introtext.replaceAll(/\[\*parent\*\]/g, /*modxSiteContent.find(d => d.id == doc.parent)?.id ||*/ everyDocs.find(d => d.id == doc.parent)?.id || '')
  doc.description = doc.description.replaceAll(/\[\*parent\*\]/g, /*modxSiteContent.find(d => d.id == doc.parent)?.id ||*/ everyDocs.find(d => d.id == doc.parent)?.id || '')

  const modxlink = /(?:https?:\/\/[^\/]+\/)?\[~(\d*)\]/g
  doc.content = doc.content.replaceAll(/\[~\[\*id\*\]~\]/g, '').replaceAll(/\/\[~\[\*id\*\]~\]/g, '').replaceAll(/\[\*id\*\]/g, doc.id).replaceAll(modxlink, (match, p1) => _pathById(p1))
  doc.description = doc.description.replaceAll(/\[~\[\*id\*\]~\]/g, '').replaceAll(/\/\[~\[\*id\*\]~\]/g, '').replaceAll(/\[\*id\*\]/g, doc.id).replaceAll(modxlink, (match, p1) => _pathById(p1))
  doc.introtext = doc.introtext.replaceAll(/\[~\[\*id\*\]~\]/g, '').replaceAll(/\/\[~\[\*id\*\]~\]/g, '').replaceAll(/\[\*id\*\]/g, doc.id).replaceAll(modxlink, (match, p1) => _pathById(p1))

  const regexp1 = /\[\[.*?\]\]/gs
  const regexp2 = /\[!.*?!\]/gs
  const regexp3 = /\{\{.*?\}\}/gs
  const regexp4 = /\[\+.*?\+\]/gs
  // const regexp5 = /<!--.*?-->/gs
  const regexp6 = /<div\s+class="cim">.*?<\/div>/gs
  const regexp7 = /<div\s+class="kep">(.*?)<\/div>/gs
  const regexp8 = /<div\s+class="j_cikk">(.*?)<\/div>\s*/gs

  doc.content = doc.content.replaceAll(regexp1, '').replaceAll(regexp2, '').replaceAll(regexp3, '').replaceAll(regexp4, '')/* .replaceAll(regexp5, '') */.replaceAll(regexp6, '').replaceAll(regexp7, '$1').replaceAll(regexp8, '$1')

  // return doc
}

const _ellipsis = doc => {
  // if (doc.id == 3400) console.log('_ellipsis')
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
  // return doc
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
  // if (doc.id == 3400) console.log('_relFields')
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


async function writeData(data: object[], lastEdit) {
  console.log('writeData',data.length)
  const dataPath = path.resolve(process.cwd(), 'src/lib/data', 'data.json');
  const editPath = path.resolve(process.cwd(), 'src/lib/data', 'lastedit.json');
  const outputDir = path.dirname(dataPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
  fs.writeFileSync(editPath, '' + lastEdit);
  console.log(`Adat sikeresen mentve: ${dataPath}`);
}






/*  */
/* modxSiteContent and Firebase docs */
/*  */



let newDocs: object[], everyDocs: object[], modxSiteHirek: object[], tmplvarContentvalues: object[], oldDocs: object[], lastEdit: number = 0

if (building) {
  try {
    const data = fs.readFileSync(path.resolve(process.cwd(), 'src/lib/data', 'data.json'), 'utf8');
    lastEdit = parseInt(fs.readFileSync(path.resolve(process.cwd(), 'src/lib/data', 'lastedit.json'), 'utf8'));
    oldDocs = JSON.parse(data) || [];
    console.log('FileAllDocs',oldDocs.length)
  } catch (error) {
    console.log('No data.json found, initializing with FB');
    oldDocs = [];
    lastEdit = 0;
    /* Firebase read TEMP OFF */
    /* const docsRef = db.collection('docs');
    const snapshot = await docsRef.get();
    oldDocs = snapshot.docs.map(doc => doc.data()).reverse() || []; */
    console.log('FBoldDocs',oldDocs.length)
  }
} else {
  try {
    const data = fs.readFileSync(path.resolve(process.cwd(), 'src/lib/data', 'data.json'), 'utf8');
    lastEdit = parseInt(fs.readFileSync(path.resolve(process.cwd(), 'src/lib/data', 'lastedit.json'), 'utf8'));
    oldDocs = JSON.parse(data) || [];
    console.log('FileAllDocs',oldDocs.length)
  } catch (error) {
    console.log('No data.json found, initializing with empty array');
    oldDocs = [];
    lastEdit = 0;
  }
  // oldDocs = [];

}
// console.log('oldDocs',oldDocs.length)
console.log('lastEdit',lastEdit)

try {
  newDocs = /*newDocs ||*/ await modxdb.select().from(modx_site_content).orderBy(desc(modx_site_content.publishedon)).where(
    and(
      gt(modx_site_content.editedon, lastEdit),
      eq(modx_site_content.deleted, 0),
      eq(modx_site_content.published, 1),
      eq(modx_site_content.type, 'document'),
      ne(modx_site_content.parent, 1),
      or(
        // eq(modx_site_content.template, 7), //magazine
        eq(modx_site_content.template, 9), //junior
        eq(modx_site_content.template, 13), //szemlelet
      )
    ),
  )
  modxSiteHirek = /*modxSiteHirek ||*/ await modxdb.select().from(modx_site_content).orderBy(desc(modx_site_content.publishedon)).where(
    or(
      and(
        eq(modx_site_content.id, 2797),
        gt(modx_site_content.editedon, lastEdit)
      ),
      and(
        gt(modx_site_content.editedon, lastEdit),
        eq(modx_site_content.parent, 1),
        eq(modx_site_content.deleted, 0),
        eq(modx_site_content.hidemenu, 0),
        eq(modx_site_content.published, 1),
        eq(modx_site_content.type, 'document')
      )
    ),
  )
  newDocs.push(...modxSiteHirek)
} catch {
  newDocs = []
}

console.log('newDocs',newDocs.length/* , newDocs[0].id */)

tmplvarContentvalues = /*tmplvarContentvalues ||*/ await modxdb.select().from(modx_site_tmplvar_contentvalues)

export const modxSzerzok = await modxdb.select().from(modx_site_htmlsnippets).where(eq (modx_site_htmlsnippets.category, 24))
//console.log(modxSzerzok)


// Initialize everyDocs with oldDocs as default
everyDocs = oldDocs

if (newDocs.length) {
  // Create a map from the cached oldDocs for efficient merging
  everyDocs = [...newDocs, ...oldDocs]
  const oldDocsMap = new Map(oldDocs.map(doc => [doc.id, doc]));


  // Process each fresh document from modxSiteContent and merge it into the map
  for (let doc of newDocs) {
    // These functions modify the 'doc' object directly
    _addTVs(doc);
    _findPath(doc);
    if (doc.tv.tags.length > 0) _extraTags(doc);
    _nagyito(doc);
    _alapjav(doc);
    _ellipsis(doc);
    
    oldDocsMap.set(doc.id, _docFields(doc));
  }


  // Reconstruct the everyDocs array from the map's values
  everyDocs = Array.from(oldDocsMap.values())

  // Now, run the final processing that requires the complete, merged list of documents
  for (let doc of newDocs) {
    const p = everyDocs.find(d => d.id == doc.parent && d.tv.tags.length > 1)
    if (p) {
      // console.log('d.id == doc.parent', doc.pagetitle)
      _findRelated(p);
    }
  }


  // write data.json to file
  if ((dev || building) && newDocs.length) {
    const lastEdit = everyDocs.reduce((max, doc) => doc.editedon > max ? doc.editedon : max, 0)
    writeData(everyDocs, lastEdit)
  }
}

export const allDocs = everyDocs.filter(doc => doc.tv.tags.length > 0 && doc.tv.tags[0] != 'folder').sort((a, b) => b.id - a.id)

// // Write fresh modxSiteContent into Firestore's collection 'docs'
if (building && dev) { // TEMPORARY OFF
  // console.log('fbWrite', modxSiteContent.length);
  console.log('fbWrite', newDocs.length);
  
  // const writePromises = modxSiteContent.map(async (doc) => {
  const writePromises = newDocs.map(async (doc) => {
    // Find the processed document in everyDocs
    const d = everyDocs.find(d => d.id == doc.id);
    if (d) {
      // This returns the promise from the .set() operation
      return db.collection('docs').doc(String(d.id).padStart(4, '0')).set(d);
    }
  });

  // Wait for all the promises in the array to finish
  Promise.all(writePromises)
    .then(() => {
      console.log('All documents successfully written to Firestore.');
    })
    .catch((error) => {
      console.error('Error writing documents to Firestore:', error);
    });
}

