/** Canonical routing types shared by every current and future venue adapter. */
export type VenueId = 'hyperliquid' | 'binance' | 'bybit' | 'blofin' | 'lighter' | 'nado' | 'blofinDex';
export type ProductKind = 'linearPerp' | 'inversePerp' | 'datedFuture' | 'spot' | 'option';
export type DecimalString = string;

/** A venue may publish a fixed tick or a price-dependent significant-figure rule. */
export type PricePrecisionRule =
	| { kind: 'fixedIncrement'; increment: DecimalString }
	| { kind: 'significantFigures'; maxSignificantFigures: number; maxDecimals: number; integerPricesAllowed: true };

export interface InstrumentId {
	instrumentKey: string;
	venue: VenueId;
	venueSymbol: string;
	product: ProductKind;
	baseAsset: string;
	quoteAsset: string;
	settlementAsset: string;
	contractMultiplier: DecimalString;
	/** Present only when the venue publishes one fixed tick. */
	priceIncrement?: DecimalString;
	pricePrecision: PricePrecisionRule;
	sizeIncrement: DecimalString;
}

export interface AccountRef {
	accountKey: string;
	venue: VenueId;
	credentialRef: string;
	subaccountId?: string;
	accountMode: string;
}

export interface EventEnvelope<T> {
	venue: VenueId;
	accountKey?: string;
	instrumentKey?: string;
	connectionEpoch: number;
	venueSequence?: string;
	eventTimeUs?: string;
	receivedTimeUs: string;
	dedupeKey: string;
	payload: T;
}

export interface VenueCapabilities {
	venue: VenueId;
	products: readonly ProductKind[];
	orderTypes: readonly string[];
	supportsHedgeMode: boolean;
	supportsMarginModes: boolean;
	supportsAmend: boolean;
	/** Exact mutation model; a missing venue primitive must remain `none`. */
	amendSemantics: 'none' | 'cancelReplace' | 'inPlace';
	supportsClientOrderIds: boolean;
	supportsNativeAlgorithms: boolean;
	/** Exact native algorithm names the adapter may later certify. */
	nativeAlgorithmTypes: readonly string[];
	/** Whether an order can be submitted over an authenticated venue WebSocket. */
	supportsWebSocketOrderEntry: boolean;
	supportsPrivateStreams: boolean;
	/** The strongest private-state delivery contract documented and implemented. */
	privateStreamGuarantee: 'none' | 'authenticatedSnapshot' | 'authenticatedDelta' | 'authenticatedReconciliation';
	maxBatchOrders?: number;
	/** What Vice has actually certified; never infer it from the venue's API. */
	certification: 'unavailable' | 'reviewOnly' | 'fundedCertified' | 'productionExposed';
}

const DECIMAL = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;
const UNSIGNED_INTEGER = /^(?:0|[1-9]\d*)$/;
export const MAX_EVENT_TIMESTAMP_MS = Math.floor(Number.MAX_SAFE_INTEGER / 1_000);

function nonBlank(value: string, field: string): void {
	if (value.trim().length === 0 || value !== value.trim()) throw new Error(`Venue identity requires a trimmed ${field}`);
}

function positiveDecimal(value: DecimalString, field: string): void {
	if (!DECIMAL.test(value) || Number(value) <= 0) throw new Error(`Venue identity requires a positive decimal ${field}`);
}

/** Convert a millisecond receipt or venue time without crossing IEEE-754 precision. */
export function eventTimeUsFromMs(value: number, field = 'event time'): string {
	if (!Number.isSafeInteger(value) || value < 0 || value > MAX_EVENT_TIMESTAMP_MS) {
		throw new Error(`Venue event requires an exact non-negative ${field} in milliseconds`);
	}
	return String(value * 1_000);
}

