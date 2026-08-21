/**
 * Funded lifecycle config — DISCOVERY ONLY.
 *
 * The venue-mutating funded specs live under `funded/` and are excluded from
 * the normal non-mutating suite. This config is used ONLY by `bun run
 * test:e2e:funded`, which additionally requires every funded gate (env):
 *
 *   VICE_E2E_FUNDED=1  VITE_HL_NETWORK=testnet  VICE_E2E_ALLOWLIST
 *   VICE_E2E_NOTIONAL_CAP_USD  VICE_E2E_OWNER_KEY
 *
 * Even when invoked, each spec refuses to mutate unless all gates are present
 * (see funded/funded-lifecycle.spec.js). This config never runs in PR CI.
 */
import { defineConfig } from '@playwright/test';
import base from './playwright.config.js';

export default defineConfig({
	...base,
	testDir: new URL('./funded', import.meta.url).pathname,
	testIgnore: undefined,
	outputDir: `${process.env.E2E_ARTIFACTS_DIR ?? '.e2e-artifacts'}/funded-traces`,
	use: {
		...base.use,
		trace: 'on-first-retry',
		video: 'on-first-retry',
		screenshot: 'only-on-failure'
	}
});
