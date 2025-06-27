export const prerender = false
import { fail } from '@sveltejs/kit';

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
	default: async ({ request, url }) => {
		const formData = await request.formData();
		
		// Log the form data for debugging
		console.log('Form submitted:', Object.fromEntries(formData));

		let origin = url.origin;
		if (url.origin.includes('localhost')) origin = 'https://diabeteshu.netlify.app';
		try {
			// const response = await fetch(`${origin}/forms.html`, {
			const response = await fetch(`${origin}/kviz`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded'
				},
				body: new URLSearchParams(formData).toString()
			});

			if (response.status !== 200) return fail(response.status);
		} catch (err) {
			console.log('error: ', err);
			return fail(500, { postFail: true, err, location });
		}

		// Return success - Netlify will handle the form processing
		return { success: true };
	}
};

  // in the load function get the path from the url
  /* export const load = async ({ params }) => {
    const path = params.path
    console.log({path})
    return { path }
  } */