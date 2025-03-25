import { quizzesQuery as query, type Quiz } from '$lib/sanity/queries.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	console.log(event.locals)
	const { loadQuery } = event.locals;
	const initial = await loadQuery<Quiz[]>(query);

	// We pass the data in a format that is easy for `useQuery` to consume in the
	// corresponding `+page.svelte` file, but you can return the data in any
	// format you like.
	return {
		query,
		options: { initial }
	};
};
