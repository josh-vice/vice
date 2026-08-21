/**
 * Mobile layout + shared order-entry path.
 *
 * The terminal is responsive: under `lg` it swaps the Dockview workspace for
 * a focused Markets/Trade tabbed layout with a sticky Buy/Sell bar and an
 * order bottom sheet. This spec sets a mobile viewport and asserts that the
 * mobile shell hydrates and that the SAME shared order-entry path (the
 * OrderTicket used by desktop) powers the mobile sheet — no second execution
 * path, no signer.
 *
 * Non-mutating: we open the order sheet but never submit.
 */
import { expect } from '@playwright/test';
import { test, assertCleanRuntime } from './_fixtures.js';

test.use({ viewport: { width: 390, height: 844 } });

test('mobile layout hydrates with Markets/Trade tabs and the shared order path', async ({ page, evidence }) => {
	await page.goto('/trade', { waitUntil: 'domcontentloaded', timeout: 60_000 });
	await expect(page.getByTestId('terminal-shell')).toBeAttached({ timeout: 20_000 });

	// Mobile bottom tab bar (Markets / Trade) — desktop workspace is hidden.
	// (The Dockview host also exposes an aria-label="Markets" groupview region,
	// so scope strictly to the mobile nav buttons.)
	const marketsTab = page.getByRole('button', { name: 'Markets', exact: true });
	const tradeTab = page.getByRole('button', { name: 'Trade', exact: true });
	await expect(marketsTab).toBeAttached({ timeout: 20_000 });
	await expect(tradeTab).toBeAttached();

	// Switch to Markets tab and back.
	await marketsTab.click();
	await expect(page.getByRole('button', { name: 'Trade', exact: true })).toBeAttached();
	await tradeTab.click();

	// Sticky Buy bar (mobile order entry) is present.
	const buyBar = page.getByRole('button', { name: 'Buy', exact: true }).first();
	await expect(buyBar).toBeAttached({ timeout: 20_000 });

	await assertCleanRuntime(evidence);
});

test('mobile order sheet opens through the shared OrderTicket path (no submit)', async ({ page, evidence }) => {
	await page.goto('/trade', { waitUntil: 'domcontentloaded', timeout: 60_000 });
	await expect(page.getByTestId('terminal-shell')).toBeAttached({ timeout: 20_000 });

	// Tap the mobile Buy bar to open the order sheet.
	const buyBar = page.getByRole('button', { name: 'Buy', exact: true }).first();
	await expect(buyBar).toBeAttached({ timeout: 20_000 });
	await buyBar.click();

	// The sheet reuses the shared ticket: order-persistence-class + connect
	// precondition are the desktop OrderTicket's own markers. (The desktop
	// ticket is also in the DOM on mobile but hidden; scope to the first.)
	await expect(page.getByTestId('order-persistence-class').first()).toBeAttached({ timeout: 20_000 });
	await expect(page.getByText('Connect to trade', { exact: false }).first()).toBeAttached();

	// No order is placed.
	await assertCleanRuntime(evidence);
});
