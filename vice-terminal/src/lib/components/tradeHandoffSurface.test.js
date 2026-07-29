import { describe, expect, test } from 'bun:test';

describe('Suite-to-Trade handoff surface', () => {
	test('shows exact resolution and catalog-unavailable outcomes without a fallback', async () => {
		const source = await Bun.file(new URL('./TerminalWorkspace.svelte', import.meta.url)).text();
		for (const token of [
			'resolveTradeHandoffState',
			'marketCatalogStatus',
			'setChartTimeframe(handoff.timeframe)',
			'Trade context loaded:',
			'Trade context is unavailable in the current catalog. No alternate market was selected.',
			'data-testid="trade-handoff-status"'
		]) expect(source).toContain(token);
		expect(source).not.toContain('resolveTradeHandoff(markets, handoff)');
	});
});
