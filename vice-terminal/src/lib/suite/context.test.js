import { describe, expect, test } from 'bun:test';
import { get } from 'svelte/store';
import { activeSubaccount, accountSyncStatus, chartTimeframe, isConnected, marketCatalogStatus, marketDataStatus, selectedDex, selectedMarket } from '$lib/stores';
import { suiteContext } from './context';

describe('shared suite context', () => {
	test('publishes exact market identity and no wallet or credential fields', () => {
		selectedDex.set('hyperliquid');
		chartTimeframe.set('15m');
		marketDataStatus.set('live');
		marketCatalogStatus.set('live');
		accountSyncStatus.set('live');
		isConnected.set(true);
		activeSubaccount.set({ id: 'trader-1', name: 'Primary', avatar: '', equity: 1, marginUsed: 0, marginFree: 1, leverage: 1 });
		selectedMarket.set({ marketKey: 'hl:perp:BTC', apiCoin: 'BTC', assetId: 0, kind: 'corePerp', dex: null, baseToken: 'BTC', quoteToken: 'USDC', szDecimals: 5, priceDecimals: 1, symbol: 'BTC', name: 'Bitcoin', type: 'perp', lastPrice: 1, change24h: 0, changePercent24h: 0, volume24h: 0 });

		const context = get(suiteContext);
		expect(context.market.market?.apiCoin).toBe('BTC');
		expect(context.market.timeframe).toBe('15m');
		expect(context.account).toEqual({ accountId: 'trader-1', accountLabel: 'Primary', connected: true, syncStatus: 'live' });
		expect(JSON.stringify(context)).not.toContain('wallet');
		expect(JSON.stringify(context)).not.toContain('credential');
	});

	test('removes local account references when the wallet disconnects', () => {
		isConnected.set(false);
		const context = get(suiteContext);
		expect(context.account.accountId).toBeNull();
		expect(context.account.accountLabel).toBeNull();
	});
});
