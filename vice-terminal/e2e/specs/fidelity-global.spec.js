import { expect } from '@playwright/test';
import { test, assertCleanRuntime } from './_fixtures.js';

async function openReport(page) {
	await page.getByTestId('report-issue-open').click();
	const dialog = page.getByTestId('report-issue-dialog');
	await expect(dialog).toBeVisible();
	return dialog;
}

test('Report Issue traps focus and restores it on close', async ({ page, evidence }) => {
	await page.goto('/trade', { waitUntil: 'domcontentloaded', timeout: 60_000 });
	const opener = page.getByTestId('report-issue-open');
	await expect(opener).toBeVisible();
	await opener.focus();
	const dialog = await openReport(page);
	await expect(page.evaluate(() => document.activeElement?.getAttribute('data-testid'))).resolves.toBe('report-issue-dialog');

	const close = page.getByTestId('report-issue-close');
	await close.focus();
	await page.keyboard.press('Tab');
	await expect(page.evaluate(() => document.activeElement?.getAttribute('data-testid'))).not.toBeNull();
	await page.keyboard.press('Shift+Tab');
	await expect(await page.evaluate(() => document.activeElement?.getAttribute('data-testid'))).toBe('report-issue-close');

	await close.click();
	await expect(dialog).toBeHidden();
	await expect(opener).toBeFocused();

	await openReport(page);
	await page.keyboard.press('Escape');
	await expect(page.getByTestId('report-issue-dialog')).toBeHidden();

	await openReport(page);
	await page.mouse.click(8, 8);
	await expect(page.getByTestId('report-issue-dialog')).toBeHidden();
	await assertCleanRuntime(evidence);
});

