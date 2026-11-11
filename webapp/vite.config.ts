import adapter from '@sveltejs/adapter-auto';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter()
		})
	],
	server: {
		port: 5173,
		proxy: {
			// Same-origin /api in dev → avoids CORS against Flask on :5000
			'/api': {
				target: 'http://127.0.0.1:5000',
				changeOrigin: true
			}
		}
	},
	preview: {
		port: 4173,
		proxy: {
			'/api': {
				target: 'http://127.0.0.1:5000',
				changeOrigin: true
			}
		}
	},
	test: {
		include: ['src/test/**/*.{test,spec}.{js,ts}'],
		environment: 'node'
	}
});
