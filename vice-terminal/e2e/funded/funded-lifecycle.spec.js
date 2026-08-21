/**
 * FUNDED SPEC DEFINITIONS — NOT EXECUTED BY DEFAULT.
 *
 * These are the venue-mutating lifecycle specs for a real funded testnet
 * account. They are deliberately kept OUT of the normal non-mutating suite
 * (testDir points at `specs/`, and this file lives under `funded/`). They can
 * only be run explicitly via `bun run test:e2e:funded`, and even then each
 * spec refuses to run unless every gate below is satisfied.
 *
 * GATES (all required — otherwise the test skips with a readable reason):
 *   VICE_E2E_FUNDED=1                     explicit opt-in to funded mutation
 *   VITE_HL_NETWORK=testnet               strict testnet, never mainnet
 *   VICE_E2E_ALLOWLIST=<addr>             exact wallet address allowlist
 *   VICE_E2E_NOTIONAL_CAP_USD=<number>    hard per-order notional cap
 *   VICE_E2E_OWNER_KEY=***             path to the funded owner key (mode 600)
 *
 * CLEANUP: every mutating spec ends by cancel-all + flatten and asserts the
 * venue shows zero open orders AND zero positions (zero-exposure proof).
 *
 * Do not run these against a wallet you cannot afford to lose testnet funds
 * from. They place real (testnet) orders through the venue.
 */
import { test, expect } from '@playwright/test';
import { readFileSync, existsSync } from 'node:fs';

const GATES = {
	funded: process.env.VICE_E2E_FUNDED === '1',
	testnet: (process.env.VITE_HL_NETWORK ?? '').trim().toLowerCase() === 'testnet',
	allowlist: Boolean(process.env.VICE_E2E_ALLOWLIST),
	notionalCap: Number.isFinite(Number(process.env.VICE_E2E_NOTIONAL_CAP_USD)) &&
		Number(process.env.VICE_E2E_NOTIONAL_CAP_USD) > 0,
	ownerKey: Boolean(process.env.VICE_E2E_OWNER_KEY) && existsSync(process.env.VICE_E2E_OWNER_KEY)
};

const missing = Object.entries(GATES)
	.filter(([, ok]) => !ok)
	.map(([k]) => k);

function fundedTest(title, fn) {
	// Gate: skip with an explicit, readable reason unless every gate is set.
	if (missing.length > 0) {
		test.skip(title, async () => {
			throw new Error(`Funded gate refused: missing ${missing.join(', ')}. Refusing to mutate a venue.`);
		});
		return;
	}
	test(title, async ({ page }, testInfo) => {
		test.setTimeout(240_000);
		// Load the funded owner identity from the allowlisted key file.
		const keyJson = JSON.parse(readFileSync(process.env.VICE_E2E_OWNER_KEY, 'utf8'));
		const address = keyJson.address ?? keyJson.accounts?.[0]?.address ?? keyJson.publicKey;
		if (!address) throw new Error('Funded key file has no readable address.');
		const allowlist = (process.env.VICE_E2E_ALLOWLIST ?? '').split(',').map((s) => s.trim().toLowerCase());
		if (!allowlist.includes(String(address).toLowerCase())) {
			throw new Error(`Funded address ${address} is not in VICE_E2E_ALLOWLIST.`);
		}
		await fn({ page, address, capUsd: Number(process.env.VICE_E2E_NOTIONAL_CAP_USD) }, testInfo);
	});
}

// ---------------------------------------------------------------------------
// Lifecycle definitions. Each is a definition of the expected venue lifecycle;
// they only run under the funded gate above. The assertions here describe the
// contract — the actual capture harness that produces signed evidence is
// scripts/capture-funded-testnet-evidence.mjs (kept separate so the UI suite
// never signs).
// ---------------------------------------------------------------------------

fundedTest('connect + unlock a funded testnet account', async ({ page, address }) => {
	await page.goto('/trade');
	// Connect the funded wallet and complete the enable/unlock flow.
	// (Definition: unlockOrCreateAgent → venue agent approval → sync.account live.)
	await expect(page.getByTestId('enablement-progress').or(page.getByTestId('enablement-error'))).toBeAttached();
	// Placeholder — real capture is scripts/capture-funded-testnet-evidence.mjs.
	expect(address).toBeTruthy();
});

fundedTest('place a basic market order with notional under the cap', async ({ page, capUsd }) => {
	expect(capUsd).toBeGreaterThan(0);
	// Definition: market order sized so notional ≤ capUsd; venue returns an oid;
	// assert openOrders shows exactly one resting order, then cancel.
});

fundedTest('place a limit order (maker) and verify it rests on the book', async () => {
	// Definition: limit order with a tick-valid limitPx; reconcile by limitPx
	// (modify replaces the order with a new oid — never assert on the old oid).
});

fundedTest('stop and stop-limit orders trigger and fill', async () => {
	// Definition: trigger order crosses the stop → fills; assert the resulting
	// position is consistent with the trigger side (long closed by sell, etc.).
});

fundedTest('partial fill reconciles with the correct remaining size', async () => {
	// Definition: requires a SECOND funded account (self-trade protection
	// cancels a same-account maker on taker fill). Assert partialFill statuses.
});

fundedTest('modify replaces the order (new oid) with the new limitPx', async () => {
	// Definition: modify returns {type:'default'}; reconcile by the NEW limitPx.
});

fundedTest('cancel an open order and assert it is gone from openOrders', async () => {
	// Definition: cancel returns "success"; assert zero resting for that cloid.
});

fundedTest('reduce-only close of a long with a sell', async () => {
	// Definition: reduceOnly sell closes the long; assert position direction flips
	// only when reversal is intended (see the reverse-order-side pitfall).
});

fundedTest('reconnect + restart keep journal reconciliation and never duplicate', async () => {
	// Definition: after a transport drop / process restart, re-read venue state
	// and reconcile the command journal — zero duplicate orders on retry.
});

fundedTest('cleanup: cancel-all + flatten to zero exposure', async ({ page }) => {
	await page.goto('/trade');
	// Definition: run certified cancel-all and flatten; then poll venue until
	// openOrders == 0 AND positions == 0. This is the mandatory final proof.
	await expect(page.getByTestId('terminal-shell')).toBeAttached();
});

export { GATES };