test('Report Issue downloads bounded redacted operator note separately from screenshots', async ({ page, evidence }) => {
	await page.goto('/trade', { waitUntil: 'domcontentloaded', timeout: 60_000 });
	await openReport(page);
	const note = 'wallet 0x1234567890123456789012345678901234567890 ' + 'x'.repeat(1400);
	await page.getByTestId('report-issue-description').fill(note);
	const downloadPromise = page.waitForEvent('download');
	await page.getByTestId('report-issue-download').click();
	const download = await downloadPromise;
	const path = await download.path();
	expect(path).not.toBeNull();
	const text = await (await import('node:fs/promises')).readFile(path, 'utf8');
	const bundle = JSON.parse(text);
	expect(bundle.operatorNote.length).toBeLessThanOrEqual(500);
	expect(bundle.operatorNote).not.toContain('0x1234567890123456789012345678901234567890');
	expect(text).not.toContain('data:image/png');
	await expect(page.getByTestId('report-issue-bundle-summary')).toContainText('Saved');
	await assertCleanRuntime(evidence);
});
test('Cmd/Ctrl+K toggles one CLI instance per keypress', async ({ page, evidence }) => {
	await page.goto('/trade', { waitUntil: 'domcontentloaded', timeout: 60_000 });
	await expect(page.getByText('noosphere-cli', { exact: true })).toHaveCount(0);
	await page.keyboard.press('Meta+k');
	await expect(page.getByText('noosphere-cli', { exact: true })).toHaveCount(1);
	await page.keyboard.press('Meta+k');
	await expect(page.getByText('noosphere-cli', { exact: true })).toHaveCount(0);
	await assertCleanRuntime(evidence);
});
test('focus hotkeys target the real panel hosts', async ({ page, evidence }) => {
	await page.goto('/trade', { waitUntil: 'domcontentloaded', timeout: 60_000 });
	for (const [shortcut, target] of [['Alt+c', 'workspace-chart'], ['Alt+b', 'workspace-market-data'], ['Alt+t', 'workspace-ticket'], ['Alt+p', 'workspace-activity']]) {
		await expect(page.locator(`#${target}`)).toBeAttached({ timeout: 20_000 });
		await page.keyboard.press(shortcut);
		await expect.poll(() => page.evaluate(() => document.activeElement?.id)).toBe(target);
	}
	await assertCleanRuntime(evidence);
});
test('stored privacy mode hides private values before terminal content renders', async ({ page, evidence }) => {
	await page.addInitScript(() => localStorage.setItem('vice.privacy-mode.v1:testnet', 'true'));
	await page.goto('/trade', { waitUntil: 'domcontentloaded', timeout: 60_000 });
	await expect(page.getByText('••••••', { exact: true }).first()).toBeAttached();
	await expect(page.getByTestId('privacy-hydration-pending')).toHaveCount(0);
	await assertCleanRuntime(evidence);
});
test('Core panel menu explains locked mode and preserves focus', async ({ page, evidence }) => {
	await page.goto('/trade', { waitUntil: 'domcontentloaded', timeout: 60_000 });
	const widgets = page.getByTestId('workspace-widgets-toggle');
	await expect(widgets).toBeVisible();
	await widgets.click();
	await expect(page.getByText('Minimal workspace is intentionally simplified.', { exact: false })).toBeVisible();

	await page.getByTestId('workspace-customize-toggle').click();
	await expect(page.getByTestId('workspace-host')).toHaveAttribute('data-layout-mode', 'edit');
	const watchlist = page.locator('[role="menu"] input[type="checkbox"]').first();
	await expect(watchlist).toBeChecked();
	await watchlist.uncheck();
	await expect(widgets).toBeVisible();
	await expect(watchlist).not.toBeChecked();
	await expect(watchlist).toBeFocused();
	await assertCleanRuntime(evidence);
});
test('workspace panel toggles reconcile references without missing panels', async ({ page, evidence }) => {
	await page.goto('/trade', { waitUntil: 'domcontentloaded', timeout: 60_000 });
	await page.getByTestId('workspace-customize-toggle').click();
	await page.getByTestId('workspace-widgets-toggle').click();
	const menu = page.locator('[role="menu"]');
	const ticket = menu.locator('label').filter({ hasText: 'Order ticket' }).locator('input');
	const marketData = menu.locator('label').filter({ hasText: 'Book & tape' }).locator('input');
	await ticket.uncheck();
	await expect(page.getByRole('region', { name: 'Order ticket' })).toHaveCount(0);
	await expect(page.getByRole('region', { name: 'Depth & tape' })).toHaveCount(1);
	await marketData.uncheck();
	await expect(marketData).not.toBeChecked();
	await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('vice.workspace-panels.v1') ?? '{}').marketData)).toBe(false);
	await expect(page.getByRole('region', { name: 'Depth & tape' })).toHaveCount(0);
	await ticket.check();
	await expect(ticket).toBeChecked();
	await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('vice.workspace-panels.v1') ?? '{}').ticket)).toBe(true);
	await marketData.check();
	await expect(marketData).toBeChecked();
	await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('vice.workspace-panels.v1') ?? '{}').marketData)).toBe(true);
	await assertCleanRuntime(evidence);
});
test('locking preserves the current Dockview arrangement', async ({ page, evidence }) => {
	await page.goto('/trade', { waitUntil: 'domcontentloaded', timeout: 60_000 });
	await expect(page.locator('[data-workspace-panel="chart"]')).toBeAttached({ timeout: 20_000 });
	const before = await page.locator('[data-workspace-panel]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-workspace-panel')).sort());
	await page.getByTestId('workspace-customize-toggle').click();
	await expect(page.getByTestId('workspace-host')).toHaveAttribute('data-layout-mode', 'edit');
	await page.getByTestId('workspace-customize-toggle').click();
	await expect(page.getByTestId('workspace-host')).toHaveAttribute('data-layout-mode', 'view');
	const after = await page.locator('[data-workspace-panel]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-workspace-panel')).sort());
	expect(after).toEqual(before);
	await assertCleanRuntime(evidence);
});
test('preset persistence keeps the named layout and lock transition truthy', async ({ page, evidence }) => {
	await page.goto('/trade', { waitUntil: 'domcontentloaded', timeout: 60_000 });
	await page.getByTestId('workspace-customize-toggle').click();
	const preset = page.getByLabel('Workspace preset');
	await preset.selectOption('data');
	await expect(preset).toHaveValue('data');
	await page.waitForTimeout(400);
	await page.reload({ waitUntil: 'domcontentloaded' });
	await expect(page.getByLabel('Workspace preset')).toHaveValue('data');
	await page.getByTestId('workspace-customize-toggle').click();
	await expect(page.getByTestId('workspace-host')).toHaveAttribute('data-layout-mode', 'view');
	await page.waitForTimeout(400);
	await page.reload({ waitUntil: 'domcontentloaded' });
	await expect(page.getByLabel('Workspace preset')).toHaveValue('data');
	await assertCleanRuntime(evidence);
});
test('Reset this layout rebuilds the selected preset and reports completion', async ({ page, evidence }) => {
	await page.goto('/trade', { waitUntil: 'domcontentloaded', timeout: 60_000 });
	await page.getByTestId('workspace-widgets-toggle').click();
	await page.getByRole('button', { name: 'Reset this layout', exact: true }).click();
	await expect(page.getByTestId('workspace-reset-status')).toContainText('Default layout reset');
	await expect(page.getByTestId('workspace-widgets-toggle')).toHaveAttribute('aria-expanded', 'false');
	await expect(page.getByTestId('workspace-host')).toBeAttached();
	await assertCleanRuntime(evidence);
});
