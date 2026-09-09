import { describe, expect, test } from 'bun:test';
import fixture from '$lib/blofin/fixtures/instruments.json';
import { normalizeBlofinInstruments } from '$lib/blofin/markets';
import {
	assertBlofinInstrument,
	BLOFIN_BOOK_SEQUENCE_SUPPORT,
	blofinBookEvent
} from './blofin';

const market = normalizeBlofinInstruments(fixture)[0];
const sequencedBook = {
	asks: [[1639.75, 392], [1639.95, 541]],
	bids: [[1639.7, 6817], [1639.65, 4744]],
	ts: '1696670727520',
	prevSeqId: '0',
	seqId: '107600747'
} as const;

const snapshotWithoutSequence = {
	asks: [['1639.75', '392']],
	bids: [['1639.7', '6817']],
	ts: '1696670727520'
} as const;

describe('BloFin canonical public-book identity', () => {
	test('asserts the canonical linear-perpetual instrument and preserves the descriptor', () => {
		expect(assertBlofinInstrument(market)).toBe(market);
		expect(assertBlofinInstrument(market.instrument)).toBe(market.instrument);
		expect(() => assertBlofinInstrument({ ...market, status: 'suspended' })).toThrow('live');
		expect(() => assertBlofinInstrument({ ...market, instrument: { ...market.instrument, venueSymbol: 'ETH-USDT' } })).toThrow('does not match');
	});

	test('uses documented sequence IDs when present in a books payload', () => {
		const event = blofinBookEvent(market, sequencedBook, 3, 8, 2, 1700000000000);

		expect(BLOFIN_BOOK_SEQUENCE_SUPPORT).toBe('venueSequence');
		expect(event).toMatchObject({
			venue: 'blofin',
			instrumentKey: 'blofin:linearPerp:BTC-USDT',
			subscriptionKey: 'blofin:l2Book:BTC-USDT@tick=0.1',
			connectionEpoch: 3,
			venueSequence: '107600747',
			eventTimeUs: '1696670727520000',
			receivedTimeUs: '1700000000000000',
			payload: sequencedBook
		});
		expect(event.dedupeKey).toContain('107600747');
	});

	test('does not invent a venue sequence for a payload that does not provide one', () => {
		const event = blofinBookEvent(market, snapshotWithoutSequence, 3, 8, 3, 1700000000000);
		expect(event.venueSequence).toBeUndefined();
		expect(event.eventTimeUs).toBe('1696670727520000');
	});

	test('rejects invalid sequence metadata and invalid local event identity', () => {
		expect(() => blofinBookEvent(market, { ...sequencedBook, seqId: 'not-a-sequence' }, 3, 8, 2, 1700000000000)).toThrow('seqId');
		expect(() => blofinBookEvent(market, sequencedBook, -1, 8, 2, 1700000000000)).toThrow('connection epoch');
		expect(() => blofinBookEvent(market, sequencedBook, 3, 8, 0, 1700000000000)).toThrow('eventOrdinal');
	});
});
