import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { ViteMinifyPlugin } from 'vite-plugin-minify';

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [viteSingleFile(), ViteMinifyPlugin()],
	esbuild: process.env.NODE_ENV === 'production' ? { drop: ['console', 'debugger'] } : undefined,
	define: {
		global: 'globalThis',
	},
	resolve: {
		alias: {
			'readable-stream': 'vite-compatible-readable-stream',
		},
	},
});
