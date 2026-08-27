export const REQUIRED_MARKET_FEEDS = ['mids', 'book', 'trades'] as const;
export type RequiredMarketFeed = (typeof REQUIRED_MARKET_FEEDS)[number];

export const FEED_STALE_THRESHOLD_MS: Record<RequiredMarketFeed, number> = {
	mids: 15_000,
	book: 15_000,
	trades: 60_000
};

export const CONTEXT_STALE_THRESHOLD_MS = 15_000;
export const ALL_MIDS_STALE_THRESHOLD_MS = 15_000;

export type FeedTimestamps = Record<RequiredMarketFeed, number>;

export function contextIsHealthy(kind: 'perp' | 'spot' | 'outcome', lastPerpContextAt: number, lastSpotContextAt: number, now = Date.now()): boolean {
	if (kind === 'outcome') return true;
	const receivedAt = kind === 'spot' ? lastSpotContextAt : lastPerpContextAt;
	return receivedAt > 0 && now - receivedAt <= CONTEXT_STALE_THRESHOLD_MS;
}

export function feedsAreHealthy(currentCoin: string, lastFeedAt: FeedTimestamps, now = Date.now()): boolean {
	return Boolean(currentCoin) && REQUIRED_MARKET_FEEDS.every((feed) => {
		const receivedAt = lastFeedAt[feed];
		return receivedAt > 0 && now - receivedAt <= FEED_STALE_THRESHOLD_MS[feed];
	});
}

export function allMidsAreFresh(receivedAt: number, now = Date.now()): boolean {
	return receivedAt > 0 && now - receivedAt <= ALL_MIDS_STALE_THRESHOLD_MS;
}
