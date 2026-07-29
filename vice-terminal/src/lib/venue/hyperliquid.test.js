import { describe, expect, test } from 'bun:test';
import { createCoreBtcBootstrapMarket } from '$lib/hl/markets.ts';
import { assertHyperliquidMarketInstrument, hyperliquidBookEvent } from './hyperliquid.ts';

const book = { bids: [{ price: 100, size: 1, total: 1 }], asks: [{ price: 101, size: 1, total: 1 }], spread: 1, spreadPercent: 1 };

describe('Hyperliquid canonical public-book events', () => {
	test('keeps exact identity and uses local ordinal only when venue sequence is absent', () => {
		const event = hyperliquidBookEvent(createCoreBtcBootstrapMarket(), book, 3, 8, 2, 1700000000000, 1699999999999);
		expect(event).toMatchObject({ venue: 'hyperliquid', instrumentKey: 'hyperliquid:linearPerp:BTC', connectionEpoch: 3, eventTimeUs: '1699999999999000', receivedTimeUs: '1700000000000000', dedupeKey: 'book:BTC:3:8:2', payload: book });
		expect(event.venueSequence).toBeUndefined();
	});

	test('rejects a missing canonical identity or invalid local ordinal', () => {
		const market = createCoreBtcBootstrapMarket();
		expect(() => hyperliquidBookEvent({ ...market, instrument: undefined }, book, 1, 1, 1, 1700000000000)).toThrow('canonical Hyperliquid instrument');
		expect(() => hyperliquidBookEvent(market, book, 1, 1, 0, 1700000000000)).toThrow('eventOrdinal');
	});

	test('rejects a canonical identity that no longer matches selected routing fields', () => {
		const market = createCoreBtcBootstrapMarket();
		expect(assertHyperliquidMarketInstrument(market)).toBe(market);
		expect(() => assertHyperliquidMarketInstrument({ ...market, apiCoin: 'ETH' })).toThrow('does not match');
	});
});
