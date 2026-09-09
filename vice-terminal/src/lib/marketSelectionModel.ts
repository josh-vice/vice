import type { MarketDescriptor, MarketType } from '$lib/types';
import { marketMatchesWatchlistQuery } from '$lib/marketWatchlist';

type MarketSelectionDescriptor = Pick<MarketDescriptor, 'kind' | 'marketKey' | 'apiCoin'> & Partial<Pick<MarketDescriptor, 'symbol' | 'name' | 'baseToken' | 'quoteToken' | 'dex' | 'venueCategory'>>;

export function marketMatchesType(market: Pick<MarketDescriptor, 'kind'>, type: MarketType): boolean {
	if (type === 'spot') return market.kind === 'spot';
	return market.kind === 'corePerp' || market.kind === 'hip3Perp';
}

export function firstMarketForType<T extends MarketSelectionDescriptor>(markets: T[], type: MarketType, query: string): T | undefined {
	return markets.find((market) => marketMatchesType(market, type) && marketMatchesWatchlistQuery(market as unknown as MarketDescriptor, query));
}
