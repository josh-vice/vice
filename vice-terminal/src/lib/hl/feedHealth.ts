export const REQUIRED_MARKET_FEEDS = ['mids', 'book', 'trades'] as const;
export type RequiredMarketFeed = (typeof REQUIRED_MARKET_FEEDS)[number];
export const FEED_STALE_THRESHOLD_MS: Record<RequiredMarketFeed, number> = { mids: 15_000, book: 15_000, trades: 60_000 };
export const CONTEXT_STALE_THRESHOLD_MS = 15_000;
export const ALL_MIDS_STALE_THRESHOLD_MS = 15_000;
export type FeedTimestamps = Record<RequiredMarketFeed, number>;
export type FeedStatus = 'connecting' | 'live' | 'recovering' | 'degraded' | 'stale' | 'offline';
export type FeedState<T = unknown, Identity = string> = {
	source: string;
	exactSubscriptionIdentity: Identity;
	epoch: number;
	sourceTimestamp: number;
	receiptTimestamp: number;
	status: FeedStatus;
	updatesPerSecond: number;
	value?: T;
};

export function createFeedState<T, Identity>(input: Omit<FeedState<T, Identity>, 'receiptTimestamp'> & { receiptTimestamp?: number }): FeedState<T, Identity> {
	const receiptTimestamp = input.receiptTimestamp ?? Date.now();
	if (!Number.isFinite(input.sourceTimestamp) || input.sourceTimestamp < 0) throw new Error('feed sourceTimestamp must be finite and non-negative');
	if (!Number.isFinite(receiptTimestamp) || receiptTimestamp < 0) throw new Error('feed receiptTimestamp must be finite and non-negative');
	if (!Number.isSafeInteger(input.epoch) || input.epoch < 0) throw new Error('feed epoch must be a non-negative integer');
	if (!Number.isFinite(input.updatesPerSecond) || input.updatesPerSecond < 0) throw new Error('feed updatesPerSecond must be non-negative');
	return { ...input, receiptTimestamp };
}

export function acceptFeedState<T, Identity>(previous: FeedState<T, Identity> | null, next: FeedState<T, Identity>, sameIdentity: (left: Identity, right: Identity) => boolean = Object.is): boolean {
	if (!next.source || !sameIdentity(previous?.exactSubscriptionIdentity as Identity, next.exactSubscriptionIdentity)) return previous === null;
	if (previous && next.epoch < previous.epoch) return false;
	if (previous && next.epoch === previous.epoch && next.sourceTimestamp < previous.sourceTimestamp) return false;
	if (next.receiptTimestamp < next.sourceTimestamp) return false;
	return true;
}

export function contextIsHealthy(kind: 'perp' | 'spot', lastPerpContextAt: number, lastSpotContextAt: number, now = Date.now()): boolean {
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
