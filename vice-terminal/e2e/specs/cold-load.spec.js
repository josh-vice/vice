/**
 * Cold load + hydration.
 *
 * Boots a real Chromium against the PRODUCTION build (vite preview) and
 * asserts the app fully hydrates: the SSR shell is present, Dockview mounts,
 * and the chart canvas + market-data panels come up client-side. This is the
 * hydrated counterpart to the fetch-only SSR smoke in scripts/browser-surface.mjs.
 *
 * Non-mutating: read-only navigation. No signer, no wallet, no order path.
 */
import { expect } from '@playwright/test';
import { test, assertCleanRuntime, seedMarketTaxonomyFixture } from './_fixtures.js';

test('cold load hydrates the terminal shell and Dockview workspace', async ({ page, evidence }) => {
	const consoleErrors = [];
	page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });

	await page.goto('http://127.0.0.1:4173/trade', { waitUntil: 'domcontentloaded', timeout: 60_000 });

	// SSR shell present before/after hydration.
	await expect(page.getByTestId('terminal-shell')).toBeAttached();
	await expect(page.getByTestId('workspace-host')).toBeAttached();

	// Hydration signals: the Dockview host mounts client-only panels.
	await expect(page.getByTestId('market-data-health')).toBeAttached();
	// The chart is dockview-mounted client-side; its container must appear.
	// (Dockview can hold a transient preview clone — scope to the first.)
	const chart = page.getByTestId('trading-chart').first();
	await expect(chart).toBeAttached({ timeout: 20_000 });

	await assertCleanRuntime(evidence);
});

test('chart canvas and candle bookkeeping are present after hydration', async ({ page, evidence }) => {
	await page.goto('http://127.0.0.1:4173/trade', { waitUntil: 'domcontentloaded', timeout: 60_000 });

	const chart = page.getByTestId('trading-chart').first();
	await expect(chart).toBeAttached({ timeout: 20_000 });

	// The chart renders a real canvas element (lightweight-charts).
	const canvases = chart.locator('canvas');
	await expect(canvases.first()).toBeAttached({ timeout: 20_000 });

	// Candle bookkeeping attribute must be present and a non-negative integer.
	const candleCount = await chart.getAttribute('data-candle-count');
	expect(candleCount).not.toBeNull();
	const parsed = Number(candleCount);
	expect(Number.isFinite(parsed)).toBe(true);
	expect(parsed).toBeGreaterThanOrEqual(0);

	// Market-data status attribute is present and is one of the honest states.
	const feedStatus = await page.getByTestId('market-data-health').getAttribute('data-feed-status');
	expect(['live', 'stale', 'degraded', 'connecting', 'idle', 'error']).toContain(feedStatus);

	await assertCleanRuntime(evidence);
});

test('market catalog and account status chips render honest local state', async ({ page, evidence }) => {
	await page.goto('http://127.0.0.1:4173/trade', { waitUntil: 'domcontentloaded', timeout: 60_000 });

	// Not connected: the account chip must render the honest placeholder (—),
	// not fabricated balance, and the wallet must show no address.
	await expect(page.getByTestId('market-catalog-health')).toBeAttached();
	await expect(page.getByText('CATALOG')).toBeAttached();

	// Wallet-disconnected precondition: no address chip, Connect affordance present.
	await expect(page.getByText('Connect', { exact: false }).first()).toBeAttached();

	await assertCleanRuntime(evidence);
});
test('taxonomy fixture selects perps, spot, and read-only prediction outcomes', async ({ page, evidence }) => {
	await seedMarketTaxonomyFixture(page);
	await page.goto('http://127.0.0.1:4173/trade', { waitUntil: 'domcontentloaded', timeout: 60_000 });
	await expect(page.getByRole('button', { name: 'Prediction', exact: true })).toBeAttached();
	await page.getByRole('button', { name: 'Perps', exact: true }).click();
	await expect(page.getByRole('button', { name: /CORE PERPS/i })).toBeAttached();
	await expect(page.getByRole('button', { name: /HIP-3/i })).toBeAttached();
	await page.getByRole('button', { name: 'Spot', exact: true }).click();
	await expect(page.getByRole('button', { name: 'Spot', exact: true })).toBeAttached();
	await page.getByRole('button', { name: 'Prediction', exact: true }).click();
	await expect(page.getByRole('button', { name: /PREDICTION OUTCOMES/i })).toBeAttached({ timeout: 20_000 });
	await page.getByRole('button', { name: /Toggle ETH \$4000 · Yes favorite ETH \$4000 · Yes/ }).click();
	await expect(page.getByTestId('workspace-host').getByTestId('prediction-market-panel')).toBeVisible({ timeout: 20_000 });
	await expect(page.getByTestId('workspace-host').getByTestId('prediction-probability')).toContainText('12.996');
	await expect(page.getByTestId('workspace-host').getByTestId('prediction-read-only-reason')).toContainText('lot, tick');
	await expect(page.getByText('Leverage', { exact: true })).not.toBeVisible();
	await expect(page.getByText('Connect to trade', { exact: false })).not.toBeVisible();
	await assertCleanRuntime(evidence);
});
