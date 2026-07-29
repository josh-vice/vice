import type { MarketDescriptor } from './types';

export type MarketMoverDirection = 'gainers' | 'losers';

/**
 * Ranks only canonical, priceable venue descriptors.  This deliberately
 * avoids the legacy broad-market poller: the native widget must not create a
 * second data plane or make a display symbol look executable.
 */
export function topMarketMovers(
	markets: readonly MarketDescriptor[],
	direction: MarketMoverDirection,
	limit: number
): MarketDescriptor[] {
	if (!Number.isInteger(limit) || limit < 1) return [];
	return markets
		.filter((market) => (
			market.kind !== 'outcome'
			&& Number.isFinite(market.lastPrice)
			&& market.lastPrice > 0
			&& Number.isFinite(market.changePercent24h)
		))
		.sort((left, right) => {
			const change = direction === 'gainers'
				? right.changePercent24h - left.changePercent24h
				: left.changePercent24h - right.changePercent24h;
			if (change !== 0) return change;
			const volume = right.volume24h - left.volume24h;
			return volume !== 0 ? volume : left.marketKey.localeCompare(right.marketKey);
		})
		.slice(0, limit);
}
