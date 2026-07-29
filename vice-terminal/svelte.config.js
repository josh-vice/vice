import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter(),
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
					// The separately gated BloFin review page reads only these public
					// catalog endpoints. Private and WebSocket origins stay closed.
					'https://openapi.blofin.com',
					'https://demo-trading-openapi.blofin.com',
					'wss://api.hyperliquid.xyz',
					'wss://api.hyperliquid-testnet.xyz',
					'ws://127.0.0.1:*',
					'ws://localhost:*'
				],
				'worker-src': ['self', 'blob:'],
				'manifest-src': ['self']
			}
		},
		alias: {
			$lib: './src/lib',
			$components: './src/lib/components'
		}
	}
};

export default config;
