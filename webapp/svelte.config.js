import adapter from '@sveltejs/adapter-auto';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter(),
		alias: {
			'#core': 'src/core',
			'#shared': 'src/shared',
			'#lib': 'src/lib'
		}
	}
};

export default config;
