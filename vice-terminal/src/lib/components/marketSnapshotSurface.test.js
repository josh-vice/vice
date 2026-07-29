import { describe, expect, test } from 'bun:test';

describe('independent market snapshot panel', () => {
	test('pins an exact registry identity without importing execution or private account state', async () => {
		const panel = await Bun.file(new URL('./MarketSnapshotPanel.svelte', import.meta.url)).text();
		for (const token of ['export let marketKey', 'candidate.marketKey === activeMarketKey', 'workspaceLinkContext', 'market.apiCoin', 'Read-only independent quote snapshot', 'selectMarket(market)']) expect(panel).toContain(token);
		for (const forbidden of ['placeOrder', 'localExecution', 'openOrders', 'positions', 'orderBook']) expect(panel).not.toContain(forbidden);
	});
});
