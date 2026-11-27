import { readFileSync } from 'node:fs';
import adapter from '@sveltejs/adapter-auto';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

type R2E2EConfig = {
	apiBaseUrl: string;
};

const r2E2EConfig = JSON.parse(
	readFileSync(new URL('../scripts/r2-e2e/config.json', import.meta.url), 'utf8')
) as R2E2EConfig;

export default defineConfig(({ mode }) => {
	// Keep the ordinary developer proxy on Flask :5000. Only the isolated
	// r2-e2e mode uses the shared endpoint; an explicit env override still wins.
	const apiProxyTarget =
		process.env.VITE_API_PROXY_TARGET ??
		(mode === 'r2-e2e' ? r2E2EConfig.apiBaseUrl : 'http://127.0.0.1:5000');

	return {
		plugins: [
			sveltekit({
				compilerOptions: {
					// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
					runes: ({ filename }) =>
						filename.split(/[/\\\\]/).includes('node_modules') ? undefined : true
				},
				adapter: adapter()
			})
		],
		server: {
			port: 5173,
			proxy: {
				// Same-origin /api avoids CORS; target depends on the selected runtime mode.
				'^/api(?:/|$)': {
					target: apiProxyTarget,
					changeOrigin: true
				}
			}
		},
		preview: {
			port: 4173,
			proxy: {
				'^/api(?:/|$)': {
					target: apiProxyTarget,
					changeOrigin: true
				}
			}
		},
		test: {
			coverage: {
				provider: 'v8',
				reporter: ['text', 'text-summary', 'json-summary'],
				reportsDirectory: './coverage',
				include: ['src/core/feature/**', 'src/core/infrastructure/**', 'src/lib/i18n/**'],
				exclude: ['**/*.{test,spec}.*', '**/di/**', '**/*.svelte']
			},
			include: ['src/test/**/*.{test,spec}.{js,ts}', 'src/lib/i18n/**/*.{test,spec}.{js,ts}'],
			environment: 'node'
		}
	};
});
