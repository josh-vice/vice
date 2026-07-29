import type { MarketDescriptor, OrderBook } from '$lib/types';
import { assertEventEnvelope, assertInstrumentId, eventTimeUsFromMs, type EventEnvelope } from './identity';

function decimalIncrement(decimals: number): string {
	if (!Number.isInteger(decimals) || decimals < 0 || decimals > 18) throw new Error('Hyperliquid market has invalid size decimals');
	return decimals === 0 ? '1' : `0.${'0'.repeat(decimals - 1)}1`;
}

/** Require the catalog identity used at every Hyperliquid signing boundary. */
export function assertHyperliquidMarketInstrument(market: MarketDescriptor): MarketDescriptor {
	if (market.kind === 'outcome' || market.tradingAvailability === 'metadataOnly') {
		throw new Error('Hyperliquid market lacks complete execution terms');
	}
	const instrument = market.instrument;
	if (!instrument || instrument.venue !== 'hyperliquid') {
		throw new Error('Hyperliquid market lacks a canonical instrument identity');
	}
	assertInstrumentId(instrument);
	const product = market.type === 'spot' ? 'spot' : 'linearPerp';
	if (
		instrument.instrumentKey !== `hyperliquid:${product}:${market.apiCoin}` ||
		instrument.venueSymbol !== market.apiCoin ||
		instrument.product !== product ||
		instrument.baseAsset !== market.baseToken ||
		instrument.quoteAsset !== market.quoteToken ||
		instrument.settlementAsset !== market.quoteToken ||
		instrument.contractMultiplier !== '1' ||
		instrument.sizeIncrement !== decimalIncrement(market.szDecimals) ||
		instrument.pricePrecision.kind !== 'significantFigures' ||
		instrument.pricePrecision.maxSignificantFigures !== 5 ||
		instrument.pricePrecision.maxDecimals !== market.priceDecimals ||
		instrument.pricePrecision.integerPricesAllowed !== true
	) {
		throw new Error('Hyperliquid canonical instrument does not match the selected market');
	}
	return market;
}

/**
 * Hyperliquid L2 frames provide a venue timestamp but no authoritative sequence.
 * The connection epoch plus local subscription ordinal therefore make a bounded,
 * process-local dedupe key without inventing venue sequencing.
 */
export function hyperliquidBookEvent(
	market: MarketDescriptor,
	book: OrderBook,
	connectionEpoch: number,
	subscriptionEpoch: number,
	eventOrdinal: number,
	receivedAtMs: number,
	eventTimeMs?: number
): EventEnvelope<OrderBook> {
	try { assertHyperliquidMarketInstrument(market); }
	catch { throw new Error('Hyperliquid book event requires a canonical Hyperliquid instrument'); }
	const instrument = market.instrument;
	if (!instrument) throw new Error('Hyperliquid book event requires a canonical Hyperliquid instrument');
	for (const [field, value] of Object.entries({ connectionEpoch, subscriptionEpoch, eventOrdinal })) {
		if (!Number.isSafeInteger(value) || value < 0 || (field === 'eventOrdinal' && value < 1)) {
			throw new Error(`Hyperliquid book event has invalid ${field}`);
		}
	}
	return assertEventEnvelope({
		venue: 'hyperliquid',
		instrumentKey: instrument.instrumentKey,
		connectionEpoch,
		...(eventTimeMs === undefined ? {} : { eventTimeUs: eventTimeUsFromMs(eventTimeMs, 'Hyperliquid event time') }),
		receivedTimeUs: eventTimeUsFromMs(receivedAtMs, 'Hyperliquid receipt time'),
		dedupeKey: `book:${market.apiCoin}:${connectionEpoch}:${subscriptionEpoch}:${eventOrdinal}`,
		payload: book
	});
}
