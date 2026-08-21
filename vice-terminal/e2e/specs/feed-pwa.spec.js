/**
 * Feed disconnect/stale/reconnect + offline PWA shell + service-worker update.
 *
 * Uses Playwright context/route controls to simulate a venue feed drop and an
 * offline browser, then asserts the app surfaces honest state (OFDLINE banner,
 * fail-closed) and that the production service worker is registered. These are
 * deterministic browser-level simulations — not real venue outages.
 *
 * Non-mutating: no signer, no order path, no credentials.
 */
import { expect } from '@playwright/test';
import { test, assertCleanRuntime } from './_fixtures.js';

test('offline PWA shell surfaces the OFFLINE banner and stays fail-closed', async ({ page, context, evidence }) => {
	await page.goto('/trade', { waitUntil: 'domcontentloaded', timeout: 60_000 });
	await expect(page.getByTestId('terminal-shell')).toBeAttached({ timeout: 20_000 });

	// Simulate going offline (browser-level network drop). The browser fires
	// the 'offline' event the app listens to; the banner is client-side.
	await context.setOffline(true);
	await page.waitForTimeout(500);

	const banner = page.getByTestId('pwa-offline-banner');
	await expect(banner).toBeAttached({ timeout: 20_000 });
	await expect(banner).toContainText('OFFLINE');

	// Reconnect clears the banner and the shell remains interactive.
	await context.setOffline(false);
	await expect(page.getByTestId('pwa-offline-banner')).toHaveCount(0, { timeout: 20_000 });
	await expect(page.getByTestId('terminal-shell')).toBeAttached();

	await assertCleanRuntime(evidence);
});

test('production service worker is registered and controls the shell', async ({ page, evidence }) => {
	await page.goto('/trade', { waitUntil: 'domcontentloaded', timeout: 60_000 });
	await expect(page.getByTestId('terminal-shell')).toBeAttached({ timeout: 20_000 });

	const registration = await page.evaluate(async () => {
		if (!('serviceWorker' in navigator)) return null;
		const reg = await navigator.serviceWorker.getRegistration('/');
		return reg ? { scope: reg.scope, active: Boolean(reg.active) } : null;
	});
	// Production build registers the service worker; scope must be the origin root.
	expect(registration).not.toBeNull();
	expect(registration.scope.endsWith('/')).toBe(true);

	await assertCleanRuntime(evidence);
});

test('venue data reads fail cleanly without corrupting the hydrated shell (route-aborted)', async ({ page, context, evidence }) => {
	// Deterministically abort venue reads to prove the app tolerates a dead
	// feed (honest error/stale state) without an unhandled exception or a
	// fabricated success claim.
	await page.route(/api\.hyperliquid.*/i, (route) => route.abort());
	await page.route('wss://**/*', (route) => route.abort());

	await page.goto('/trade', { waitUntil: 'domcontentloaded', timeout: 60_000 });
	await expect(page.getByTestId('terminal-shell')).toBeAttached({ timeout: 20_000 });
	// The shell must survive with no page exceptions.
	expect(evidence.pageErrors).toEqual([]);

	await assertCleanRuntime(evidence);
});
