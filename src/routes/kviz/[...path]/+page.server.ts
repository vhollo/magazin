/* export const prerender = false

import type { Actions } from './$types';

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