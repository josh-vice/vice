// @ts-nocheck
import { beforeEach, describe, expect, test } from 'bun:test';
import { get } from 'svelte/store';
import { createPriceAlert, loadPriceAlerts, observePriceAlerts, priceAlertNotice, priceAlerts, removePriceAlert, startPriceAlertMonitoring } from './priceAlerts';
import { marketDataStatus, marketRegistry, recentTrades, selectedMarket } from './stores';

const market = { marketKey: 'perp:BTC', apiCoin: 'BTC', assetId: 0, kind: 'corePerp', dex: null, baseToken: 'BTC', quoteToken: 'USD', szDecimals: 5, priceDecimals: 1, symbol: 'BTC-USD-PERP', name: 'BTC Perpetual', type: 'perp', lastPrice: 100, change24h: 0, changePercent24h: 0, volume24h: 0 };

beforeEach(() => {
	const storage = new Map();
	globalThis.localStorage = {
		getItem: (key) => storage.get(key) ?? null,
		setItem: (key, value) => storage.set(key, value),
		removeItem: (key) => storage.delete(key)
	};
	priceAlerts.set([]);
	priceAlertNotice.set(null);
	selectedMarket.set(null);
	recentTrades.set([]);
	marketRegistry.set([]);
	marketDataStatus.set('idle');
});

describe('US-008 local price alerts', () => {
	test('persists exact market identity and rejects invalid thresholds', () => {
		expect(createPriceAlert(null, 'above', 101)).toEqual({ ok: false, error: 'Select a live market before adding an alert' });
		expect(createPriceAlert(market, 'above', 0)).toEqual({ ok: false, error: 'Alert price must be greater than zero' });
		const created = createPriceAlert(market, 'above', 101);
		expect(created.ok).toBe(true);
		expect(get(priceAlerts)[0]).toMatchObject({ marketKey: 'perp:BTC', apiCoin: 'BTC', threshold: 101 });
		removePriceAlert(get(priceAlerts)[0].id);
		expect(get(priceAlerts)).toEqual([]);
		loadPriceAlerts();
	});

	test('fires once per fresh live crossing and never replays an offline crossing', () => {
		createPriceAlert(market, 'above', 101);
		observePriceAlerts('perp:BTC', 100, true);
		observePriceAlerts('perp:BTC', 102, true);
		expect(get(priceAlertNotice)?.message).toContain('crossed above 101');
		priceAlertNotice.set(null);
		observePriceAlerts('perp:BTC', 103, true);
		expect(get(priceAlertNotice)).toBeNull();
		observePriceAlerts('perp:BTC', 99, false);
		observePriceAlerts('perp:BTC', 102, true);
		expect(get(priceAlertNotice)).toBeNull();
		observePriceAlerts('perp:BTC', 100, true);
		observePriceAlerts('perp:BTC', 102, true);
		expect(get(priceAlertNotice)?.message).toContain('crossed above 101');
	});

	test('records every simultaneous crossing for one exact market', () => {
		createPriceAlert(market, 'above', 101);
		createPriceAlert(market, 'above', 102);
		observePriceAlerts('perp:BTC', 100, true);
		observePriceAlerts('perp:BTC', 103, true);
		const notice = get(priceAlertNotice);
		expect(notice?.alertIds).toHaveLength(2);
		expect(notice?.message).toContain('above 101');
		expect(notice?.message).toContain('above 102');
	});

	test('monitors an alert market after the trader switches away from it', () => {
		const otherMarket = { ...market, marketKey: 'perp:ETH', apiCoin: 'ETH', symbol: 'ETH-USD-PERP', lastPrice: 100 };
		createPriceAlert(otherMarket, 'above', 101);
		marketRegistry.set([otherMarket]);
		marketDataStatus.set('live');
		const stop = startPriceAlertMonitoring();
		marketRegistry.set([{ ...otherMarket, lastPrice: 102 }]);
		expect(get(priceAlertNotice)?.marketKey).toBe('perp:ETH');
		stop();
	});

	test('does not let one absent alert market erase another market baseline', () => {
		const otherMarket = { ...market, marketKey: 'perp:ETH', apiCoin: 'ETH', symbol: 'ETH-USD-PERP', lastPrice: 100 };
		const missingMarket = { ...market, marketKey: 'perp:MISSING', apiCoin: 'MISSING', symbol: 'MISSING-USD-PERP', lastPrice: 100 };
		createPriceAlert(otherMarket, 'above', 101);
		createPriceAlert(missingMarket, 'above', 101);
		marketRegistry.set([otherMarket]);
		marketDataStatus.set('live');
		const stop = startPriceAlertMonitoring();
		marketRegistry.set([{ ...otherMarket, lastPrice: 102 }]);
		expect(get(priceAlertNotice)?.marketKey).toBe('perp:ETH');
		stop();
	});
});
