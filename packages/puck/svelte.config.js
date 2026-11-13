import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

// only used to package the library (svelte-package): TypeScript in the components becomes JavaScript
export default {
	preprocess: vitePreprocess(),
	compilerOptions: { runes: true }
};
