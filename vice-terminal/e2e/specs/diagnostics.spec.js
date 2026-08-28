/**
 * Report Issue flow + support-bundle privacy.
 *
 * Covers:
 *   1. The Report Issue modal opens from the navbar and renders the privacy
 *      contract.
 *   2. Downloading the support bundle produces a real, parseable JSON file
 *      whose schema is deterministic and whose content is privacy-safe.
 *
 * Non-mutating: nothing is uploaded, nothing is signed, no order is placed.
 */
import { expect } from '@playwright/test';
import { test, assertCleanRuntime } from './_fixtures.js';
import { readFile } from 'node:fs/promises';

// Shapes the redactor must never leak. These are DIFFERENT values from any
// real key (generated, not from the app), so they act as canaries: if any of
// them appears in the bundle, the redactor let a secret-shaped value through.
const CANARY_ADDRESS = '0x1111111111111111111111111111111111111111';
const CANARY_KEY = '0x' + 'a'.repeat(64);
const CANARY_SIG = '0x' + 'b'.repeat(130);

test('Report Issue modal opens, states the privacy contract, and is dismissible', async ({ page, evidence }) => {
	await page.goto('/trade', { waitUntil: 'domcontentloaded', timeout: 60_000 });
	await expect(page.getByTestId('workspace-host')).toBeAttached({ timeout: 20_000 });

	await page.getByTestId('report-issue-open').click();
	await expect(page.getByTestId('report-issue-dialog')).toBeAttached({ timeout: 10_000 });

	// The privacy contract is stated up front: nothing is uploaded, and the
	// bundle never carries addresses/keys/tokens/order payloads.
	await expect(page.getByText('Nothing here is uploaded automatically', { exact: false })).toBeAttached();
	await expect(
		page.getByText('never includes wallet addresses, keys, signatures, tokens', { exact: false })
	).toBeAttached();

	// The user can type a description and close the dialog.
	await page.getByTestId('report-issue-description').fill('E2E canary description');
	await page.getByTestId('report-issue-close').click();
	await expect(page.getByTestId('report-issue-dialog')).toHaveCount(0);

	await assertCleanRuntime(evidence);
});

test('support bundle downloads as a deterministic-schema, privacy-safe JSON file', async ({ page, evidence }, testInfo) => {
	await page.goto('/trade', { waitUntil: 'domcontentloaded', timeout: 60_000 });
	await expect(page.getByTestId('workspace-host')).toBeAttached({ timeout: 20_000 });

	await page.getByTestId('report-issue-open').click();
	await expect(page.getByTestId('report-issue-dialog')).toBeAttached({ timeout: 10_000 });

	// Capture the download. Playwright's download event fires for the blob-URL
	// anchor click; we save it to the test's output dir and read it back.
	const downloadPromise = page.waitForEvent('download', { timeout: 15_000 });
	await page.getByTestId('report-issue-download').click();
	const download = await downloadPromise;
	const savePath = `${testInfo.outputPath('support-bundle.json')}`;
	await download.saveAs(savePath);

	// 1. It is a real JSON file we can parse (not a success-message lie).
	const raw = await readFile(savePath, 'utf8');
	const bundle = JSON.parse(raw);

	// 2. Deterministic schema + kind identify the artifact.
	expect(bundle.schema).toBe(1);
	expect(bundle.kind).toBe('vice.support-bundle');
	expect(typeof bundle.generatedAt).toBe('string');
	expect(new Date(bundle.generatedAt).getTime()).toBeGreaterThan(0);

	// 3. Build identity is embedded without any network telemetry call.
	expect(bundle.app?.name).toBe('Vice Terminal');
	expect(typeof bundle.app?.version).toBe('string');
	expect(bundle.app?.testnet).toBe(true); // beta is testnet-only

	// 4. Runtime diagnostics are present and bounded.
	expect(Array.isArray(bundle.health?.transitions)).toBe(true);
	expect(Array.isArray(bundle.appErrors)).toBe(true);
	expect(Array.isArray(bundle.requestFailures)).toBe(true);

	// 5. Privacy canaries: the redactor must never leak secret-shaped values.
	//    A real bundle built from this session's state must be clean.
	const serialized = JSON.stringify(bundle);
	expect(serialized).not.toContain(CANARY_ADDRESS);
	expect(serialized).not.toContain(CANARY_KEY);
	expect(serialized).not.toContain(CANARY_SIG);
	// No wallet address, no private key, no 64-hex, no 130-hex signature blob.
	expect(serialized).not.toMatch(/0x[a-fA-F0-9]{64}/);
	expect(serialized).not.toMatch(/0x[a-fA-F0-9]{130}/);
	// No order payload envelope (coin+isBuy+sz+px).
	expect(serialized).not.toMatch(/"isBuy"/);
	expect(serialized).not.toMatch(/"reduceOnly"/);

	await assertCleanRuntime(evidence);
});
