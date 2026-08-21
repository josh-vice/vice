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
		adapter: adapter({
			// One function per route region; default runtime (nodejs20.x). The
			// terminal is SSR-only; `edge`/`isr` are deliberately not enabled so
			// every signed/trading response runs in the same Node runtime as the
			// certified server layer.
			split: true
		}),
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
		},
		// The service worker is registered manually from $lib/pwa.ts so the app
		// controls the update lifecycle (update-available notification + explicit
		// reload) instead of SvelteKit's silent auto-registration on load.
		serviceWorker: {
			register: false
		}
	}
};

export default config;
