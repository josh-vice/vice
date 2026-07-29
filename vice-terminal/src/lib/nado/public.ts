import { assertVenueCapabilities, type VenueCapabilities } from '$lib/venue/identity';

/** Official Nado V2 archive origins. This module has no signer or UI route. */
export const NADO_MAINNET_ARCHIVE_URL = 'https://archive.prod.nado.xyz/v2';
export const NADO_TESTNET_ARCHIVE_URL = 'https://archive.test.nado.xyz/v2';

export type NadoCatalogRecord = {
	venue: 'nado';
	productId: number;
	tickerId: string;
	baseAsset: string;
	quoteAsset: string;
	product: 'linearPerp' | 'spot';
	markPrice: number;
	tradingAvailability: 'metadataOnly';
	tradingUnavailableReason: string;
};

/** Public API facts only; no Nado adapter has earned a Vice certification. */
export const NADO_CAPABILITIES: VenueCapabilities = assertVenueCapabilities({
	venue: 'nado',
	products: ['linearPerp', 'spot'],
	orderTypes: [],
	supportsHedgeMode: false,
	supportsMarginModes: false,
	supportsAmend: false,
	amendSemantics: 'none',
	supportsClientOrderIds: false,
	supportsNativeAlgorithms: false,
	nativeAlgorithmTypes: [],
	supportsWebSocketOrderEntry: true,
	supportsPrivateStreams: true,
	privateStreamGuarantee: 'authenticatedDelta',
	certification: 'reviewOnly'
});

type RawContract = {
	product_id?: unknown;
	ticker_id?: unknown;
	base_currency?: unknown;
	quote_currency?: unknown;
	product_type?: unknown;
	mark_price?: unknown;
};

function text(value: unknown, field: string): string {
	if (typeof value !== 'string' || value.trim() !== value || value.length === 0) throw new Error(`Nado contract is missing ${field}`);
	return value;
}

function positiveNumber(value: unknown, field: string): number {
	if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) throw new Error(`Nado contract has invalid ${field}`);
	return value;
}

function parseContract(raw: RawContract): NadoCatalogRecord {
	if (typeof raw.product_id !== 'number' || !Number.isSafeInteger(raw.product_id) || raw.product_id < 0) throw new Error('Nado contract has invalid product_id');
	const product = raw.product_type === 'perpetual' ? 'linearPerp' : raw.product_type === 'spot' ? 'spot' : null;
	if (!product) throw new Error('Nado contract has unsupported product_type');
	return {
		venue: 'nado',
		productId: raw.product_id,
		tickerId: text(raw.ticker_id, 'ticker_id'),
		baseAsset: text(raw.base_currency, 'base_currency'),
		quoteAsset: text(raw.quote_currency, 'quote_currency'),
		product,
		markPrice: positiveNumber(raw.mark_price, 'mark_price'),
		// V2 contracts do not publish the fixed price/size increment or a
		// decimal contract multiplier. Preserve discovery metadata, never route.
		tradingAvailability: 'metadataOnly',
		tradingUnavailableReason: 'Nado V2 contracts omit the price/size increment and contract multiplier required for canonical routing'
	};
}

/** Read only official contract metadata. Malformed or unpriced records stay absent. */
export async function fetchNadoCatalog(options: { testnet?: boolean; fetcher?: typeof fetch } = {}): Promise<NadoCatalogRecord[]> {
	const root = options.testnet ? NADO_TESTNET_ARCHIVE_URL : NADO_MAINNET_ARCHIVE_URL;
	const response = await (options.fetcher ?? fetch)(`${root}/contracts`, { headers: { accept: 'application/json' } });
	if (!response.ok) throw new Error(`Nado public API returned HTTP ${response.status}`);
	const body = await response.json() as unknown;
	if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Nado public API returned an invalid contracts catalog');
	const records: NadoCatalogRecord[] = [];
	for (const raw of Object.values(body as Record<string, unknown>)) {
		try { records.push(parseContract(raw as RawContract)); } catch { /* Never fabricate execution terms. */ }
	}
	return records;
}
