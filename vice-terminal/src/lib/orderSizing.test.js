import { describe, expect, test } from 'bun:test';

describe('US-003 order sizing hotkeys', () => {
	test('uses the shared margin-preset action instead of multiplying current size', async () => {
		const layout = await Bun.file(new URL('../routes/+layout.svelte', import.meta.url)).text();
		const ticket = await Bun.file(new URL('./components/OrderTicket.svelte', import.meta.url)).text();
		const stores = await Bun.file(new URL('./stores.ts', import.meta.url)).text();
		expect(layout).toContain('setOrderSizePercent(percent)');
		expect(layout).not.toContain('orderSize.update(s => s * percent / 100)');
		expect(ticket).toContain('setOrderSizePercent(percent)');
		expect(stores).toContain('market.lastPrice');
		expect(stores).toContain('account.marginFree');
		expect(stores).toContain("market.kind === 'spot'");
		expect(stores).toContain('market.quoteToken');
		expect(ticket).toContain("$selectedMarket?.kind === 'spot'");
		expect(stores).toContain('Math.min(leverage, market?.maxLeverage ?? leverage)');
		expect(ticket).toContain('venueMaxLeverage');
	});
});
