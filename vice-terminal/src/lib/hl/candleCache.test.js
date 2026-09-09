import { describe, expect, test } from 'bun:test';
import { loadCachedCandleHistory, loadFastCachedCandleHistory, saveCachedCandleHistory } from './candleCache';

function memoryStorage() {
	const values = new Map();
	return {
		getItem: (key) => values.get(key) ?? null,
		setItem: (key, value) => values.set(key, value)
	};
}

function candles(seed = 100) {
	return [
		{ time: 1_000, open: seed, high: seed + 2, low: seed - 1, close: seed + 1, volume: 3 },
		{ time: 2_000, open: seed + 1, high: seed + 3, low: seed, close: seed + 2, volume: 4 }
	];
}

describe('public candle-history cache', () => {
	test('hydrates only the exact network, market key, API coin, and interval', () => {
		const storage = memoryStorage();
		saveCachedCandleHistory('testnet', 'perp:BTC', 'BTC', '1h', candles(), storage, 10_000);
		expect(loadCachedCandleHistory('testnet', 'perp:BTC', 'BTC', '1h', storage, 10_100)).toEqual(candles());
		expect(loadCachedCandleHistory('testnet', 'spot:BTC', 'BTC', '1h', storage, 10_100)).toEqual([]);
		expect(loadCachedCandleHistory('testnet', 'perp:BTC', 'ETH', '1h', storage, 10_100)).toEqual([]);
		expect(loadCachedCandleHistory('testnet', 'perp:BTC', 'BTC', '5m', storage, 10_100)).toEqual([]);
		expect(loadCachedCandleHistory('mainnet', 'perp:BTC', 'BTC', '1h', storage, 10_100)).toEqual([]);
	});

	test('rejects stale or corrupted public history instead of drawing it', () => {
		const storage = memoryStorage();
		saveCachedCandleHistory('testnet', 'perp:BTC', 'BTC', '1h', candles(), storage, 10_000);
		expect(loadCachedCandleHistory('testnet', 'perp:BTC', 'BTC', '1h', storage, 86_410_001)).toEqual([]);

		storage.setItem('vice.hl.candle-history.v1', JSON.stringify({
			version: 1,
			entries: [{ network: 'testnet', marketKey: 'perp:BTC', apiCoin: 'BTC', interval: '1h', savedAt: 10_000, candles: [
				{ time: 1_000, open: 100, high: 90, low: 80, close: 95, volume: 1 }
			] }]
		}));
		expect(loadCachedCandleHistory('testnet', 'perp:BTC', 'BTC', '1h', storage, 10_100)).toEqual([]);
	});

	test('bounds retention without mixing public histories', () => {
		const storage = memoryStorage();
		for (let index = 0; index < 10; index += 1) {
			saveCachedCandleHistory('testnet', `perp:COIN-${index}`, `COIN-${index}`, '1h', candles(100 + index), storage, 10_000 + index);
		}
		expect(loadCachedCandleHistory('testnet', 'perp:COIN-9', 'COIN-9', '1h', storage, 20_000)).toEqual(candles(109));
		expect(loadCachedCandleHistory('testnet', 'perp:COIN-0', 'COIN-0', '1h', storage, 20_000)).toEqual([]);
	});

	test('uses the in-session history even when durable storage is unavailable', () => {
		const history = candles(200);
		saveCachedCandleHistory('testnet', 'perp:SESSION', 'SESSION', '1h', history, null, 30_000);
		expect(loadFastCachedCandleHistory('testnet', 'perp:SESSION', 'SESSION', '1h', null, 30_100)).toEqual(history);
	});
});
