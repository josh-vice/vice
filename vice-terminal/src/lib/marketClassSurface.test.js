import { expect, test } from 'bun:test';

test('US-007 market header exposes the authoritative product class', async () => {
	const source = await Bun.file(new URL('./components/TerminalWorkspace.svelte', import.meta.url)).text();
	expect(source).toContain("import { describeMarketClass } from '$lib/marketClass';");
	expect(source).toContain('marketClass = describeMarketClass($selectedMarket)');
	expect(source).toContain('data-testid="market-class-badge"');
	expect(source).toContain('data-testid="mobile-market-class-badge"');
});
