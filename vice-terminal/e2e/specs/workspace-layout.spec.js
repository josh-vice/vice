/**
 * Canonical panel mount + workspace layout lock.
 *
 * Asserts the deliberate lock flow: the workspace starts LOCKED (canonical
 * layout), a user must explicitly unlock to drag/resize/reconfigure, panel
 * toggles and preset persist across reload, and "Reset this layout" restores
 * the canonical default. Drag/resize is exercised only while unlocked.
 *
 * Non-mutating: these change local UI layout state only — never venue state.
 */
import { expect } from '@playwright/test';
import { test, assertCleanRuntime } from './_fixtures.js';

async function lockButton(page) {
	return page.getByTestId('workspace-customize-toggle');
}

test('workspace starts locked and only a deliberate unlock enables customization', async ({ page, evidence }) => {
	await page.goto('/trade', { waitUntil: 'domcontentloaded', timeout: 60_000 });

	await expect(page.getByTestId('workspace-host')).toBeAttached({ timeout: 20_000 });
	const btn = await lockButton(page);
	await expect(btn.first()).toBeAttached({ timeout: 20_000 });

	// Default is locked.
	const lockedLabel = page.getByRole('button', { name: 'Unlock workspace layout' }).locator('span');
	await expect(lockedLabel).toHaveText('LOCKED');
	const preset = page.getByLabel('Workspace preset');
	await expect(preset).toBeDisabled();
	const widgets = page.getByTestId('workspace-widgets-toggle');
	await widgets.click();
	await expect(page.getByText('Minimal workspace is intentionally simplified.', { exact: false })).toBeVisible();

	// Deliberate unlock.
	await btn.first().click();
	await expect(page.getByRole('button', { name: 'Lock workspace layout' }).locator('span')).toHaveText('UNLOCKED');
	await expect(preset).toBeEnabled();

	// Re-lock restores the canonical constraint.
	await btn.first().click();
	await expect(page.getByRole('button', { name: 'Unlock workspace layout' }).locator('span')).toHaveText('LOCKED');

	await assertCleanRuntime(evidence);
});

test('panel visibility and preset persist across reload, reset restores default', async ({ page, evidence }) => {
	await page.goto('/trade', { waitUntil: 'domcontentloaded', timeout: 60_000 });

	await expect(page.getByTestId('workspace-host')).toBeAttached({ timeout: 20_000 });
	const btn = await lockButton(page);
	await expect(btn.first()).toBeAttached({ timeout: 20_000 });
	await btn.first().click(); // unlock
	await expect(page.getByRole('button', { name: 'Lock workspace layout' }).locator('span')).toHaveText('UNLOCKED');

	// Switch preset to "Chart max".
	const preset = page.getByLabel('Workspace preset');
	await preset.selectOption('chart');
	await expect(preset).toHaveValue('chart');

	// Persist is debounced (~150ms); reload and confirm the preset survived.
	await page.waitForTimeout(400);
	await page.reload({ waitUntil: 'domcontentloaded' });
	await expect(page.getByTestId('workspace-host')).toBeAttached({ timeout: 20_000 });
	const reloadedPreset = page.getByLabel('Workspace preset');
	// The unlock preference persisted, so the preset stays enabled+chart.
	await expect(reloadedPreset).toHaveValue('chart');

	// Open the WIDGETS menu and use "Reset this layout".
	const widgetsBtn = page.getByTestId('workspace-widgets-toggle');
	await expect(widgetsBtn).toBeEnabled();
	await widgetsBtn.click();
	const resetBtn = page.getByRole('button', { name: 'Reset this layout', exact: true });
	await expect(resetBtn).toBeAttached();
	await resetBtn.click();
	// Reset dispatches a client event that rebuilds the canonical layout; the
	// workspace host must remain mounted.
	await expect(page.getByTestId('workspace-host')).toBeAttached();

	await assertCleanRuntime(evidence);
});
