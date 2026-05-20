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
import * as receptsarokDedupePipeline from '$lib/receptsarokDedupePipeline.js'

import {
  createModxTransform,
  loadReceptsarokRedirectMaps,
  type ModxTransform
} from '$lib/modx/transform'

const RS_REDIRECTS_PATH = path.resolve(process.cwd(), 'src/lib/data', 'receptsarok-redirects.json')

async function runAutomaticRecipeDedupe(docs: object[]) {
  try {
    await (receptsarokDedupePipeline as any).runMagazinRecipeDedupe({
      docs,
      applyLocal: true,
      createLocal: true,
    })
  } catch (error) {
    console.error('Automatic dedupe failed:', error)
  }
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
      d2.related = [_relFields(doc), ...dc.filter(d3 => d3.id != dc[i].id && d3.content != '' && d3.tv.tags.length != 0).map(d => _relFields(d))]
      const mRel = everyDocs.find(d => d.id == d2.id)
      if (mRel) mRel.related = d2.related
    })
    doc.related = dc.map(d => _relFields(d))
  } else {
    dc.forEach((d2, i) => {
      d2.related = dc.filter(d3 => d3.id != dc[i].id && d3.content != '' && d3.tv.tags.length != 0).map(d => _relFields(d))
      const mRel = everyDocs.find(d => d.id == d2.id)
      if (mRel) mRel.related = d2.related
    })
  }
  // return doc
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
    redirect: doc.redirect,
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
    console.log('oldDocs',oldDocs.length)
  } catch (error) {
    console.log('No data.json found, <s>initializing with FB</s>');
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
    console.log('oldDocs',oldDocs.length)
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

let modxTransform: ModxTransform = createModxTransform({
  publicBaseUrl: PUBLIC_BASE_URL,
  tmplvarContentvalues,
  modxSzerzok,
  getEveryDocs: () => everyDocs
})

if (newDocs.length) {
  // Create a map from the cached oldDocs for efficient merging
  everyDocs = [...newDocs, ...oldDocs]
  const oldDocsMap = new Map(oldDocs.map(doc => [doc.id, doc]));


  // Process each fresh document from modxSiteContent and merge it into the map
  for (let doc of newDocs) {
    const cachedDoc = oldDocsMap.get(doc.id)
    // These functions modify the 'doc' object directly
    modxTransform.addTVs(doc);
    modxTransform.findPath(doc);
    if (doc.tv.tags.length > 0) modxTransform.extraTags(doc);
    modxTransform.nagyito(doc);
    modxTransform.alapjav(doc);
    modxTransform.ellipsis(doc);
    modxTransform.setReceptsarokRedirect(doc, cachedDoc?.redirect);
    
    oldDocsMap.set(doc.id, modxTransform.docFields(doc));
  }


  // Reconstruct the everyDocs array from the map's values
  everyDocs = Array.from(oldDocsMap.values())

  // Now, run the final processing that requires the complete, merged list of documents
  const done = []
  for (let doc of newDocs) {
    if (done.includes(doc.parent)) continue;
    const p = everyDocs.find(d => d.id == doc.parent && d.tv.tags.length > 1)
    if (p) {
      // console.log('d.id == doc.parent', doc.pagetitle)
      _findRelated(p);
      done.push(p.id)
    }
  }


  // write data.json only when there are fresh MODX docs
  if ((dev || building) && newDocs.length > 0) {
    await runAutomaticRecipeDedupe(newDocs)
    modxTransform = createModxTransform({
      publicBaseUrl: PUBLIC_BASE_URL,
      tmplvarContentvalues,
      modxSzerzok,
      getEveryDocs: () => everyDocs,
      redirectMaps: loadReceptsarokRedirectMaps(RS_REDIRECTS_PATH)
    })
    for (const doc of everyDocs) {
      modxTransform.setReceptsarokRedirect(doc, doc.redirect)
    }
    const currentLastEdit = everyDocs.reduce((max, doc) => doc.editedon > max ? doc.editedon : max, 0)
    writeData(everyDocs, currentLastEdit)

    const noTag = everyDocs.filter(doc => doc.tv.tags.length == 0 && doc.content != '').sort((a, b) => b.id - a.id)
    console.log('*** writenoTag',noTag.length)
    const dataPath = path.resolve(process.cwd(), 'src/lib/data', 'noTag.json');
    const outputDir = path.dirname(dataPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    fs.writeFileSync(dataPath, JSON.stringify(noTag, null, 2));
    console.log(`*** noTag sikeresen mentve: ${dataPath}`);

  }
}

export const allDocs = everyDocs.filter(doc => doc.tv.tags.length > 0 && doc.tv.tags[0] != 'folder').sort((a, b) => b.id - a.id)
export const listedDocs = allDocs.filter((doc) => !doc.redirect)


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
