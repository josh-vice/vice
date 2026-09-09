import type { MarketDescriptor } from '$lib/types';

type ChartMarket = Pick<MarketDescriptor, 'kind' | 'marketKey' | 'apiCoin'>;

export function chartIdentity(market: ChartMarket | null): string {
	return market ? `${market.kind}:${market.marketKey}:${market.apiCoin}` : '';
}

export function chartDatasetKey(market: ChartMarket | null, timeframe: string): string {
	return `${market?.kind ?? ''}:${market?.marketKey ?? market?.apiCoin ?? ''}:${timeframe}`;
}

export function marketMatches(market: ChartMarket | null, apiCoin?: string, marketKey?: string): boolean {
	if (!market) return false;
	const hasApiCoin = Boolean(apiCoin);
	const hasMarketKey = Boolean(marketKey);
	if (!hasApiCoin && !hasMarketKey) return false;
	if (hasApiCoin && (!market.apiCoin || apiCoin !== market.apiCoin)) return false;
	if (hasMarketKey && (!market.marketKey || marketKey !== market.marketKey)) return false;
	return true;
}
