import { describe, expect, test } from 'bun:test';

describe('native Top Movers port', () => {
	test('uses the shared canonical registry and exact selection without execution', async () => {
		const source = await Bun.file(new URL('./NativeMarketMoversPort.svelte', import.meta.url)).text();
		for (const token of ['topMarketMovers', 'marketRegistry', 'selectMarket(market)', 'nativeWidgetPorts.vMovers', 'data-testid="native-market-movers-port"', 'No second feed, account, signer, order, or execution path']) expect(source).toContain(token);
		for (const token of ['fetch(', 'WebSocket', 'placeOrder(', 'cancelOrder(']) expect(source).not.toContain(token);
	});
});
