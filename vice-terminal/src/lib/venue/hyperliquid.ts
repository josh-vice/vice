import type { MarketDescriptor, OrderBook } from '$lib/types';
import { assertEventEnvelope, assertInstrumentId, bookSubscriptionKey, eventTimeUsFromMs, type EventEnvelope } from './identity';

/** Hyperliquid L2 frames carry no authoritative sequence; never claim gap recovery. */
export const HYPERLIQUID_BOOK_SEQUENCE_SUPPORT = 'none' as const;

function decimalIncrement(decimals: number): string {
	if (!Number.isInteger(decimals) || decimals < 0 || decimals > 18) throw new Error('Hyperliquid market has invalid size decimals');
	return decimals === 0 ? '1' : `0.${'0'.repeat(decimals - 1)}1`;
}

/** Validate canonical public identity for core perps, HIP-3 perps, and spot. */
export function assertHyperliquidPublicMarketInstrument(market: MarketDescriptor): MarketDescriptor {
	const instrument = market.instrument;
	if (!instrument || instrument.venue !== 'hyperliquid') throw new Error('Hyperliquid market lacks a canonical instrument identity');
	assertInstrumentId(instrument);
	const product = market.type === 'spot' ? 'spot' : 'linearPerp';
	if (instrument.instrumentKey !== `hyperliquid:${product}:${market.apiCoin}` || instrument.venueSymbol !== market.apiCoin || instrument.product !== product || instrument.baseAsset !== market.baseToken || instrument.quoteAsset !== market.quoteToken || instrument.settlementAsset !== market.quoteToken || instrument.contractMultiplier !== '1' || instrument.sizeIncrement !== decimalIncrement(market.szDecimals) || instrument.pricePrecision.kind !== 'significantFigures' || instrument.pricePrecision.maxSignificantFigures !== 5 || instrument.pricePrecision.maxDecimals !== market.priceDecimals || instrument.pricePrecision.integerPricesAllowed !== true) {
		throw new Error('Hyperliquid canonical instrument does not match the selected market');
	}
	return market;
}

/** Require complete execution terms at every signing boundary. */
export function assertHyperliquidMarketInstrument(market: MarketDescriptor): MarketDescriptor {
	return assertHyperliquidPublicMarketInstrument(market);
}

/**
 * Hyperliquid L2 frames provide a venue timestamp but no authoritative sequence,
 * so the connection epoch plus local subscription ordinal make a bounded,
 * process-local dedupe key without inventing venue sequencing. The requested
 * grouping is part of the subscription identity because the payload itself
 * identifies only the coin: same-coin `nSigFigs` traffic must stay
 * distinguishable for shared-worker book multiplexing.
 */
export function hyperliquidBookEvent(
	market: MarketDescriptor,
	book: OrderBook,
	nSigFigs: number,
	connectionEpoch: number,
	subscriptionEpoch: number,
	eventOrdinal: number,
	receivedAtMs: number,
	eventTimeMs?: number
): EventEnvelope<OrderBook> {
	try { assertHyperliquidPublicMarketInstrument(market); }
	catch { throw new Error('Hyperliquid book event requires a canonical Hyperliquid instrument'); }
	const instrument = market.instrument;
	if (!instrument) throw new Error('Hyperliquid book event requires a canonical Hyperliquid instrument');
	if (![2, 3, 4, 5].includes(nSigFigs)) {
		throw new Error(`Hyperliquid book event requires a venue-supported nSigFigs grouping, got ${nSigFigs}`);
	}
	for (const [field, value] of Object.entries({ connectionEpoch, subscriptionEpoch, eventOrdinal })) {
		if (!Number.isSafeInteger(value) || value < 0 || (field === 'eventOrdinal' && value < 1)) {
			throw new Error(`Hyperliquid book event has invalid ${field}`);
		}
	}
	return assertEventEnvelope({
		venue: 'hyperliquid',
		instrumentKey: instrument.instrumentKey,
		subscriptionKey: bookSubscriptionKey({
			venue: 'hyperliquid',
			instrumentKey: instrument.instrumentKey,
			coin: market.apiCoin,
			grouping: { kind: 'significantFigures', nSigFigs },
			sequenceSupport: HYPERLIQUID_BOOK_SEQUENCE_SUPPORT
		}),
		connectionEpoch,
		...(eventTimeMs === undefined ? {} : { eventTimeUs: eventTimeUsFromMs(eventTimeMs, 'Hyperliquid event time') }),
		receivedTimeUs: eventTimeUsFromMs(receivedAtMs, 'Hyperliquid receipt time'),
		dedupeKey: `book:${market.apiCoin}:${nSigFigs}:${connectionEpoch}:${subscriptionEpoch}:${eventOrdinal}`,
		payload: book
	});
}
