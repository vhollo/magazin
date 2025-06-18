export const prerender = false

import type { Actions } from './$types';

export const actions = {
	default: async (event) => {
		// TODO log the form data
		return { success: true }
	}
} satisfies Actions;