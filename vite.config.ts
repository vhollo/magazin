import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import devtoolsJson from 'vite-plugin-devtools-json'
import basicSsl from '@vitejs/plugin-basic-ssl'

// `npm run dev:https` sets DEV_HTTPS=1: the dev server then serves HTTPS with a
// self-signed certificate (the browser shows a one-time warning).
const devHttps = process.env.DEV_HTTPS === '1'

export default defineConfig({
	plugins: [
    sveltekit(),
    devtoolsJson(),
    ...(devHttps ? [basicSsl()] : [])
  ],
	server: {
		watch: {
			// Firestore sync in dev writes these on SSR; ignore to avoid full page reload loops.
			ignored: ['**/src/lib/data/*.json']
		}
	}
});
