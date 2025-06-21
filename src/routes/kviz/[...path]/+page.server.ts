export const prerender = false

/* import type { Actions } from './$types';

export const actions = {
	default: async ({request}) => {
		console.log(request.url)
		const data = await request.formData()
		console.log({data})

		// Error: Cannot use relative URL (/) with global fetch — use `event.fetch` instead: https://svelte.dev/docs/kit/web-standards#fetch-apis
		// use event.fetch instead of fetch
		const response = await fetch(request.url, {
			method: 'POST',
			body: data
		})
		console.log({response})
		const result = await response.json()
		console.log({result})
		return { success: true }
	}
	
} satisfies Actions; */

import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		
		// Log the form data for debugging
		console.log('Form submitted:', Object.fromEntries(formData));
		
		// Return success - Netlify will handle the form processing
		return { success: true };
	}
};