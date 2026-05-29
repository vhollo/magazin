import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import devtoolsJson from 'vite-plugin-devtools-json'

export default defineConfig({
	plugins: [
    sveltekit(),
    devtoolsJson()
  ],
	server: {
		watch: {
			// Firestore sync in dev writes these on SSR; ignore to avoid full page reload loops.
			ignored: ['**/src/lib/data/*.json']
		}
	}
});
