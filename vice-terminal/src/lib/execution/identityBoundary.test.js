import { describe, expect, test } from 'bun:test';

describe('execution identity boundary', () => {
	test('the native intent contract contains an exact coin and no display-symbol routing field', async () => {
		const source = await Bun.file(new URL('./client.ts', import.meta.url)).text();
		expect(source).toContain('coin: string;');
		expect(source).not.toContain('symbol?: string;');
	});

	test('the signer rejects an API coin mismatch before building a venue order', async () => {
		const source = await Bun.file(new URL('./localExecution.ts', import.meta.url)).text();
		expect(source).toContain('intent.coin !== market.apiCoin');
	});

	test('every market-bound signer mutation requires the canonical Hyperliquid instrument', async () => {
		const source = await Bun.file(new URL('./localExecution.ts', import.meta.url)).text();
		expect(source).toContain("import { assertHyperliquidMarketInstrument } from '$lib/venue/hyperliquid';");
		expect(source.match(/assertHyperliquidMarketInstrument\(market\);/g)).toHaveLength(6);
	});

	test('CLI cancel-all routes from exact account identity, never the display market label', async () => {
		const source = await Bun.file(new URL('../cli/executor.ts', import.meta.url)).text();
		expect(source).toContain("cancelOrder(order.id, order.apiCoin ?? order.marketKey ?? '')");
		expect(source).not.toContain('cancelOrder(order.id, order.market)');
	});

	test('order entry requires the selected live feed to match the exact requested market', async () => {
		const source = await Bun.file(new URL('../hl/orders.ts', import.meta.url)).text();
		expect(source).toContain("market.marketKey !== descriptor.marketKey");
		expect(source).toContain('const marketPrice = params.price ?? descriptor.lastPrice ?? 0;');
		expect(source).toContain("selected.marketKey !== market.marketKey");
	});

	test('live market normalization cannot synthesize a routing descriptor from a coin string', async () => {
		const source = await Bun.file(new URL('../hl/normalize.ts', import.meta.url)).text();
		expect(source).not.toContain('toViceSymbol');
		expect(source).not.toContain('buildMarketFromMid');
	});

	test('cancel and modify cross-check a known order against the requested API coin', async () => {
		const source = await Bun.file(new URL('../hl/orders.ts', import.meta.url)).text();
		expect(source).toContain("knownOrder?.apiCoin && knownOrder.apiCoin !== market.apiCoin");
		expect(source).toContain("order.apiCoin !== market.apiCoin");
		expect(source).toContain('Order identity does not match the requested Hyperliquid market');
	});
});
