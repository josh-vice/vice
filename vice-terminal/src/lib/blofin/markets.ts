import type { InstrumentId } from '$lib/venue/identity';

export const BLOFIN_INSTRUMENTS_URL = 'https://openapi.blofin.com/api/v1/market/instruments?instType=SWAP';

export interface BlofinInstrumentRecord {
	instId: string;
	instType: string;
	baseCurrency: string;
	quoteCurrency: string;
	settlementCurrency?: string | null;
	contractValue: string;
	tickSize: string;
	lotSize: string;
	maxLeverage: string;
	state: string;
}

export interface BlofinInstrumentsResponse {
	code: string;
	msg: string;
	data: BlofinInstrumentRecord[];
}

export type BlofinFetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export interface BlofinMarket {
	marketKey: string;
	apiCoin: string;
	kind: 'linearPerp';
	type: 'perp';
	instId: string;
	baseToken: string;
	quoteToken: string;
	settlementToken: string;
	contractMultiplier: string;
	priceIncrement: string;
	sizeIncrement: string;
	maxLeverage: number;
	status: 'live' | 'suspended';
	symbol: string;
	name: string;
	instrument: InstrumentId;
}

function positiveDecimal(value: unknown, field: string): string {
	if (typeof value !== 'string' || !/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value) || Number(value) <= 0) {
		throw new Error(`BloFin instrument has invalid ${field}`);
	}
	return value;
}

function positiveLeverage(value: unknown): number {
	if (typeof value !== 'string' || !/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value) || Number(value) < 1 || !Number.isSafeInteger(Number(value))) {
		throw new Error('BloFin instrument has invalid maxLeverage');
	}
	return Number(value);
}

function assertResponse(response: BlofinInstrumentsResponse): void {
	if (!response || response.code !== '0' || response.msg !== 'success' || !Array.isArray(response.data)) {
		throw new Error('BloFin instruments response was not successful with a data array');
	}
}

function normalizeInstrument(record: BlofinInstrumentRecord): BlofinMarket {
	if (typeof record.instId !== 'string' || !/^[A-Z0-9]+-[A-Z0-9]+$/.test(record.instId)) {
		throw new Error('BloFin instrument has invalid instId');
	}
	const baseToken = record.baseCurrency.trim();
	const quoteToken = record.quoteCurrency.trim();
	const settlementToken = (record.settlementCurrency ?? quoteToken).trim();
	if (!baseToken || !quoteToken || !settlementToken || record.instType !== 'SWAP' || record.state !== 'live') {
		throw new Error('BloFin eligible instrument is missing required live SWAP metadata');
	}
	const contractMultiplier = positiveDecimal(record.contractValue, 'contractValue');
	const priceIncrement = positiveDecimal(record.tickSize, 'tickSize');
	const sizeIncrement = positiveDecimal(record.lotSize, 'lotSize');
	const maxLeverage = positiveLeverage(record.maxLeverage);
	const instrumentKey = `blofin:linearPerp:${record.instId}`;
	const instrument: InstrumentId = {
		instrumentKey,
		venue: 'blofin',
		venueSymbol: record.instId,
		product: 'linearPerp',
		baseAsset: baseToken,
		quoteAsset: quoteToken,
		settlementAsset: settlementToken,
		contractMultiplier,
		priceIncrement,
		pricePrecision: { kind: 'fixedIncrement', increment: priceIncrement },
		sizeIncrement
	};
	return {
		marketKey: instrumentKey,
		apiCoin: record.instId,
		kind: 'linearPerp',
		type: 'perp',
		instId: record.instId,
		baseToken,
		quoteToken,
		settlementToken,
		contractMultiplier,
		priceIncrement,
		sizeIncrement,
		maxLeverage,
		status: 'live',
		symbol: record.instId,
		name: record.instId,
		instrument
	};
}

export function normalizeBlofinInstruments(response: BlofinInstrumentsResponse): BlofinMarket[] {
	assertResponse(response);
	return response.data
		.filter((record) => record.instType === 'SWAP' && record.state === 'live')
		.map(normalizeInstrument);
}

export async function loadBlofinMarkets(input: {
	fetcher?: BlofinFetcher;
	signal?: AbortSignal;
} = {}): Promise<BlofinMarket[]> {
	const fetcher = input.fetcher ?? fetch;
	const response = await fetcher(BLOFIN_INSTRUMENTS_URL, { method: 'GET', signal: input.signal });
	if (!response.ok) throw new Error(`BloFin instruments request failed (${response.status})`);
	return normalizeBlofinInstruments(await response.json() as BlofinInstrumentsResponse);
}
