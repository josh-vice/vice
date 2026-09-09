import { describe, expect, test } from 'bun:test';

describe('US-009 position management surface', () => {
	test('keeps position lifecycle actions with the order ticket, not the order book', async () => {
		const [ticket, actions, book] = await Promise.all([
			Bun.file(new URL('./OrderTicket.svelte', import.meta.url)).text(),
			Bun.file(new URL('./PositionMarketActions.svelte', import.meta.url)).text(),
			Bun.file(new URL('./OrderBook.svelte', import.meta.url)).text()
		]);
		expect(ticket).toContain('<PositionMarketActions />');
		expect(actions).toContain('data-testid="position-market-actions"');
		expect(actions).toContain('Flatten market');
		expect(actions).toContain('Reverse market');
		expect(actions).toContain("&& !$privacyMode");
		expect(actions).toContain('{#if privateStateLive && selectedPosition}');
		expect(actions).toContain('disabled={reversing || !privateStateLive}');
		expect(book).not.toContain('data-testid="dom-quick-size"');
		expect(book).not.toContain('Cancel buy DOM orders');
	});
});
