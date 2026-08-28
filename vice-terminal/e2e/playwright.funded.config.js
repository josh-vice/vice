/**
 * Funded lifecycle config — DISCOVERY ONLY.
 *
 * The venue-mutating funded specs live under `funded/` and are excluded from
 * the normal non-mutating suite. The config additionally requires every funded
 * mainnet gate:
 *
 *   VICE_E2E_MAINNET=1  VITE_HL_TRADING_NETWORK=mainnet
 *   VICE_E2E_MAINNET_ACK=I_ACCEPT_REAL_MAINNET_TRADING
 *   VICE_E2E_ALLOWLIST  VICE_E2E_NOTIONAL_CAP_USD
 *   VICE_E2E_OWNER_KEY  VICE_E2E_COUNTERPARTY_KEY
 *   VICE_E2E_APPROVAL_SHA256  VICE_E2E_POLICY_SHA256
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
