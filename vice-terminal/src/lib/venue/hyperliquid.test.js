import { describe, expect, test } from 'bun:test';
import { createCoreBtcBootstrapMarket } from '$lib/hl/markets.ts';
import { assertHyperliquidMarketInstrument, hyperliquidBookEvent, HYPERLIQUID_BOOK_SEQUENCE_SUPPORT } from './hyperliquid.ts';

const book = { bids: [{ price: 100, size: 1, total: 1 }], asks: [{ price: 101, size: 1, total: 1 }], spread: 1, spreadPercent: 1 };

describe('Hyperliquid canonical public-book events', () => {
	test('keeps exact identity, grouping-aware subscription key, and local ordinal when venue sequence is absent', () => {
		const event = hyperliquidBookEvent(createCoreBtcBootstrapMarket(), book, 4, 3, 8, 2, 1700000000000, 1699999999999);
		expect(event).toMatchObject({
			venue: 'hyperliquid',
			instrumentKey: 'hyperliquid:linearPerp:BTC',
			subscriptionKey: 'hyperliquid:l2Book:BTC@nSigFigs=4',
			connectionEpoch: 3,
			eventTimeUs: '1699999999999000',
			receivedTimeUs: '1700000000000000',
			dedupeKey: 'book:BTC:4:3:8:2',
			payload: book
		});
		expect(event.venueSequence).toBeUndefined();
	});

	test('declares that the venue provides no authoritative book sequence, so gap recovery is not claimed', () => {
		expect(HYPERLIQUID_BOOK_SEQUENCE_SUPPORT).toBe('none');
	});

	test('keeps same-coin traffic from different groupings distinguishable', () => {
		const market = createCoreBtcBootstrapMarket();
		const grouped4 = hyperliquidBookEvent(market, book, 4, 3, 8, 2, 1700000000000);
		const grouped5 = hyperliquidBookEvent(market, book, 5, 3, 8, 2, 1700000000000);
		expect(grouped4.subscriptionKey).toBe('hyperliquid:l2Book:BTC@nSigFigs=4');
		expect(grouped5.subscriptionKey).toBe('hyperliquid:l2Book:BTC@nSigFigs=5');
		expect(grouped4.dedupeKey).not.toBe(grouped5.dedupeKey);
		expect(grouped4.payload).toEqual(grouped5.payload);
	});

	test('rejects a missing canonical identity, unsupported grouping, or invalid local ordinal', () => {
		const market = createCoreBtcBootstrapMarket();
		expect(() => hyperliquidBookEvent({ ...market, instrument: undefined }, book, 4, 1, 1, 1, 1700000000000)).toThrow('canonical Hyperliquid instrument');
		expect(() => hyperliquidBookEvent(market, book, 1, 1, 1, 1, 1700000000000)).toThrow('nSigFigs');
		expect(() => hyperliquidBookEvent(market, book, 6, 1, 1, 1, 1700000000000)).toThrow('nSigFigs');
		expect(() => hyperliquidBookEvent(market, book, 4, 1, 1, 0, 1700000000000)).toThrow('eventOrdinal');
	});

	test('rejects a canonical identity that no longer matches selected routing fields', () => {
		const market = createCoreBtcBootstrapMarket();
		expect(assertHyperliquidMarketInstrument(market)).toBe(market);
		expect(() => assertHyperliquidMarketInstrument({ ...market, apiCoin: 'ETH' })).toThrow('does not match');
	});
});
