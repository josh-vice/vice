import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		// Explicit Vercel adapter (P0 release artifact): the terminal deploys to
		// its own Vercel project with Root Directory `vice-terminal`. adapter-auto
		// is intentionally NOT used here — it would defer the platform decision to
		// the build environment and emit a warning on Vercel.
		// A single terminal function avoids duplicating the runtime and dependencies
		// across low-traffic route functions. The beta has one product surface.
		adapter: adapter({ split: false }),
		csp: {
			// This is an SSR-only trading surface; use per-response nonces so
			// generated styles/scripts remain allowed without unsafe-inline.
			mode: 'nonce',
			directives: {
				'default-src': ['self'],
				'base-uri': ['self'],
				'object-src': ['none'],
				'frame-ancestors': ['none'],
				'form-action': ['self'],
				'img-src': ['self', 'data:', 'blob:'],
				'font-src': ['self', 'data:'],
				'style-src': ['self'],
				'script-src': ['self'],
				'connect-src': [
					'self',
					'https://api.hyperliquid.xyz',
					'https://api.hyperliquid-testnet.xyz',
					'wss://api.hyperliquid.xyz',
					'wss://api.hyperliquid-testnet.xyz',
					...(process.env.NODE_ENV === 'production' ? [] : ['ws://127.0.0.1:*', 'ws://localhost:*'])
				],
				'report-uri': ['/api/csp-report'],
				'worker-src': ['self', 'blob:'],
				'manifest-src': ['self']
			}
		},
		alias: {
			$lib: './src/lib',
			$components: './src/lib/components'
		},
	}
};

export default config;
