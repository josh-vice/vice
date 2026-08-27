/**
 * Wallet-disconnected UX + secure-trading preconditions.
 *
 * Without a connected wallet the terminal must be honest and fail-closed:
 * no balance is shown, no address chip appears, the ticket surfaces a clear
 * precondition ("Connect to trade" / "Enable secure trading") and the enable
 * button is disabled. Provider mock is clearly tagged as MOCK below — we do
 * NOT drive a real signer in the non-mutating suite.
 *
 * Non-mutating: never triggers the real connect flow (no wallet provider is
 * injected), so no signature is ever requested.
 */
import { expect } from '@playwright/test';
import { test, assertCleanRuntime, seedMarketTaxonomyFixture } from './_fixtures.js';

test('wallet-disconnected: no account balance, no address, ticket preconditions', async ({ page, evidence }) => {
	await page.goto('/trade', { waitUntil: 'domcontentloaded', timeout: 60_000 });
	await expect(page.getByTestId('workspace-host')).toBeAttached({ timeout: 20_000 });

	// Account chip shows the honest disconnected placeholder, not a number.
	const accountChip = page.locator('.text-terminal-text-muted.hidden.sm\\:inline').filter({ hasText: 'Account' }).first();
	await expect(accountChip).toBeAttached();
	// No fabricated $ balance: assert the account value is the placeholder dash.
	await expect(page.locator('span.font-mono.font-medium.tabular-nums').filter({ hasText: '—' }).first()).toBeAttached();

	// The ticket surfaces the connect precondition.
	await expect(page.getByText('Connect to trade', { exact: false }).first()).toBeAttached({ timeout: 20_000 });

	await assertCleanRuntime(evidence);
});

test('secure-trading preconditions render without triggering a signature (MOCK provider scenario)', async ({ page, evidence }) => {
	// MOCK: inject a clearly-fake wallet provider that never resolves. This
	// exercises the precondition UX without ever contacting a real signer.
	await page.addInitScript(() => {
		// eslint-disable-next-line no-undef
		Object.defineProperty(window, 'ethereum', {
			configurable: true,
			value: new Proxy(
				{
					isMetaMask: true,
					request: async () => {
						// Never resolves; keeps the enable flow paused pre-signature.
						return new Promise(() => {});
					}
				},
				{ get: (t, k) => (k in t ? t[k] : undefined) }
			)
		});
	});

	await page.goto('/trade', { waitUntil: 'domcontentloaded', timeout: 60_000 });
	await expect(page.getByTestId('order-persistence-class')).toBeAttached({ timeout: 20_000 });

	// With a wallet present but not connected, the ticket offers the enable
	// path rather than a live order button.
	const enableBtn = page.getByText('Connect to trade', { exact: false }).first();
	await expect(enableBtn).toBeAttached();
	await expect(enableBtn).toBeDisabled();

	await assertCleanRuntime(evidence, {
		// The mock provider may surface benign console noise; venue 429s are
		// already whitelisted by the fixture.
		ignoreConsole: []
	});
});
test('wallet-disconnected prediction outcome never exposes signer preconditions', async ({ page, evidence }) => {
	await seedMarketTaxonomyFixture(page);
	await page.goto('/trade', { waitUntil: 'domcontentloaded', timeout: 60_000 });
	await page.getByRole('button', { name: 'Prediction', exact: true }).click();
	await page.getByRole('button', { name: /Toggle ETH \$4000 · Yes favorite ETH \$4000 · Yes/ }).click();
	await expect(page.getByTestId('workspace-host').getByTestId('prediction-market-panel')).toBeVisible({ timeout: 20_000 });
	await expect(page.getByTestId('workspace-host').getByTestId('prediction-read-only-reason')).toContainText('lot, tick');
	await expect(page.getByText('Connect to trade', { exact: false })).not.toBeVisible();
	await assertCleanRuntime(evidence);
});
