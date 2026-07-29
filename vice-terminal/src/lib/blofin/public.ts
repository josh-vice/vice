import { assertInstrumentId, assertVenueCapabilities, type InstrumentId, type VenueCapabilities } from '$lib/venue/identity';

/**
 * Public BloFin futures catalog. This module deliberately has no credential
 * path: a catalog item must carry the venue's exact instId and contract terms
 * before any later account or order adapter may use it.
 */
export const BLOFIN_REST_URL = 'https://openapi.blofin.com';
export const BLOFIN_DEMO_REST_URL = 'https://demo-trading-openapi.blofin.com';

export interface BlofinMarketDescriptor {
	venue: 'blofin';
	instId: string;
	/** Canonical routing identity; `instId` remains the exact BloFin wire value. */
	instrument: InstrumentId;
	baseCurrency: string;
	quoteCurrency: string;
	contractValue: string;
	minSize: string;
	lotSize: string;
	tickSize: string;
	maxLeverage: string;
	contractType: 'linear' | 'inverse';
	assetClass: string;
	lastPrice: number;
	open24h: number;
	volumeContracts24h: number;
	volumeBase24h: number;
}

/** Official venue features, distinct from Vice's certification state. */
export const BLOFIN_CAPABILITIES: VenueCapabilities = assertVenueCapabilities({
	venue: 'blofin',
	products: ['linearPerp', 'inversePerp'],
	orderTypes: ['limit', 'market', 'postOnly', 'ioc', 'fok'],
	supportsHedgeMode: true,
	supportsMarginModes: true,
	supportsAmend: false,
	amendSemantics: 'none',
	supportsClientOrderIds: true,
	supportsNativeAlgorithms: true,
	nativeAlgorithmTypes: ['tpsl', 'trigger'],
	supportsWebSocketOrderEntry: false,
	supportsPrivateStreams: true,
	privateStreamGuarantee: 'authenticatedReconciliation',
	certification: 'reviewOnly'
});

type Envelope<T> = { code?: string; msg?: string; data?: T };

type Instrument = {
	instId?: string;
	baseCurrency?: string;
	quoteCurrency?: string;
	contractValue?: string;
	minSize?: string;
	lotSize?: string;
	tickSize?: string;
	maxLeverage?: string;
	instType?: string;
	contractType?: string;
	state?: string;
	assetClass?: string;
};

type Ticker = {
	instId?: string;
	last?: string;
	open24h?: string;
	vol24h?: string;
	volCurrency24h?: string;
};

function decimal(value: unknown): number | null {
	if (typeof value !== 'string' || !/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value)) return null;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
}

function requireText(value: unknown, field: string): string {
	if (typeof value !== 'string' || value.length === 0) throw new Error(`BloFin instrument is missing ${field}`);
	return value;
}

function requireDecimal(value: unknown, field: string): string {
	const text = requireText(value, field);
	if (decimal(text) === null) throw new Error(`BloFin instrument has invalid ${field}`);
	return text;
}

function blofinInstrumentId(
	instId: string,
	baseCurrency: string,
	quoteCurrency: string,
	contractValue: string,
	lotSize: string,
	tickSize: string,
	contractType: 'linear' | 'inverse'
): InstrumentId {
	return assertInstrumentId({
		instrumentKey: `blofin:${contractType === 'linear' ? 'linearPerp' : 'inversePerp'}:${instId}`,
		venue: 'blofin',
		venueSymbol: instId,
		product: contractType === 'linear' ? 'linearPerp' : 'inversePerp',
		baseAsset: baseCurrency,
		quoteAsset: quoteCurrency,
		settlementAsset: quoteCurrency,
		contractMultiplier: contractValue,
		priceIncrement: tickSize,
		pricePrecision: { kind: 'fixedIncrement', increment: tickSize },
		sizeIncrement: lotSize
	});
}

async function read<T>(fetcher: typeof fetch, url: string): Promise<T> {
	const response = await fetcher(url, { headers: { accept: 'application/json' } });
	if (!response.ok) throw new Error(`BloFin public API returned HTTP ${response.status}`);
	const envelope = await response.json() as Envelope<T>;
	if (envelope.code !== '0' || !envelope.data) throw new Error(`BloFin public API rejected the request: ${envelope.msg ?? envelope.code ?? 'unknown error'}`);
	return envelope.data;
}

/** Read only live SWAP contracts. Suspended, malformed, and unpriced entries stay absent. */
export async function fetchBlofinMarkets(
	options: { demo?: boolean; fetcher?: typeof fetch } = {}
): Promise<BlofinMarketDescriptor[]> {
	const fetcher = options.fetcher ?? fetch;
	const root = options.demo ? BLOFIN_DEMO_REST_URL : BLOFIN_REST_URL;
	const [instruments, tickers] = await Promise.all([
		read<Instrument[]>(fetcher, `${root}/api/v1/market/instruments`),
		read<Ticker[]>(fetcher, `${root}/api/v1/market/tickers`)
	]);
	const tickerByInstrument = new Map(tickers.map((ticker) => [ticker.instId, ticker]));
	const markets: BlofinMarketDescriptor[] = [];
	for (const instrument of instruments) {
		if (instrument.instType !== 'SWAP' || instrument.state !== 'live') continue;
		if (instrument.contractType !== 'linear' && instrument.contractType !== 'inverse') continue;
		const instId = requireText(instrument.instId, 'instId');
		const ticker = tickerByInstrument.get(instId);
		const lastPrice = decimal(ticker?.last);
		const open24h = decimal(ticker?.open24h);
		const volumeContracts24h = decimal(ticker?.vol24h);
		const volumeBase24h = decimal(ticker?.volCurrency24h);
		if (lastPrice === null || open24h === null || volumeContracts24h === null || volumeBase24h === null) continue;
		const baseCurrency = requireText(instrument.baseCurrency, 'baseCurrency');
		const quoteCurrency = requireText(instrument.quoteCurrency, 'quoteCurrency');
		const contractValue = requireDecimal(instrument.contractValue, 'contractValue');
		const minSize = requireDecimal(instrument.minSize, 'minSize');
		const lotSize = requireDecimal(instrument.lotSize, 'lotSize');
		const tickSize = requireDecimal(instrument.tickSize, 'tickSize');
		const maxLeverage = requireDecimal(instrument.maxLeverage, 'maxLeverage');
		markets.push({
			venue: 'blofin',
			instId,
			instrument: blofinInstrumentId(instId, baseCurrency, quoteCurrency, contractValue, lotSize, tickSize, instrument.contractType),
			baseCurrency,
			quoteCurrency,
			contractValue,
			minSize,
			lotSize,
			tickSize,
			maxLeverage,
			contractType: instrument.contractType,
			assetClass: requireText(instrument.assetClass, 'assetClass'),
			lastPrice,
			open24h,
			volumeContracts24h,
			volumeBase24h
		});
	}
	return markets;
}
