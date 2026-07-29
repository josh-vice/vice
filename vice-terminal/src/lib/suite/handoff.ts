import type { MarketDescriptor } from '$lib/types';

export interface SuiteTradeHandoff {
	version: 1;
	venue: 'hyperliquid';
	marketKey: string;
	apiCoin: string;
	kind: MarketDescriptor['kind'];
}

export function createTradeHandoff(market: MarketDescriptor): SuiteTradeHandoff | null {
	if (!market.instrument || market.instrument.venue !== 'hyperliquid' || market.tradingAvailability === 'metadataOnly') return null;
	return { version: 1, venue: 'hyperliquid', marketKey: market.marketKey, apiCoin: market.apiCoin, kind: market.kind };
}

export function encodeTradeHandoff(handoff: SuiteTradeHandoff): string {
	return encodeURIComponent(JSON.stringify(handoff));
}

export function parseTradeHandoff(value: string | null): SuiteTradeHandoff | null {
	if (!value) return null;
	try {
		const parsed: unknown = JSON.parse(decodeURIComponent(value));
		if (!parsed || typeof parsed !== 'object') return null;
		const handoff = parsed as Partial<SuiteTradeHandoff>;
		if (handoff.version !== 1 || handoff.venue !== 'hyperliquid' || typeof handoff.marketKey !== 'string' || typeof handoff.apiCoin !== 'string' || typeof handoff.kind !== 'string') return null;
		if (!handoff.marketKey.startsWith('hyperliquid:') || handoff.marketKey.length > 160 || handoff.apiCoin.trim() !== handoff.apiCoin || handoff.apiCoin.length === 0) return null;
		return handoff as SuiteTradeHandoff;
	} catch {
		return null;
	}
}

export function resolveTradeHandoff(markets: readonly MarketDescriptor[], handoff: SuiteTradeHandoff): MarketDescriptor | null {
	return markets.find((market) =>
		market.marketKey === handoff.marketKey &&
		market.apiCoin === handoff.apiCoin &&
		market.kind === handoff.kind &&
		market.instrument?.venue === handoff.venue &&
		market.tradingAvailability !== 'metadataOnly'
	) ?? null;
}
