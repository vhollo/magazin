import { allDocs } from '$lib/modx';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const patikas = allDocs.filter((doc: any) => doc.template === 'patika');
	return { patikas };
};
