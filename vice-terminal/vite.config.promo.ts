import { defineConfig } from 'vite';
import base from './vite.config.ts';

// TEST-ONLY config — NEVER loaded by `dev`, `preview`, `build`, or release CI.
// The default config (vite.config.ts) must never proxy a signing shim. This
// file exists solely for the manual promo/evidence browser runs
// (scripts/dev-promo.sh) that drive the promo wallet shim
// (scripts/promo-sign-shim.ts) through the same origin. Load it explicitly:
//
//   bun run dev -- --config vite.config.promo.ts --port 5199
//
// Release gates assert this file is NOT referenced by package.json dev/build/
// preview scripts and that vite.config.ts contains no shim proxy.
export default defineConfig({
	...base,
	server: {
		...base.server,
		proxy: {
			// Promo/dev wallet shim (scripts/promo-sign-shim.ts) behind the same
			// origin so the managed browser can reach it without CORS/PNA blocks.
			'/shim': {
				target: 'http://127.0.0.1:18990',
				changeOrigin: true,
				rewrite: (path) => path.replace(/^\/shim/, '')
			}
		}
	}
});
