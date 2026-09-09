import type { EventEnvelope, InstrumentId } from '$lib/venue/identity';
import {
	assertBookSubscriptionIdentity,
	assertEventEnvelope,
	assertInstrumentId,
	bookSubscriptionKey,
	eventTimeUsFromMs
} from '$lib/venue/identity';
import type { BlofinMarket } from '$lib/blofin/markets';

export const BLOFIN_BOOK_SEQUENCE_SUPPORT = 'venueSequence' as const;

export interface BlofinBookPayload {
	asks: ReadonlyArray<ReadonlyArray<number | string>>;
	bids: ReadonlyArray<ReadonlyArray<number | string>>;
	ts: string;
	seqId?: string;
	prevSeqId?: string;
}

function sequence(value: unknown, field: string): string {
	if (typeof value !== 'string' || !/^(?:0|[1-9]\d*)$/.test(value)) {
		throw new Error(`BloFin book payload has invalid ${field}`);
	}
	return value;
}

function assertMarket(market: BlofinMarket): BlofinMarket {
	if (market.status !== 'live') throw new Error('BloFin instrument must be live');
	if (
		market.marketKey !== market.instrument.instrumentKey ||
		market.apiCoin !== market.instrument.venueSymbol ||
		market.instrument.venue !== 'blofin' ||
		market.instrument.product !== 'linearPerp'
	) {
		throw new Error('BloFin market does not match its canonical instrument');
	}
	assertInstrumentId(market.instrument);
	return market;
}

export function assertBlofinInstrument(input: BlofinMarket | InstrumentId): BlofinMarket | InstrumentId {
	if ('instrument' in input) return assertMarket(input);
	if (input.venue !== 'blofin' || input.product !== 'linearPerp') {
		throw new Error('BloFin instrument does not match linear perpetual identity');
	}
	return assertInstrumentId(input);
}

export function blofinBookEvent(
	market: BlofinMarket,
	book: BlofinBookPayload,
	connectionEpoch: number,
	subscriptionEpoch: number,
	eventOrdinal: number,
	receivedAtMs: number
): EventEnvelope<BlofinBookPayload> {
	assertMarket(market);
	if (!Number.isSafeInteger(connectionEpoch) || connectionEpoch < 0) {
		throw new Error('BloFin book event requires a non-negative connection epoch');
	}
	if (!Number.isSafeInteger(subscriptionEpoch) || subscriptionEpoch < 0) {
		throw new Error('BloFin book event requires a non-negative subscription epoch');
	}
	if (!Number.isSafeInteger(eventOrdinal) || eventOrdinal < 1) {
		throw new Error('BloFin book event requires a positive eventOrdinal');
	}
	const eventTimeMs = Number(book.ts);
	if (!Number.isSafeInteger(eventTimeMs) || eventTimeMs < 0) {
		throw new Error('BloFin book payload has invalid ts');
	}
	const venueSequence = book.seqId === undefined ? undefined : sequence(book.seqId, 'seqId');
	if (book.prevSeqId !== undefined) sequence(book.prevSeqId, 'prevSeqId');
	const increment = market.instrument.pricePrecision.kind === 'fixedIncrement'
		? market.instrument.pricePrecision.increment
		: market.instrument.priceIncrement ?? '0.00000001';
	const subscriptionIdentity = assertBookSubscriptionIdentity({
		venue: 'blofin',
		instrumentKey: market.instrument.instrumentKey,
		coin: market.instrument.venueSymbol,
		grouping: { kind: 'fixedIncrement', increment },
		sequenceSupport: BLOFIN_BOOK_SEQUENCE_SUPPORT
	});
	return assertEventEnvelope({
		venue: 'blofin',
		instrumentKey: market.instrument.instrumentKey,
		subscriptionKey: bookSubscriptionKey(subscriptionIdentity),
		connectionEpoch,
		...(venueSequence === undefined ? {} : { venueSequence }),
		eventTimeUs: eventTimeUsFromMs(eventTimeMs, 'BloFin event time'),
		receivedTimeUs: eventTimeUsFromMs(receivedAtMs, 'BloFin receipt time'),
		dedupeKey: `book:${market.instrument.venueSymbol}:${venueSequence ?? `${eventTimeMs}:${subscriptionEpoch}:${eventOrdinal}`}`,
		payload: book
	});
}
