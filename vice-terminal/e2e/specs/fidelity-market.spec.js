import { expect } from '@playwright/test';
import { test, assertCleanRuntime, seedMarketTaxonomyFixture } from './_fixtures.js';

test('market search uses canonical identity and reports no-match state', async ({ page, evidence }) => {
	await seedMarketTaxonomyFixture(page);
	await page.goto('/trade', { waitUntil: 'domcontentloaded', timeout: 60_000 });
	await page.getByTestId('workspace-customize-toggle').click();
	await page.getByRole('tab', { name: 'Markets', exact: true }).click();
	const search = page.getByLabel('Search markets');
	await search.fill('hip3:xyz:btc');
	await expect(page.getByTestId('workspace-host').locator('[role="button"]').filter({ hasText: 'XYZ:BTC' }).first()).toBeVisible();
	await search.fill('does-not-exist-anywhere');
	await expect(page.getByTestId('workspace-host').getByText('No markets match this search.', { exact: true }).first()).toBeVisible();
	await assertCleanRuntime(evidence);
});

test('category changes respect active search and select the first available class market', async ({ page, evidence }) => {
	await seedMarketTaxonomyFixture(page);
	await page.goto('/trade', { waitUntil: 'domcontentloaded', timeout: 60_000 });
	await page.getByTestId('workspace-customize-toggle').click();
	await page.getByRole('tab', { name: 'Markets', exact: true }).click();
	const search = page.getByLabel('Search markets');
	await search.fill('XYZ:BTC');
	await page.getByRole('button', { name: 'Spot', exact: true }).click();
	await expect(page.getByTestId('workspace-host').getByText('No markets match this search.', { exact: true }).first()).toBeVisible();
	await search.fill('');
	await expect(page.getByText('BTC-USDC', { exact: false }).first()).toBeVisible();
	await page.getByRole('button', { name: 'Toggle BTC-USDC favorite', exact: true }).press('Enter');
	await expect(page.getByTestId('workspace-host')).toBeAttached();
	await assertCleanRuntime(evidence);
});
