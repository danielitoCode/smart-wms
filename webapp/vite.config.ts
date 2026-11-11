import adapter from '@sveltejs/adapter-auto';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, '.', '');
	return {
		plugins: [
			sveltekit({
				compilerOptions: {
					runes: ({ filename }) =>
						filename.split(/[/\\\\]/).includes('node_modules') ? undefined : true
				},
				adapter: adapter()
			})
		],
		server: {
			proxy: {
				'/api': {
					target: env.VITE_API_PROXY_TARGET || 'http://localhost:5000',
					changeOrigin: true
				}
			}
		},
		test: {
			include: ['src/test/**/*.{test,spec}.{js,ts}'],
			environment: 'node'
		}
	};
});
