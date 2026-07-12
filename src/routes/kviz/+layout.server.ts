// import type { email } from '$lib/authStore';
// import { writable } from 'svelte/store';
import type { LayoutServerLoad } from './$types';
import { getKviz } from '$lib/siteConf';

export const load: LayoutServerLoad = async () => {
	const kvizzes = await getKviz();
	return { kvizzes, doc: { 'path': 'kviz' , 'title': 'DiabKVÍZ' } }
}