/** Reject partial or display-derived instrument identities before routing. */
export function assertInstrumentId(instrument: InstrumentId): InstrumentId {
	for (const [field, value] of Object.entries({
		instrumentKey: instrument.instrumentKey,
		venueSymbol: instrument.venueSymbol,
		baseAsset: instrument.baseAsset,
		quoteAsset: instrument.quoteAsset,
		settlementAsset: instrument.settlementAsset
	})) nonBlank(value, field);
	if (!instrument.instrumentKey.startsWith(`${instrument.venue}:${instrument.product}:`)) {
		throw new Error('Venue identity requires an instrumentKey scoped to its venue and product');
	}
	positiveDecimal(instrument.contractMultiplier, 'contractMultiplier');
	if (instrument.pricePrecision.kind === 'fixedIncrement') {
		positiveDecimal(instrument.pricePrecision.increment, 'pricePrecision.increment');
		if (instrument.priceIncrement !== instrument.pricePrecision.increment) {
			throw new Error('Venue identity requires a matching fixed priceIncrement');
		}
	} else if (
		!Number.isInteger(instrument.pricePrecision.maxSignificantFigures) ||
		instrument.pricePrecision.maxSignificantFigures < 1 ||
		!Number.isInteger(instrument.pricePrecision.maxDecimals) ||
		instrument.pricePrecision.maxDecimals < 0 ||
		instrument.pricePrecision.integerPricesAllowed !== true ||
		instrument.priceIncrement !== undefined
	) {
		throw new Error('Venue identity requires a valid significant-figure price rule');
	}
	positiveDecimal(instrument.sizeIncrement, 'sizeIncrement');
	return instrument;
}

/** Reject anonymous or display-derived account routing before private projection. */
export function assertAccountRef(account: AccountRef): AccountRef {
	for (const [field, value] of Object.entries({
		accountKey: account.accountKey,
		credentialRef: account.credentialRef,
		accountMode: account.accountMode
	})) nonBlank(value, field);
	if (!account.accountKey.startsWith(`${account.venue}:`)) {
		throw new Error('Venue identity requires an accountKey scoped to its venue');
	}
	if (account.subaccountId !== undefined) nonBlank(account.subaccountId, 'subaccountId');
	return account;
}

/** A canonical event always has one venue, epoch, receipt time, and dedupe key. */
export function assertEventEnvelope<T>(event: EventEnvelope<T>): EventEnvelope<T> {
	if (!Number.isInteger(event.connectionEpoch) || event.connectionEpoch < 0) throw new Error('Venue event requires a non-negative connection epoch');
	nonBlank(event.receivedTimeUs, 'receivedTimeUs');
	if (!UNSIGNED_INTEGER.test(event.receivedTimeUs)) throw new Error('Venue event requires an unsigned integer receivedTimeUs');
	nonBlank(event.dedupeKey, 'dedupeKey');
	if (event.instrumentKey !== undefined) {
		nonBlank(event.instrumentKey, 'instrumentKey');
		if (!event.instrumentKey.startsWith(`${event.venue}:`)) throw new Error('Venue event requires an instrumentKey scoped to its venue');
	}
	if (event.accountKey !== undefined) {
		nonBlank(event.accountKey, 'accountKey');
		if (!event.accountKey.startsWith(`${event.venue}:`)) throw new Error('Venue event requires an accountKey scoped to its venue');
	}
	if (event.venueSequence !== undefined) nonBlank(event.venueSequence, 'venueSequence');
	if (event.eventTimeUs !== undefined) {
		nonBlank(event.eventTimeUs, 'eventTimeUs');
		if (!UNSIGNED_INTEGER.test(event.eventTimeUs)) throw new Error('Venue event requires an unsigned integer eventTimeUs');
	}
	return event;
}

/** Reject ambiguous or self-contradictory venue capability declarations. */
export function assertVenueCapabilities(capabilities: VenueCapabilities): VenueCapabilities {
	if (capabilities.products.length === 0) throw new Error('Venue capabilities require at least one product');
	if (capabilities.orderTypes.some((orderType) => orderType.trim().length === 0)) throw new Error('Venue capabilities require non-blank order types');
	if (capabilities.supportsAmend !== (capabilities.amendSemantics !== 'none')) {
		throw new Error('Venue capabilities require amend support and amend semantics to agree');
	}
	if (capabilities.supportsNativeAlgorithms !== (capabilities.nativeAlgorithmTypes.length > 0)) {
		throw new Error('Venue capabilities require native algorithm support and types to agree');
	}
	if (capabilities.supportsPrivateStreams !== (capabilities.privateStreamGuarantee !== 'none')) {
		throw new Error('Venue capabilities require private-stream support and its guarantee to agree');
	}
	if (capabilities.maxBatchOrders !== undefined && (!Number.isInteger(capabilities.maxBatchOrders) || capabilities.maxBatchOrders < 1)) {
		throw new Error('Venue capabilities require a positive integer maxBatchOrders');
	}
	return capabilities;
}
