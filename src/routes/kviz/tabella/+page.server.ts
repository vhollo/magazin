import type { PageServerLoad } from './$types';
import { getScores } from '$lib/siteConf';

export const prerender = false;

export const load: PageServerLoad = async () => {
	try {
		const leaderboard = await getScores();

		return {
			leaderboard,
			doc: { path: 'kviz/tabella', title: 'DiabKVÍZ Tabella' }
		};
	} catch (error) {
		console.error('Error in tabella load function:', error);
		// Return empty leaderboard on error to prevent infinite reload
		return {
			leaderboard: [],
			doc: { path: 'kviz/tabella', title: 'DiabKVÍZ Tabella' }
		};
	}
};
