import 'dotenv/config';
import { getFirestoreDb } from './lib/firebase-admin.mjs';
import { isListedDoc } from '../src/lib/modx/collections.ts';

const db = getFirestoreDb();
const snap = await db.collection('docs').select('id', 'path', 'tv', 'isfolder', 'redirect').get();
const docs = snap.docs.map((d) => d.data() as any);
const listedFolders = docs.filter((d) => d.isfolder && isListedDoc(d));

// candidate rule: cikkek/<section>/<all-numeric>  (3 segments, last numeric)
const isIssueFolder = (p: string) => /^cikkek\/[^/]+\/\d+$/.test(String(p));

console.log(`Total listed folders: ${listedFolders.length}\n`);
const excluded = listedFolders.filter((d) => isIssueFolder(d.path));
const kept = listedFolders.filter((d) => !isIssueFolder(d.path));

console.log(`=== WOULD BE EXCLUDED by /^cikkek\\/[^/]+\\/\\d+$/  (${excluded.length}) ===`);
for (const d of excluded.sort((a, b) => a.path.localeCompare(b.path))) console.log(`  ${d.path}  [${(d.tv?.tags ?? []).join(', ')}]`);

console.log(`\n=== KEPT listed folders (${kept.length}) ===`);
for (const d of kept.sort((a, b) => a.path.localeCompare(b.path))) {
	const depth = d.path.split('/').length - 1;
	console.log(`  d${depth}  ${d.path}  [${(d.tv?.tags ?? []).join(', ')}]`);
}

// sanity: are diaeuro year folders kept?
console.log('\n=== sanity: diaeuro-futsal/* ===');
for (const d of listedFolders.filter((x) => String(x.path).startsWith('diaeuro-futsal')))
	console.log(`  excluded=${isIssueFolder(d.path)}  ${d.path}`);
process.exit(0);
