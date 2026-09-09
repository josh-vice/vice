import type { ChartCandle } from '$lib/types';

const CACHE_KEY = 'vice.hl.candle-history.v1';
const CACHE_VERSION = 1;
const MAX_ENTRIES = 8;
const MAX_SESSION_ENTRIES = 16;
const MAX_CANDLES = 1_500;
const MAX_AGE_MS = 24 * 60 * 60 * 1_000;

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

type CandleCacheEntry = {
	network: string;
	marketKey: string;
	apiCoin: string;
	interval: string;
	savedAt: number;
	candles: ChartCandle[];
};

type CandleCache = {
	version: number;
	entries: CandleCacheEntry[];
};

type SessionCandleCacheEntry = {
	savedAt: number;
	candles: ChartCandle[];
};

// A session cache avoids reparsing localStorage when a trader cycles through
// markets. It is deliberately separate from the durable cache so a successful
// in-session snapshot remains available even when storage is disabled.
const sessionCandleCache = new Map<string, SessionCandleCacheEntry>();

function cacheIdentity(network: string, marketKey: string, apiCoin: string, interval: string): string {
	return `${network}\u0000${marketKey}\u0000${apiCoin}\u0000${interval}`;
}

function rememberSessionCandleHistory(
	network: string,
	marketKey: string,
	apiCoin: string,
	interval: string,
	candles: ChartCandle[],
	now: number
): void {
	const key = cacheIdentity(network, marketKey, apiCoin, interval);
	sessionCandleCache.delete(key);
	sessionCandleCache.set(key, { savedAt: now, candles: candles.map((candle) => ({ ...candle })) });
	while (sessionCandleCache.size > MAX_SESSION_ENTRIES) sessionCandleCache.delete(sessionCandleCache.keys().next().value!);
}

function browserStorage(): StorageLike | null {
	return typeof localStorage === 'undefined' ? null : localStorage;
}

function validCandle(candle: unknown): candle is ChartCandle {
	if (!candle || typeof candle !== 'object') return false;
	const candidate = candle as Partial<ChartCandle>;
	return (
		Number.isFinite(candidate.time) && Number(candidate.time) > 0 &&
		Number.isFinite(candidate.open) && Number(candidate.open) > 0 &&
		Number.isFinite(candidate.high) && Number(candidate.high) > 0 &&
		Number.isFinite(candidate.low) && Number(candidate.low) > 0 &&
		Number.isFinite(candidate.close) && Number(candidate.close) > 0 &&
		Number.isFinite(candidate.volume) && Number(candidate.volume) >= 0 &&
		Number(candidate.high) >= Math.max(Number(candidate.open), Number(candidate.close), Number(candidate.low)) &&
		Number(candidate.low) <= Math.min(Number(candidate.open), Number(candidate.close), Number(candidate.high))
	);
}

function validCandles(candles: unknown): candles is ChartCandle[] {
	if (!Array.isArray(candles) || candles.length === 0 || candles.length > MAX_CANDLES) return false;
	let previousTime = 0;
	for (const candle of candles) {
		if (!validCandle(candle) || candle.time <= previousTime) return false;
		previousTime = candle.time;
	}
	return true;
}

function readCache(storage: StorageLike): CandleCache {
	try {
		const parsed = JSON.parse(storage.getItem(CACHE_KEY) ?? 'null') as CandleCache | null;
		if (!parsed || parsed.version !== CACHE_VERSION || !Array.isArray(parsed.entries)) {
			return { version: CACHE_VERSION, entries: [] };
		}
		return { version: CACHE_VERSION, entries: parsed.entries.slice(0, MAX_ENTRIES) };
	} catch {
		return { version: CACHE_VERSION, entries: [] };
	}
}

export function loadCachedCandleHistory(
	network: string,
	marketKey: string,
	apiCoin: string,
	interval: string,
	storage: StorageLike | null = browserStorage(),
	now = Date.now()
): ChartCandle[] {
	if (!storage) return [];
	const entry = readCache(storage).entries.find(
		(candidate) =>
			candidate.network === network &&
			candidate.marketKey === marketKey &&
			candidate.apiCoin === apiCoin &&
			candidate.interval === interval
	);
	if (
		!entry ||
		!Number.isFinite(entry.savedAt) ||
		entry.savedAt > now + 60_000 ||
		now - entry.savedAt > MAX_AGE_MS ||
		!validCandles(entry.candles)
	) return [];
	return entry.candles.map((candle) => ({ ...candle }));
}

/** Read the fastest valid history available for a dataset. */
export function loadFastCachedCandleHistory(
	network: string,
	marketKey: string,
	apiCoin: string,
	interval: string,
	storage: StorageLike | null = browserStorage(),
	now = Date.now()
): ChartCandle[] {
	const key = cacheIdentity(network, marketKey, apiCoin, interval);
	const session = sessionCandleCache.get(key);
	if (session && Number.isFinite(session.savedAt) && session.savedAt <= now + 60_000 && now - session.savedAt <= MAX_AGE_MS && validCandles(session.candles)) {
		// Refresh the LRU position without exposing the mutable internal array.
		rememberSessionCandleHistory(network, marketKey, apiCoin, interval, session.candles, session.savedAt);
		return session.candles.map((candle) => ({ ...candle }));
	}
	if (session) sessionCandleCache.delete(key);
	const cached = loadCachedCandleHistory(network, marketKey, apiCoin, interval, storage, now);
	if (cached.length > 0) rememberSessionCandleHistory(network, marketKey, apiCoin, interval, cached, now);
	return cached;
}

export function saveCachedCandleHistory(
	network: string,
	marketKey: string,
	apiCoin: string,
	interval: string,
	candles: ChartCandle[],
	storage: StorageLike | null = browserStorage(),
	now = Date.now()
): void {
	const bounded = candles.slice(-MAX_CANDLES);
	if (!validCandles(bounded)) return;
	rememberSessionCandleHistory(network, marketKey, apiCoin, interval, bounded, now);
	if (!storage) return;
	const cache = readCache(storage);
	const entries = cache.entries.filter(
		(entry) =>
			entry.network !== network ||
			entry.marketKey !== marketKey ||
			entry.apiCoin !== apiCoin ||
			entry.interval !== interval
	);
	entries.unshift({
		network,
		marketKey,
		apiCoin,
		interval,
		savedAt: now,
		candles: bounded.map((candle) => ({ ...candle }))
	});
	try {
		storage.setItem(CACHE_KEY, JSON.stringify({ version: CACHE_VERSION, entries: entries.slice(0, MAX_ENTRIES) }));
	} catch {
		// Public-data caching is an optimization only. Quotas and private browsing
		// must never affect live-feed startup or execution readiness.
	}
}
