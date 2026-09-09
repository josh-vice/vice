/**
 * Kill-switch UI, console/page errors, failed requests, accessibility smoke.
 *
 * Asserts the release-safety kill-switch affordance is wired (the gate is off
 * by default in the normal build, so the UI must not show a false "TRADING
 * HALTED" banner), and enforces the quality bar: no unhandled page exceptions,
 * no unexpected console.error, no unexpected failed same-origin requests, and
 * a minimal accessibility smoke (landmarks + nav). These run against the
 * production preview shell.
 *
 * Non-mutating: read-only navigation.
 */
import { expect } from '@playwright/test';
import { test, assertCleanRuntime } from './_fixtures.js';

test('kill-switch UI is honest when the gate is off (no false TRADING HALTED)', async ({ page, evidence }) => {
	await page.goto('/trade', { waitUntil: 'domcontentloaded', timeout: 60_000 });
	await expect(page.getByTestId('terminal-shell')).toBeAttached({ timeout: 20_000 });

	// The normal production build has the trading kill switch OFF. The UI must
	// NOT show a fabricated halt banner. (If a release build flips the flag,
	// this gate's assertion would need to invert — see releaseSafety.ts.)
	const haltBanner = page.getByText('TRADING HALTED', { exact: true });
	await expect(haltBanner).toHaveCount(0, { timeout: 10_000 });

	// The ticket submit must reflect the wallet-disconnected precondition, not
	// a halt or a live order button.
	await expect(page.getByText('Connect to trade', { exact: false }).first()).toBeAttached({ timeout: 20_000 });

	await assertCleanRuntime(evidence);
});

test('hydration produces no console errors, page exceptions, or unexpected failures', async ({ page, evidence }) => {
	await page.goto('/trade', { waitUntil: 'domcontentloaded', timeout: 60_000 });
	await expect(page.getByTestId('terminal-shell')).toBeAttached({ timeout: 20_000 });

	await assertCleanRuntime(evidence);
});

test('accessibility smoke: landmarks, nav, and status regions are exposed', async ({ page, evidence }) => {
	await page.goto('/trade', { waitUntil: 'domcontentloaded', timeout: 60_000 });
	await expect(page.getByTestId('terminal-shell')).toBeAttached({ timeout: 20_000 });

	// The page exposes navigation and status landmarks. (The terminal layout
	// is a nav bar + a Dockview workspace host; there is deliberately no
	// <main> wrapper, so assert on the real landmarks it ships. The mobile
	// bottom tab bar is a second <nav>, so assert at least one is present.)
	const nav = page.locator('nav');
	await expect(nav.first()).toBeAttached({ timeout: 20_000 });
	await expect(nav).toHaveCount(2);
	// Market data health chip is present (readable status text).
	await expect(page.getByTestId('market-data-health')).toBeAttached();

	await assertCleanRuntime(evidence);
});
