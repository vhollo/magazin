import type { LayoutServerLoad } from './$types';

import { getPatika } from '$lib/siteConf';
const patikas = await getPatika();
console.log('patikas1',patikas.length)

export const load: LayoutServerLoad = () => {
	return { patikas, doc: { 'patikas': patikas, 'path': 'patika' , 'title': 'Gyógyszertárkereső' } }
}

export const prerender = true
