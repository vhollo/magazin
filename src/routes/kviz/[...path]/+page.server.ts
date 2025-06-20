export const prerender = false

import type { Actions } from './$types';

export const actions = {
	default: async ({request}) => {
		// TODO log the form data
		const data = await request.formData()
		console.log({data})
		return { success: true }
	}
} satisfies Actions;