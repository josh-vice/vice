/**
 * Playwright config for the production hydrated E2E suite.
 *
 * A real Chromium browser runs the built terminal, mounts Dockview, hydrates
 * Chart/Book/Tape/Ticket, and asserts the core interaction surface.
 *
 * Non-mutating by design: these specs never sign, never place/modify/cancel
 * an order, never touch a wallet or credentials. Venue reads are public
 * testnet data paths only. The venue-mutating lifecycle lives in `funded/`
 * and is excluded here (see `testDir`/`testIgnore`) plus gated inside each
 * spec.
 *
 * Mobile is covered by a dedicated spec that sets its own viewport inside
 * the desktop project, so the whole suite runs as one deterministic pass
 * (no cross-project selector divergence, no doubled venue-read load).
 *
 * Artifacts: trace/video/screenshot + console/network capture on failure are
 * written under E2E_ARTIFACTS_DIR and then sanitized by the runner.
 */
import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173';
const ARTIFACTS = process.env.E2E_ARTIFACTS_DIR ?? '.e2e-artifacts';

export default defineConfig({
	testDir: new URL('./specs', import.meta.url).pathname,
	// Funded lifecycle specs are DEFINITIONS, not auto-run. They live under
	// `funded/` outside testDir and are excluded from the normal non-mutating
	// suite; they must be run explicitly (only when their env gates are
	// satisfied) via the `e2e:funded` script.
	testIgnore: '**/funded/**',
	timeout: 60_000,
	expect: { timeout: 20_000 },
	fullyParallel: false,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	workers: 1,
	reporter: [['list'], ['json', { outputFile: `${ARTIFACTS}/playwright-report.json` }]],
	use: {
		baseURL: BASE_URL,
		trace: 'retain-on-failure',
		video: 'retain-on-failure',
		screenshot: 'only-on-failure',
		contextOptions: { reducedMotion: 'reduce' }
	},
	outputDir: `${ARTIFACTS}/traces`,
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }]
});
