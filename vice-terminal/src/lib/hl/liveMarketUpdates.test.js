import { describe, expect, test } from 'bun:test';
import { applyAllDexPerpContexts, applySpotContexts } from './liveMarketUpdates';

	const perp = (marketKey, dex, symbol, assetId = 1) => ({
	marketKey,
	apiCoin: dex ? `${dex}:${symbol}` : symbol,
	assetId,
	kind: dex ? 'hip3Perp' : 'corePerp',
	dex,
	baseToken: symbol,
	quoteToken: 'USD',
	szDecimals: 3,
	priceDecimals: 3,
	symbol,
	name: symbol,
	type: 'perp',
	lastPrice: 100,
	markPrice: 100,
	indexPrice: 100,
	change24h: 0,
	changePercent24h: 0,
	volume24h: 1,
	openInterest: 2,
	fundingRate: 0.01
});

describe('complete market live context updates', () => {
		test('updates core and HIP-3 contexts without routing by display symbol', () => {
			const markets = [perp('perp:BTC', null, 'BTC', 1), perp('hip3:xyz:BTC', 'xyz', 'BTC', 100_002)];
			const updated = applyAllDexPerpContexts(markets, [
			['', [{}, { midPx: '101', markPx: '101.2', prevDayPx: '100', dayNtlVlm: '10', openInterest: '3', funding: '0.02', oraclePx: '101.1' }]],
			['xyz', [{}, {}, { midPx: '201', markPx: '201.2', prevDayPx: '200', dayNtlVlm: '20', openInterest: '4', funding: '0.03', oraclePx: '201.1' }]]
			]);
			expect(updated).toBe(markets);
			expect(updated[0]).toMatchObject({ apiCoin: 'BTC', lastPrice: 101, volume24h: 10 });
		expect(updated[1]).toMatchObject({ apiCoin: 'xyz:BTC', lastPrice: 201, volume24h: 20 });
	});

		test('updates spot by the exact @ asset index', () => {
			const spot = { ...perp('spot:1', null, 'BTC-USDC'), apiCoin: '@1', assetId: 10001, kind: 'spot', type: 'spot' };
			const updated = applySpotContexts([spot], [{}, { midPx: '99', markPx: '99.1', prevDayPx: '100', dayNtlVlm: '7' }]);
			expect(updated).toBeInstanceOf(Array);
			expect(updated[0]).toBe(spot);
			expect(updated[0]).toMatchObject({ apiCoin: '@1', lastPrice: 99, volume24h: 7 });
	});
});
