import { fail } from '@sveltejs/kit';

import type { Actions, PageServerLoad } from './$types';

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
}

// in the load function get the id from the url
export const load: PageServerLoad = async ({ params, parent }) => {
	const id = params.id
	const { kvizzes } = await parent()
	const kviz = kvizzes?.find((k: { id: string; }) => k.id === id)
	return { id, kviz }
}