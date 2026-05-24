import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import devtoolsJson from 'vite-plugin-devtools-json'

export default defineConfig({
	plugins: [
    sveltekit(),
    devtoolsJson()
  ],
	server: {
		proxy: {
			'/assets/images': { target: 'https://www.diabetes.hu', changeOrigin: true },
			'/assets/media': { target: 'https://www.diabetes.hu', changeOrigin: true }
		}
	}
});
