import type { MarketDescriptor } from '$lib/types';
import type { HealthStatus } from '$lib/productionTruth';

export const TRADE_HANDOFF_TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h', '1D'] as const;
export type TradeHandoffTimeframe = typeof TRADE_HANDOFF_TIMEFRAMES[number];

function isTradeHandoffTimeframe(value: unknown): value is TradeHandoffTimeframe {
	return typeof value === 'string' && (TRADE_HANDOFF_TIMEFRAMES as readonly string[]).includes(value);
}

export interface SuiteTradeHandoff {
	version: 1;
	venue: 'hyperliquid';
	marketKey: string;
	apiCoin: string;
	kind: MarketDescriptor['kind'];
	timeframe: TradeHandoffTimeframe;
}

export type TradeHandoffResolution =
	| { state: 'pending' }
	| { state: 'resolved'; market: MarketDescriptor }
	| { state: 'unavailable' };

export function createTradeHandoff(market: MarketDescriptor, timeframe: string): SuiteTradeHandoff | null {
	if (!market.instrument || market.instrument.venue !== 'hyperliquid' || market.tradingAvailability === 'metadataOnly' || !isTradeHandoffTimeframe(timeframe)) return null;
	// The terminal resolves a handoff against its canonical venue-qualified
	// instrument identity (hyperliquid:linearPerp:BTC). The display catalog
	// key (perp:BTC) is not venue-qualified and would fail parseTradeHandoff.
	return { version: 1, venue: 'hyperliquid', marketKey: market.instrument.instrumentKey, apiCoin: market.apiCoin, kind: market.kind, timeframe };
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
		if (handoff.version !== 1 || handoff.venue !== 'hyperliquid' || typeof handoff.marketKey !== 'string' || typeof handoff.apiCoin !== 'string' || typeof handoff.kind !== 'string' || !isTradeHandoffTimeframe(handoff.timeframe)) return null;
		if (!handoff.marketKey.startsWith('hyperliquid:') || handoff.marketKey.length > 160 || handoff.apiCoin.trim() !== handoff.apiCoin || handoff.apiCoin.length === 0) return null;
		return handoff as SuiteTradeHandoff;
	} catch {
		return null;
	}
}

export function resolveTradeHandoff(markets: readonly MarketDescriptor[], handoff: SuiteTradeHandoff): MarketDescriptor | null {
	return markets.find((market) =>
		(market.instrument?.instrumentKey === handoff.marketKey || market.marketKey === handoff.marketKey) &&
		market.apiCoin === handoff.apiCoin &&
		market.kind === handoff.kind &&
		market.instrument?.venue === handoff.venue &&
		market.tradingAvailability !== 'metadataOnly'
	) ?? null;
}

/**
 * A route handoff may arrive before the catalog. Once that catalog has made a
 * terminal decision, missing identity is unavailable rather than a reason to
 * select a lookalike display symbol or wait forever.
 */
export function resolveTradeHandoffState(
	markets: readonly MarketDescriptor[],
	handoff: SuiteTradeHandoff,
	catalogStatus: HealthStatus
): TradeHandoffResolution {
	const market = resolveTradeHandoff(markets, handoff);
	if (market) return { state: 'resolved', market };
	if (catalogStatus === 'live' || catalogStatus === 'degraded' || catalogStatus === 'error') return { state: 'unavailable' };
	return { state: 'pending' };
}
