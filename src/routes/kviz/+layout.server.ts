// import type { email } from '$lib/authStore';
// import { writable } from 'svelte/store';
import type { LayoutServerLoad } from './$types';
import { getKviz } from '$lib/siteConf';
const kvizzes = await getKviz();

// console.log(kvizzes[0].starts_on.toLocaleDateString('hu-HU', {year: 'numeric'}), kvizzes[0].starts_on.toLocaleDateString('hu-HU', {month: '2-digit'}),kvizzes[0].starts_on.toLocaleDateString('hu-HU', {day: '2-digit'}))
export const load: LayoutServerLoad = () => {
	return { kvizzes, doc: { 'path': 'kviz' , 'title': 'DiabKVÍZ' } }
}
