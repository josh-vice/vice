import { describe, expect, test } from 'bun:test';
import { assertAccountRef, assertBookSubscriptionIdentity, assertEventEnvelope, assertInstrumentId, assertVenueCapabilities, bookSubscriptionKey, eventTimeUsFromMs, MAX_EVENT_TIMESTAMP_MS } from './identity.ts';

const instrument = {
	instrumentKey: 'blofin:linearPerp:BTC-USDT',
	venue: 'blofin',
	venueSymbol: 'BTC-USDT',
	product: 'linearPerp',
	baseAsset: 'BTC',
	quoteAsset: 'USDT',
	settlementAsset: 'USDT',
	contractMultiplier: '0.001',
	priceIncrement: '0.5',
	pricePrecision: { kind: 'fixedIncrement', increment: '0.5' },
	sizeIncrement: '0.1'
};

describe('canonical multi-venue identity', () => {
	test('preserves exact venue routing fields and rejects partial terms', () => {
		expect(assertInstrumentId(instrument)).toEqual(instrument);
		expect(() => assertInstrumentId({ ...instrument, venueSymbol: ' BTC-USDT ' })).toThrow('trimmed venueSymbol');
		expect(() => assertInstrumentId({ ...instrument, sizeIncrement: '0' })).toThrow('positive decimal sizeIncrement');
		expect(() => assertInstrumentId({ ...instrument, pricePrecision: { kind: 'fixedIncrement', increment: '0.1' } })).toThrow('matching fixed priceIncrement');
		expect(() => assertInstrumentId({ ...instrument, instrumentKey: 'hyperliquid:linearPerp:BTC-USDT' })).toThrow('scoped to its venue and product');
	});

	test('allows a documented significant-figure rule without inventing a fixed tick', () => {
		const hyperliquid = { ...instrument, instrumentKey: 'hyperliquid:linearPerp:BTC', venue: 'hyperliquid', venueSymbol: 'BTC', priceIncrement: undefined, pricePrecision: { kind: 'significantFigures', maxSignificantFigures: 5, maxDecimals: 1, integerPricesAllowed: true } };
		expect(assertInstrumentId(hyperliquid)).toEqual(hyperliquid);
		expect(() => assertInstrumentId({ ...hyperliquid, priceIncrement: '0.1' })).toThrow('significant-figure price rule');
	});

	test('requires an epoch and dedupe key for every adapter event', () => {
		const event = { venue: 'blofin', instrumentKey: instrument.instrumentKey, connectionEpoch: 3, receivedTimeUs: '1700000000000000', dedupeKey: 'books:BTC-USDT:10', payload: { sequence: '10' } };
		expect(assertEventEnvelope(event)).toEqual(event);
		expect(() => assertEventEnvelope({ ...event, connectionEpoch: -1 })).toThrow('non-negative connection epoch');
		expect(() => assertEventEnvelope({ ...event, instrumentKey: 'hyperliquid:linearPerp:BTC' })).toThrow('scoped to its venue');
		expect(() => assertEventEnvelope({ ...event, receivedTimeUs: '1700.0' })).toThrow('unsigned integer receivedTimeUs');
		expect(() => assertEventEnvelope({ ...event, eventTimeUs: '-1' })).toThrow('unsigned integer eventTimeUs');
		expect(eventTimeUsFromMs(MAX_EVENT_TIMESTAMP_MS)).toBe(String(MAX_EVENT_TIMESTAMP_MS * 1_000));
		expect(() => eventTimeUsFromMs(MAX_EVENT_TIMESTAMP_MS + 1)).toThrow('exact non-negative');
	});

	test('rejects anonymous account routing references', () => {
		expect(assertAccountRef({ accountKey: 'blofin:demo:0123456789abcdef01234567', venue: 'blofin', credentialRef: '0123456789abcdef01234567', accountMode: 'futures:demo' })).toMatchObject({ venue: 'blofin' });
		expect(() => assertAccountRef({ accountKey: ' ', venue: 'blofin', credentialRef: '0123456789abcdef01234567', accountMode: 'futures:demo' })).toThrow('trimmed accountKey');
		expect(() => assertAccountRef({ accountKey: 'hyperliquid:demo:0123456789abcdef01234567', venue: 'blofin', credentialRef: '0123456789abcdef01234567', accountMode: 'futures:demo' })).toThrow('scoped to its venue');
	});

	test('requires venue capability claims to agree with their exact guarantees', () => {
		const capabilities = { venue: 'blofin', products: ['linearPerp'], orderTypes: ['limit'], supportsHedgeMode: true, supportsMarginModes: true, supportsAmend: false, amendSemantics: 'none', supportsClientOrderIds: true, supportsNativeAlgorithms: true, nativeAlgorithmTypes: ['tpsl'], supportsWebSocketOrderEntry: false, supportsPrivateStreams: true, privateStreamGuarantee: 'authenticatedReconciliation', certification: 'reviewOnly' };
		expect(assertVenueCapabilities(capabilities)).toEqual(capabilities);
		expect(() => assertVenueCapabilities({ ...capabilities, supportsAmend: true })).toThrow('amend support');
		expect(() => assertVenueCapabilities({ ...capabilities, nativeAlgorithmTypes: [] })).toThrow('native algorithm');
		expect(() => assertVenueCapabilities({ ...capabilities, privateStreamGuarantee: 'none' })).toThrow('private-stream');
	});

	test('builds a grouping-aware book subscription key that disambiguates same-coin traffic', () => {
		const base = { venue: 'hyperliquid', instrumentKey: 'hyperliquid:linearPerp:BTC', coin: 'BTC', sequenceSupport: 'none' };
		expect(bookSubscriptionKey({ ...base, grouping: { kind: 'significantFigures', nSigFigs: 4 } })).toBe('hyperliquid:l2Book:BTC@nSigFigs=4');
		expect(bookSubscriptionKey({ ...base, grouping: { kind: 'significantFigures', nSigFigs: 5 } })).toBe('hyperliquid:l2Book:BTC@nSigFigs=5');
		expect(bookSubscriptionKey({ venue: 'blofin', instrumentKey: 'blofin:linearPerp:BTC-USDT', coin: 'BTC-USDT', grouping: { kind: 'fixedIncrement', increment: '0.5' }, sequenceSupport: 'venueSequence' })).toBe('blofin:l2Book:BTC-USDT@tick=0.5');
	});

	test('rejects ambiguous or unsupported book subscription identities', () => {
		const base = { venue: 'hyperliquid', instrumentKey: 'hyperliquid:linearPerp:BTC', coin: 'BTC', grouping: { kind: 'significantFigures', nSigFigs: 4 }, sequenceSupport: 'none' };
		expect(assertBookSubscriptionIdentity(base)).toEqual(base);
		expect(() => assertBookSubscriptionIdentity({ ...base, instrumentKey: 'blofin:linearPerp:BTC' })).toThrow('scoped to its venue');
		expect(() => assertBookSubscriptionIdentity({ ...base, grouping: { kind: 'significantFigures', nSigFigs: 1 } })).toThrow('significant-figure');
		expect(() => assertBookSubscriptionIdentity({ ...base, grouping: { kind: 'significantFigures', nSigFigs: 6 } })).toThrow('significant-figure');
		expect(() => assertBookSubscriptionIdentity({ ...base, grouping: { kind: 'significantFigures', nSigFigs: 4.5 } })).toThrow('significant-figure');
		expect(() => assertBookSubscriptionIdentity({ ...base, grouping: { kind: 'fixedIncrement', increment: '0' } })).toThrow('positive decimal');
		expect(() => assertBookSubscriptionIdentity({ ...base, sequenceSupport: 'unknown' })).toThrow('sequence support');
	});

	test('accepts a venue-scoped subscriptionKey on the event envelope', () => {
		const event = { venue: 'hyperliquid', instrumentKey: 'hyperliquid:linearPerp:BTC', subscriptionKey: 'hyperliquid:l2Book:BTC@nSigFigs=4', connectionEpoch: 3, receivedTimeUs: '1700000000000000', dedupeKey: 'book:BTC:4:3:8:2', payload: {} };
		expect(assertEventEnvelope(event)).toEqual(event);
		expect(() => assertEventEnvelope({ ...event, subscriptionKey: 'blofin:l2Book:BTC@nSigFigs=4' })).toThrow('subscriptionKey scoped to its venue');
		expect(() => assertEventEnvelope({ ...event, subscriptionKey: ' hyperliquid:l2Book:BTC@nSigFigs=4' })).toThrow('trimmed subscriptionKey');
	});
});
