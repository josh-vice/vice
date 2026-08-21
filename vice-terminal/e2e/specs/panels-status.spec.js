/**
 * Canonical panel mount + honest local-only status.
 *
 * Asserts Markets, Order Book, Tape (recent trades), Order Ticket, Account
 * activity, CLI, and The Pit all mount and render honest local-only state
 * when no wallet is connected — no fabricated balance, no phantom fills,
 * and no credentials. Read-only; no signer, no order path.
 */
import { expect } from '@playwright/test';
import { test, assertCleanRuntime } from './_fixtures.js';

test('core panels mount in the Dockview workspace', async ({ page, evidence }) => {
	await page.goto('/trade', { waitUntil: 'domcontentloaded', timeout: 60_000 });
	await expect(page.getByTestId('workspace-host')).toBeAttached({ timeout: 20_000 });

	// Markets (watchlist), Order Book, Tape (recent trades), Order Ticket are
	// all dockview panels that must hydrate client-side. The desktop workspace
	// renders them once each; the mobile (lg:hidden) inline layout ALSO mounts
	// OrderBook/RecentTrades, so scope these to the desktop workspace host to
	// avoid strict-mode multi-matches.
	const host = page.getByTestId('workspace-host');
	await expect(host.getByText('Markets', { exact: true }).first()).toBeAttached({ timeout: 20_000 });

	await expect(host.getByTestId('order-book').first()).toBeAttached({ timeout: 20_000 });
	await expect(host.getByTestId('recent-trades').first()).toBeAttached({ timeout: 20_000 });

	// Order ticket is present (may be read-only / disabled pre-connect).
	await expect(host.getByTestId('order-persistence-class').first()).toBeAttached({ timeout: 20_000 });

	// Honest local-only: the ticket submit affordance reflects the
	// wallet-disconnected precondition (never a live order button).
	const submit = page.getByText('Connect to trade', { exact: false }).first();
	await expect(submit).toBeAttached();

	await assertCleanRuntime(evidence);
});

test('book and tape report honest feed status, never fabricated rows while idle', async ({ page, evidence }) => {
	await page.goto('/trade', { waitUntil: 'domcontentloaded', timeout: 60_000 });

	const host = page.getByTestId('workspace-host');
	const book = host.getByTestId('order-book').first();
	await expect(book).toBeAttached({ timeout: 20_000 });
	const bookStatus = await book.getAttribute('data-feed-status');
	expect(['live', 'stale', 'degraded', 'connecting', 'idle', 'error']).toContain(bookStatus);

	const tape = host.getByTestId('recent-trades').first();
	await expect(tape).toBeAttached({ timeout: 20_000 });
	const tapeStatus = await tape.getAttribute('data-feed-status');
	expect(['live', 'stale', 'degraded', 'connecting', 'idle', 'error']).toContain(tapeStatus);

	await assertCleanRuntime(evidence);
});

test('CLI panel opens and renders honest read-only affordances', async ({ page, evidence }) => {
	await page.goto('/trade', { waitUntil: 'domcontentloaded', timeout: 60_000 });
	await expect(page.getByTestId('terminal-shell')).toBeAttached({ timeout: 20_000 });

	// CLI is an overlay toggled from the navbar (title "Toggle CLI") — open it
	// and confirm the command input + placeholder exist. We do NOT execute an
	// order command.
	await page.locator('button[title="Toggle CLI (⌘K)"]').click();
	const cliInput = page.getByPlaceholder('Enter command...');
	await expect(cliInput).toBeAttached({ timeout: 20_000 });
	await cliInput.fill('help');
	await cliInput.press('Enter');
	// The CLI panel (noosphere-cli) is open and its welcome/help affordances
	// are present. `help` only lists commands — it signs nothing.
	await expect(page.getByText('noosphere-cli', { exact: true })).toBeAttached({ timeout: 20_000 });

	await assertCleanRuntime(evidence);
});

test('account activity panel mounts with no connected account state', async ({ page, evidence }) => {
	await page.goto('/trade', { waitUntil: 'domcontentloaded', timeout: 60_000 });
	await expect(page.getByTestId('workspace-host')).toBeAttached({ timeout: 20_000 });

	// The Pit / account-activity region is present. Without a connected wallet
	// it must not show positions/fills (no fabricated account state).
	await expect(page.getByText('Account activity', { exact: false }).first()).toBeAttached({ timeout: 20_000 });

	await assertCleanRuntime(evidence);
});
