import { describe, expect, test } from 'bun:test';
import { createTradeHandoff, encodeTradeHandoff, parseTradeHandoff, resolveTradeHandoff } from './handoff';

const market = { marketKey: 'hyperliquid:linearPerp:BTC', apiCoin: 'BTC', assetId: 0, kind: 'corePerp', dex: null, baseToken: 'BTC', quoteToken: 'USDC', szDecimals: 5, priceDecimals: 1, symbol: 'BTC', name: 'Bitcoin', type: 'perp', lastPrice: 1, change24h: 0, changePercent24h: 0, volume24h: 0, tradingAvailability: 'available', instrument: { venue: 'hyperliquid' } };

describe('exact Suite trade handoff', () => {
	test('round-trips only a canonical venue identity', () => {
		const handoff = createTradeHandoff(market);
		expect(handoff).not.toBeNull();
		expect(parseTradeHandoff(encodeTradeHandoff(handoff))).toEqual(handoff);
		expect(resolveTradeHandoff([market], handoff)).toBe(market);
	});

	test('rejects display-derived, cross-venue, and metadata-only routing', () => {
		expect(parseTradeHandoff(encodeURIComponent(JSON.stringify({ version: 1, venue: 'hyperliquid', marketKey: 'BTC', apiCoin: 'BTC', kind: 'corePerp' })))).toBeNull();
		expect(createTradeHandoff({ ...market, instrument: undefined })).toBeNull();
		expect(resolveTradeHandoff([{ ...market, tradingAvailability: 'metadataOnly' }], { version: 1, venue: 'hyperliquid', marketKey: market.marketKey, apiCoin: 'BTC', kind: 'corePerp' })).toBeNull();
	});
});
