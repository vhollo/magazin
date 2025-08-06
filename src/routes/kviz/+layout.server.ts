import type { email } from '$lib/authStore';
import type { LayoutServerLoad } from './$types';
import { writable } from 'svelte/store';
import { getKvizConf } from '$lib/siteConf';
const kvizzes = await getKvizConf();

console.log(kvizzes[0].starts_on)
export const load: LayoutServerLoad = () => {
	return { kvizzes, doc: { 'path': 'kviz' , 'title': 'DiabKVÍZ' } }
}
