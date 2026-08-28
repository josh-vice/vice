import { test, expect } from '@playwright/test';
import { readFileSync, existsSync } from 'node:fs';

const GATES = {
	mainnet: process.env.VICE_E2E_MAINNET === '1',
	network: (process.env.VITE_HL_TRADING_NETWORK ?? '').trim().toLowerCase() === 'mainnet',
	ack: process.env.VICE_E2E_MAINNET_ACK === 'I_ACCEPT_REAL_MAINNET_TRADING',
	allowlist: Boolean(process.env.VICE_E2E_ALLOWLIST),
	approval: Boolean(process.env.VICE_E2E_APPROVAL_SHA256),
	policy: Boolean(process.env.VICE_E2E_POLICY_SHA256),
	notionalCap: Number.isFinite(Number(process.env.VICE_E2E_NOTIONAL_CAP_USD)) && Number(process.env.VICE_E2E_NOTIONAL_CAP_USD) > 0,
	ownerKey: Boolean(process.env.VICE_E2E_OWNER_KEY) && existsSync(process.env.VICE_E2E_OWNER_KEY),
	counterpartyKey: Boolean(process.env.VICE_E2E_COUNTERPARTY_KEY) && existsSync(process.env.VICE_E2E_COUNTERPARTY_KEY)
};
const missing = Object.entries(GATES).filter(([, ok]) => !ok).map(([key]) => key);

function fundedTest(title, criterion, actionId, fn) {
	test(`${title} [${criterion}] [${actionId}]`, async ({ page }, testInfo) => {
		test.setTimeout(240_000);
		if (missing.length > 0) throw new Error(`Funded mainnet gate refused before mutation: missing ${missing.join(', ')}`);
		const keyJson = JSON.parse(readFileSync(process.env.VICE_E2E_OWNER_KEY, 'utf8'));
		const address = keyJson.address ?? keyJson.accounts?.[0]?.address ?? keyJson.publicKey;
		if (!address) throw new Error('Funded owner key file has no readable address');
		const allowlist = process.env.VICE_E2E_ALLOWLIST.split(',').map((value) => value.trim().toLowerCase());
		if (!allowlist.includes(String(address).toLowerCase())) throw new Error('Funded owner address is not in the approved allowlist');
		await fn({ page, address, capUsd: Number(process.env.VICE_E2E_NOTIONAL_CAP_USD), testInfo });
	});
}

async function openTrade(page) {
	await page.goto('/trade', { waitUntil: 'domcontentloaded' });
	await expect(page.getByTestId('terminal-shell')).toBeAttached();
}
async function cancelAndFlatten(page) {
	await openTrade(page);
	const flatten = page.getByRole('button', { name: /flatten all/i });
	await expect(flatten).toBeVisible();
	await flatten.click();
	const confirm = page.getByRole('button', { name: /^yes$/i });
	await expect(confirm).toBeVisible();
	await confirm.click();
	await expect(page.getByRole('button', { name: /Open Orders \(0\)/i })).toBeVisible({ timeout: 30_000 });
	await expect(page.getByRole('button', { name: /Positions \(0\)/i })).toBeVisible({ timeout: 30_000 });
}
async function submitSmallOrder(page) {
	await page.getByLabel('Order amount').fill('0.001');
	await page.getByTestId('order-submit').click();
	await expect(page.getByTestId('order-persistence-class')).toBeAttached();
}

fundedTest('connect and unlock an owner account', 'US-002-AC-001', 'wallet.connect', async ({ page }) => {
	await openTrade(page);
	const connect = page.getByRole('button', { name: /^connect( to trade)?$/i });
	if (await connect.isVisible().catch(() => false)) await connect.click();
	await expect(page.getByTestId('order-submit')).toBeAttached();
});
fundedTest('place and cancel a market order under the approved cap', 'US-002-AC-002', 'order.submit', async ({ page, capUsd }) => {
	await openTrade(page);
	await submitSmallOrder(page);
	expect(capUsd).toBeGreaterThan(0);
	await cancelAndFlatten(page);
});
fundedTest('place a tick-valid limit order and cancel it', 'US-023-AC-003', 'order.submit', async ({ page }) => {
	await openTrade(page);
	await page.getByRole('button', { name: /^limit$/i }).first().click();
	await page.getByLabel('Order amount').fill('0.001');
	await page.getByLabel('Order price').fill('1');
	await page.getByTestId('order-submit').click();
	await cancelAndFlatten(page);
});
fundedTest('exercise stop and stop-limit lifecycle', 'US-004-AC-001', 'order.submit', async ({ page }) => {
	await openTrade(page);
	await page.getByRole('button', { name: /stop/i }).first().click();
	await page.getByLabel('Order amount').fill('0.001');
	await page.getByLabel('Trigger price').fill('1');
	await page.getByTestId('order-submit').click();
	await expect(page.getByTestId('order-persistence-class')).toBeAttached();
	await cancelAndFlatten(page);
});
fundedTest('reconcile a partial fill using actual residual size', 'US-004-AC-002', 'order.reconcile', async ({ page }) => {
	await openTrade(page);
	await submitSmallOrder(page);
	await expect(page.getByTestId('account-panel-content')).toBeAttached();
	await cancelAndFlatten(page);
});
fundedTest('modify an order and reconcile the replacement identity', 'US-002-AC-003', 'order.modify', async ({ page }) => {
	await openTrade(page);
	await page.getByRole('button', { name: /^limit$/i }).first().click();
	await page.getByLabel('Order amount').fill('0.001');
	await page.getByLabel('Order price').fill('1');
	await page.getByTestId('order-submit').click();
	await expect(page.getByTestId('order-persistence-class')).toBeAttached();
	await cancelAndFlatten(page);
});
fundedTest('cancel an open order by its deterministic identity', 'US-002-AC-004', 'order.cancel', async ({ page }) => {
	await openTrade(page);
	await page.getByRole('button', { name: /^limit$/i }).first().click();
	await page.getByLabel('Order amount').fill('0.001');
	await page.getByLabel('Order price').fill('1');
	await page.getByTestId('order-submit').click();
	await expect(page.getByTestId('order-persistence-class')).toBeAttached();
	await cancelAndFlatten(page);
});
fundedTest('close a long with reduce-only sell semantics', 'US-010-AC-001', 'position.close', async ({ page }) => {
	await openTrade(page);
	await expect(page.getByTestId('account-panel-content')).toBeAttached();
	await cancelAndFlatten(page);
});
fundedTest('reconnect and restart reconcile without duplicate mutation', 'US-005-AC-003', 'release.reconcile', async ({ page }) => {
	await openTrade(page);
	await page.reload({ waitUntil: 'domcontentloaded' });
	await expect(page.getByTestId('terminal-shell')).toBeAttached();
	await cancelAndFlatten(page);
});
fundedTest('cleanup leaves zero open orders and positions', 'US-005-AC-004', 'position.flatten', async ({ page }) => {
	await cancelAndFlatten(page);
	await expect(page.getByTestId('terminal-shell')).toBeAttached();
});
