import { assertInstrumentId, assertVenueCapabilities, type InstrumentId, type VenueCapabilities } from '$lib/venue/identity';

/** Official public Lighter catalog endpoint. No credential or order path lives here. */
export const LIGHTER_MAINNET_REST_URL = 'https://mainnet.zklighter.elliot.ai';
export const LIGHTER_TESTNET_REST_URL = 'https://testnet.zklighter.elliot.ai';

export type LighterCatalogRecord = {
	venue: 'lighter';
	marketId: number;
	venueSymbol: string;
	marketType: 'perp' | 'spot';
	minBaseAmount: string;
	contractMultiplier: string;
	priceDecimals: number;
	sizeDecimals: number;
	lastPrice: number;
	/** Present only when the venue response supplies every canonical routing term. */
	instrument?: InstrumentId;
	tradingAvailability: 'metadataOnly' | 'reviewOnly';
	tradingUnavailableReason: string;
};

/** Venue documentation, deliberately distinct from a Vice order certification. */
export const LIGHTER_CAPABILITIES: VenueCapabilities = assertVenueCapabilities({
	venue: 'lighter',
	products: ['linearPerp', 'spot'],
	orderTypes: ['limit', 'market'],
	supportsHedgeMode: false,
	supportsMarginModes: true,
	supportsAmend: true,
	amendSemantics: 'inPlace',
	supportsClientOrderIds: true,
	supportsNativeAlgorithms: false,
	nativeAlgorithmTypes: [],
	supportsWebSocketOrderEntry: true,
	supportsPrivateStreams: true,
	privateStreamGuarantee: 'authenticatedSnapshot',
	certification: 'reviewOnly'
});

type LighterEnvelope = { code?: unknown; order_book_details?: unknown; spot_order_book_details?: unknown };
type RawMarket = {
	symbol?: unknown;
	market_id?: unknown;
	market_type?: unknown;
	status?: unknown;
	min_base_amount?: unknown;
	multiplier?: unknown;
	price_decimals?: unknown;
	size_decimals?: unknown;
	mark_price?: unknown;
	last_trade_price?: unknown;
};

function requireText(value: unknown, field: string): string {
	if (typeof value !== 'string' || value.trim() !== value || value.length === 0) throw new Error(`Lighter market is missing ${field}`);
	return value;
}

function decimalText(value: unknown, field: string): string {
	const text = requireText(value, field);
	if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(text) || Number(text) <= 0) throw new Error(`Lighter market has invalid ${field}`);
	return text;
}

function exactPositiveNumber(value: unknown, field: string): number {
	const number = typeof value === 'number' ? value : typeof value === 'string' && /^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value) ? Number(value) : NaN;
	if (!Number.isFinite(number) || number <= 0) throw new Error(`Lighter market has invalid ${field}`);
	return number;
}

function decimalPlaces(value: unknown, field: string): number {
	if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 18) throw new Error(`Lighter market has invalid ${field}`);
	return value;
}

function increment(decimals: number): string {
	return decimals === 0 ? '1' : `0.${'0'.repeat(decimals - 1)}1`;
}

function marketPrice(raw: RawMarket): number {
	// Perps publish a mark; spot markets publish a last trade. Never use a
	// missing or zero value as an executable quote.
	return exactPositiveNumber(raw.mark_price ?? raw.last_trade_price, 'mark/last price');
}

function parseMarket(raw: RawMarket, expectedType: 'perp' | 'spot'): LighterCatalogRecord {
	if (raw.market_type !== expectedType || raw.status !== 'active') throw new Error('Lighter market is not active for the requested catalog');
	if (typeof raw.market_id !== 'number' || !Number.isSafeInteger(raw.market_id) || raw.market_id < 0) throw new Error('Lighter market has invalid market_id');
	const marketId = raw.market_id;
	const venueSymbol = requireText(raw.symbol, 'symbol');
	const minBaseAmount = decimalText(raw.min_base_amount, 'min_base_amount');
	const contractMultiplier = decimalText(raw.multiplier, 'multiplier');
	const priceDecimals = decimalPlaces(raw.price_decimals, 'price_decimals');
	const sizeDecimals = decimalPlaces(raw.size_decimals, 'size_decimals');
	const lastPrice = marketPrice(raw);
	if (expectedType === 'perp') {
		// The official endpoint supplies a numeric quote_asset_id for perps but
		// not its asset symbol. Do not assume USDC or create a routable identity.
		return {
			venue: 'lighter', marketId, venueSymbol, marketType: 'perp', minBaseAmount, contractMultiplier,
			priceDecimals, sizeDecimals, lastPrice, tradingAvailability: 'metadataOnly',
			tradingUnavailableReason: 'Lighter perpetual catalog omits a settlement-asset symbol required for canonical routing'
		};
	}
	const [baseAsset, quoteAsset, ...rest] = venueSymbol.split('/');
	if (!baseAsset || !quoteAsset || rest.length !== 0) throw new Error('Lighter spot symbol is not an exact base/quote pair');
	const priceIncrement = increment(priceDecimals);
	const sizeIncrement = increment(sizeDecimals);
	return {
		venue: 'lighter', marketId, venueSymbol, marketType: 'spot', minBaseAmount, contractMultiplier,
		priceDecimals, sizeDecimals, lastPrice,
		instrument: assertInstrumentId({
			instrumentKey: `lighter:spot:${marketId}:${venueSymbol}`,
			venue: 'lighter', venueSymbol, product: 'spot', baseAsset, quoteAsset, settlementAsset: quoteAsset,
			contractMultiplier, priceIncrement, pricePrecision: { kind: 'fixedIncrement', increment: priceIncrement }, sizeIncrement
		}),
		tradingAvailability: 'reviewOnly',
		tradingUnavailableReason: 'Lighter is review-only until its public feed, local signer, reconciliation, and funded lifecycle are certified'
	};
}

async function readCatalog(fetcher: typeof fetch, root: string): Promise<LighterEnvelope> {
	const response = await fetcher(`${root}/api/v1/orderBookDetails`, { headers: { accept: 'application/json' } });
	if (!response.ok) throw new Error(`Lighter public API returned HTTP ${response.status}`);
	const envelope = await response.json() as LighterEnvelope;
	if (envelope.code !== 200 || !Array.isArray(envelope.order_book_details) || !Array.isArray(envelope.spot_order_book_details)) {
		throw new Error('Lighter public API returned an invalid order-book catalog');
	}
	return envelope;
}

/** Read official catalog metadata without exposing a Lighter terminal route or signer. */
export async function fetchLighterCatalog(options: { testnet?: boolean; fetcher?: typeof fetch } = {}): Promise<LighterCatalogRecord[]> {
	const root = options.testnet ? LIGHTER_TESTNET_REST_URL : LIGHTER_MAINNET_REST_URL;
	const catalog = await readCatalog(options.fetcher ?? fetch, root);
	const records: LighterCatalogRecord[] = [];
	for (const raw of catalog.order_book_details as RawMarket[]) {
		try { records.push(parseMarket(raw, 'perp')); } catch { /* Malformed, inactive, or unpriced records remain absent. */ }
	}
	for (const raw of catalog.spot_order_book_details as RawMarket[]) {
		try { records.push(parseMarket(raw, 'spot')); } catch { /* Malformed, inactive, or unpriced records remain absent. */ }
	}
	return records;
}
