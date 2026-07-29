import { describe, expect, test } from 'bun:test';

describe('native Market Watchlist port', () => {
	test('reuses the shared public market surface and excludes execution', async () => {
		const source = await Bun.file(new URL('./NativeWatchlistPort.svelte', import.meta.url)).text();
		for (const token of ['MarketWatchlist', 'suiteContext', 'nativeWidgetPorts.vWatch', 'data-testid="native-watchlist-port"', 'no signer, account, order, or new feed connection']) expect(source).toContain(token);
	});
});
