import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
			},
			// a single static page: everything is fetched in the browser (no server, no API keys)
			adapter: adapter(),
			// the packages straight from their source, so an edit to either shows at once
			alias: {
				'@jonibach/geo-puck': '../../packages/puck/src/lib/index.ts',
				'@jonibach/geo-puck-data': '../../packages/data/src/index.ts'
			}
		})
	]
});
