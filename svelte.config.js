import adapter from '@sveltejs/adapter-netlify';
// import adapter from '@sveltejs/adapter-static'

import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://kit.svelte.dev/docs/integrations#preprocessors
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		// adapter-auto only supports some environments, see https://kit.svelte.dev/docs/adapter-auto for a list.
		// If your environment is not supported, or you settled on a specific environment, switch out the adapter.
		// See https://kit.svelte.dev/docs/adapters for more information about adapters.
		adapter: adapter(),
    prerender: {
      handleMissingId: 'ignore',//'warn', How to respond when hash links don’t correspond to an id on the destination page
			handleHttpError: ({ path, referrer, message }) => {
        // This 'referrer' variable IS exactly what you are looking for.
        console.error(`Dead link found: ${path} on page ${referrer}`);
        
        // Fail the build so you're forced to fix it
        // throw new Error(message);
      }
		},
		env: {
			publicPrefix: 'PUBLIC_',
			// privatePrefix: 'PRIVATE_'
		}
	},
	/* compilerOptions: {
    hmr: false
	} */
};

export default config;