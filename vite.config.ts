import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, loadEnv } from 'vite';
import devtoolsJson from 'vite-plugin-devtools-json';

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), '');
	const modxOrigin = (env.MODX_ASSET_ORIGIN || 'https://www.diabetes.hu').replace(/\/$/, '');

	return {
		plugins: [sveltekit(), devtoolsJson()],
		server: {
			proxy: {
				'/assets/images': { target: modxOrigin, changeOrigin: true },
				'/assets/media': { target: modxOrigin, changeOrigin: true }
			}
		}
	};
});
