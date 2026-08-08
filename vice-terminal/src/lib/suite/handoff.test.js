import { describe, expect, test } from 'bun:test';
import { createTradeHandoff, encodeTradeHandoff, parseTradeHandoff, resolveTradeHandoff, resolveTradeHandoffState } from './handoff';

const instrumentedMarket = (marketKey = 'perp:BTC', instrumentKey = 'hyperliquid:linearPerp:BTC') => ({
	marketKey,
	apiCoin: 'BTC',
	assetId: 0,
	kind: 'corePerp',
	dex: null,
	baseToken: 'BTC',
	quoteToken: 'USDC',
	szDecimals: 5,
	priceDecimals: 1,
	symbol: 'BTC',
	name: 'Bitcoin',
	type: 'perp',
	lastPrice: 1,
	change24h: 0,
	changePercent24h: 0,
	volume24h: 0,
	tradingAvailability: 'available',
	instrument: { venue: 'hyperliquid', instrumentKey }
});
const market = instrumentedMarket();

describe('exact Suite trade handoff', () => {
	test('round-trips only a canonical venue identity', () => {
		const handoff = createTradeHandoff(market, '1h');
		expect(handoff).not.toBeNull();
		expect(parseTradeHandoff(encodeTradeHandoff(handoff))).toEqual(handoff);
		expect(resolveTradeHandoff([market], handoff)).toBe(market);
	});

	test('emits the venue-qualified instrument identity, never the display catalog key', () => {
		const handoff = createTradeHandoff(instrumentedMarket('perp:BTC'), '1h');
		expect(handoff?.marketKey).toBe('hyperliquid:linearPerp:BTC');
		expect(handoff?.marketKey).not.toBe('perp:BTC');
		expect(parseTradeHandoff(encodeTradeHandoff(handoff))).not.toBeNull();
		expect(resolveTradeHandoff([instrumentedMarket('perp:BTC')], handoff)).not.toBeNull();
	});

	test('rejects display-derived, cross-venue, and metadata-only routing', () => {
		expect(parseTradeHandoff(encodeURIComponent(JSON.stringify({ version: 1, venue: 'hyperliquid', marketKey: 'BTC', apiCoin: 'BTC', kind: 'corePerp', timeframe: '1h' })))).toBeNull();
		expect(createTradeHandoff({ ...market, instrument: undefined }, '1h')).toBeNull();
		expect(createTradeHandoff(market, '1d')).toBeNull();
		expect(resolveTradeHandoff([{ ...market, tradingAvailability: 'metadataOnly' }], { version: 1, venue: 'hyperliquid', marketKey: market.marketKey, apiCoin: 'BTC', kind: 'corePerp', timeframe: '1h' })).toBeNull();
	});

	test('waits only for a catalog that has not reached a terminal state', () => {
		const handoff = createTradeHandoff(market, '1h');
		expect(handoff).not.toBeNull();
		expect(resolveTradeHandoffState([], handoff, 'connecting')).toEqual({ state: 'pending' });
		expect(resolveTradeHandoffState([], handoff, 'live')).toEqual({ state: 'unavailable' });
		expect(resolveTradeHandoffState([market], handoff, 'degraded')).toEqual({ state: 'resolved', market });
	});
});
