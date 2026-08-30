import type { ISubscription } from '@nktkas/hyperliquid';
import type { CandleEvent } from '@nktkas/hyperliquid/api/subscription';
import type { MarketDescriptor, OrderBook } from '$lib/types';
import { get } from 'svelte/store';
import {
	orderBook,
	recentTrades,
	selectedMarket,
	marketDataStatus,
	candleDataStatus,
	marketContextStatus,
	marketRegistry,
	perpMarketsList,
	spotMarketsList,
	chartCandles,
	liveCandle,
	chartTimeframe,
	marketCatalogStatus,
	orderPrice,
	priceInputFocused
} from '$lib/stores';
import { closeHlClients, getPublicBookSubscriptionClient, getPublicBookTransport, getPublicSubscriptionClient, getPublicInfoClient, getPublicTransport } from './client';
import { normalizeL2Book, normalizeTrades, normalizeCandle } from './normalize';
import { toHlInterval } from './symbols';
import { dropFeedReceive, markFeedReceive, markFeedReconnect, markStoreCommit } from '$lib/native/performance';
import { createCoreBtcBootstrapMarket, readCachedMarketCatalog, startMarketRegistryRefresh, stopMarketRegistryRefresh } from './markets';
import { hyperliquidPublicNetwork } from './network';
import { applyAllDexPerpContexts, applySpotContexts } from './liveMarketUpdates';
import { mergeCandleSnapshot, mergeTradeIntoCandles } from './candleMerge';
import { bookSigFigs, loadBookDepth, loadBookSigFigs } from '$lib/bookGrouping';
import { startHyperliquidPublicPlane, type PublicPlaneSession } from '$lib/data-plane/hyperliquidPublicPlane';
import { hyperliquidBookEvent } from '$lib/venue/hyperliquid';
import { loadCachedCandleHistory, saveCachedCandleHistory } from './candleCache';
import { ALL_MIDS_STALE_THRESHOLD_MS, CONTEXT_STALE_THRESHOLD_MS, FEED_STALE_THRESHOLD_MS, REQUIRED_MARKET_FEEDS, allMidsAreFresh, contextIsHealthy, feedsAreHealthy, type RequiredMarketFeed, type FeedTimestamps } from './feedHealth';

type ActiveSubs = {
	l2Book?: ISubscription;
	trades?: ISubscription;
	candle?: ISubscription;
	allMids?: ISubscription;
	allDexsAssetCtxs?: ISubscription;
	spotAssetCtxs?: ISubscription;
};

let activeSubs: ActiveSubs = {};
let publicPlane: PublicPlaneSession | null = null;
let currentCoin = '';
let currentTimeframe = '';
let midsSubActive = false;
let marketGeneration = 0;
let marketHealthTimer: ReturnType<typeof setInterval> | null = null;
let marketReconnectTimer: ReturnType<typeof setTimeout> | null = null;
let marketTransportHealthBound = false;
let bookTransportHealthBound = false;
let selectedMarketUnsubscribe: (() => void) | null = null;
let marketSwitchQueue: Promise<void> = Promise.resolve();
let marketSwitchRequest = 0;
let feedLifecycle = 0;
let marketFeedStartedAt = 0;
let indexedRegistry: MarketDescriptor[] | null = null;
let marketByApiCoin = new Map<string, MarketDescriptor>();
const lastMarketFeedAt: FeedTimestamps = {
	mids: 0,
	book: 0,
	trades: 0
};
const lastAllMidByApiCoin = new Map<string, number>();
const ALL_MIDS_CATALOG_CADENCE_MS = 100;
const pendingCatalogQuotes = new Map<string, number>();
let catalogQuoteFlushTimer: ReturnType<typeof setTimeout> | null = null;
let selectedFeedFrameCount = 0;
let catalogUpdateCount = 0;
let catalogQueueDepthMax = 0;

export type AllMidsFanoutTelemetry = {
	selectedFeedFrames: number;
	catalogUpdates: number;
	catalogQueueDepthMax: number;
};

export function getAllMidsFanoutTelemetry(): AllMidsFanoutTelemetry {
	return { selectedFeedFrames: selectedFeedFrameCount, catalogUpdates: catalogUpdateCount, catalogQueueDepthMax: catalogQueueDepthMax };
}

function flushCatalogQuotes(): void {
	catalogQuoteFlushTimer = null;
	if (pendingCatalogQuotes.size === 0) return;
	const markets = get(marketRegistry);
	ensureMarketIndex(markets);
	for (const [apiCoin, price] of pendingCatalogQuotes) {
		const market = marketByApiCoin.get(apiCoin);
		if (!market) continue;
		market.lastPrice = price;
		market.markPrice = price;
	}
	pendingCatalogQuotes.clear();
	catalogUpdateCount += 1;
	marketRegistry.set(markets);
}

function scheduleCatalogQuoteFlush(): void {
	if (catalogQuoteFlushTimer) return;
	catalogQuoteFlushTimer = setTimeout(flushCatalogQuotes, ALL_MIDS_CATALOG_CADENCE_MS);
}
let lastPerpContextAt = 0;
let lastSpotContextAt = 0;

function selectedMarketContextIsHealthy(now = Date.now()): boolean {
	const selected = get(selectedMarket);
	if (!selected) return false;
	const kind = selected.kind === 'spot' ? 'spot' : 'perp';
	return contextIsHealthy(kind, lastPerpContextAt, lastSpotContextAt, now);
}

function markMarketContextAlive(kind: 'perp' | 'spot'): void {
	if (kind === 'spot') lastSpotContextAt = Date.now();
	else lastPerpContextAt = Date.now();
	if ((get(marketContextStatus) === 'stale' || get(marketContextStatus) === 'connecting') && selectedMarketContextIsHealthy()) {
		marketContextStatus.set('live');
	}
}

const MAX_TRADES = 50;
const STARTUP_HTTP_TIMEOUT_MS = 4_000;

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
	let timer: ReturnType<typeof setTimeout> | undefined;
	try {
		return await Promise.race([
			promise,
			new Promise<T>((_, reject) => {
				timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
			})
		]);
	} finally {
		if (timer) clearTimeout(timer);
	}
}

function ensureMarketIndex(markets: MarketDescriptor[]): void {
	if (markets === indexedRegistry) return;
	marketByApiCoin = new Map(markets.map((market) => [market.apiCoin, market]));
	indexedRegistry = markets;
}

function markMarketFeedAlive(feed: RequiredMarketFeed): void {
	lastMarketFeedAt[feed] = Date.now();
	if ((get(marketDataStatus) === 'stale' || get(marketDataStatus) === 'connecting') && selectedMarketFeedsAreHealthy()) {
		marketDataStatus.set('live');
	}
}

function selectedMarketFeedsAreHealthy(now = Date.now()): boolean {
	return feedsAreHealthy(currentCoin, lastMarketFeedAt, now);
}

/** Exact all-mids freshness for pair triggers. It intentionally does not use
 * a display symbol or a cached chart value. */
export function exactAllMidIsLive(apiCoin: string, now = Date.now()): boolean {
	const receivedAt = lastAllMidByApiCoin.get(apiCoin) ?? 0;
	return get(marketDataStatus) === 'live' && allMidsAreFresh(receivedAt, now);
}

function startMarketHealthWatchdog(): void {
	if (marketHealthTimer) return;
	marketHealthTimer = setInterval(() => {
		const healthy = selectedMarketFeedsAreHealthy();
		const contextHealthy = selectedMarketContextIsHealthy();
		if (!healthy && get(marketDataStatus) === 'live') {
			marketDataStatus.set('stale');
			scheduleMarketRecovery();
		} else if (!healthy && get(marketDataStatus) === 'connecting' && marketFeedStartedAt > 0 && Date.now() - marketFeedStartedAt > 8_000) {
			// A socket can remain open while a subscription silently stops
			// delivering frames. Do not leave the terminal permanently stuck on
			// "connecting"; force the same serialized recovery used for close/
			// abort events after a bounded startup window.
			marketDataStatus.set('stale');
			scheduleMarketRecovery();
		} else if (healthy && get(marketDataStatus) === 'stale') {
			marketDataStatus.set('live');
		}
		if (!contextHealthy && get(marketContextStatus) === 'live') marketContextStatus.set('stale');
		else if (contextHealthy && (get(marketContextStatus) === 'stale' || get(marketContextStatus) === 'connecting')) marketContextStatus.set('live');
		if (!candleStreamHealthy() && get(candleDataStatus) === 'live') candleDataStatus.set('stale');
	}, 2_500);
}

async function unsubscribeAll(): Promise<void> {
	publicPlane?.stop();
	publicPlane = null;
	for (const sub of Object.values(activeSubs)) {
		try {
			await sub?.unsubscribe();
		} catch {
			/* ignore */
		}
	}
	activeSubs = {};
}

function scheduleMarketRecovery(): void {
	if (!currentCoin || marketReconnectTimer) return;
	marketReconnectTimer = setTimeout(() => {
		marketReconnectTimer = null;
		void recoverMarketFeeds().catch((error) => {
			console.warn('[hl] market feed recovery failed; waiting for the next socket event:', error);
		});
	}, 250);
}

async function recoverMarketFeeds(): Promise<void> {
	markFeedReconnect();
	const coin = currentCoin;
	const timeframe = currentTimeframe;
	if (!coin || !timeframe) return;
	await unsubscribeAll();
	// Force subscribeMarket through its reconnect path while retaining the
	// existing HTTP baseline and chart state until a new stream is live.
		currentCoin = '';
		currentTimeframe = '';
		midsSubActive = false;
	for (const feed of REQUIRED_MARKET_FEEDS) lastMarketFeedAt[feed] = 0;
	lastPerpContextAt = 0;
	lastSpotContextAt = 0;
	marketContextStatus.set('connecting');
	await subscribeAllMids();
	await subscribeMarket(coin, timeframe);
}

function bindMarketTransportHealth(): void {
	if (!marketTransportHealthBound) {
		bindMarketSocketHealth(getPublicTransport().socket, feedLifecycle);
		marketTransportHealthBound = true;
	}
	if (!bookTransportHealthBound) {
		bindMarketSocketHealth(getPublicBookTransport().socket, feedLifecycle);
		bookTransportHealthBound = true;
	}
}

/** Both public sockets fail closed through the same serialized recovery path. */
function bindMarketSocketHealth(socket: EventTarget, lifecycle: number): void {
	socket.addEventListener('close', () => {
		if (lifecycle !== feedLifecycle) return;
		if (!currentCoin) return;
		marketDataStatus.set('stale');
		candleDataStatus.set('stale');
		scheduleMarketRecovery();
	});
	socket.addEventListener('open', () => {
		if (lifecycle !== feedLifecycle) return;
		if (!currentCoin) return;
		marketDataStatus.set('connecting');
		scheduleMarketRecovery();
	});
}

const INTERVAL_MS: Record<string, number> = {
	'1m': 60_000,
	'5m': 5 * 60_000,
	'15m': 15 * 60_000,
	'1h': 60 * 60_000,
	'4h': 4 * 60 * 60_000,
	'1D': 24 * 60 * 60_000,
	'1d': 24 * 60 * 60_000,
	'1W': 7 * 24 * 60 * 60_000,
	'1w': 7 * 24 * 60 * 60_000
};

const CANDLE_STALE_MS = 10_000;
let lastCandleEventAt = 0;

/** Whether the authoritative candle stream has delivered recently enough that
 * the trade-derived fallback should stay out of its way. */
function candleStreamHealthy(): boolean {
	return lastCandleEventAt > 0 && Date.now() - lastCandleEventAt <= CANDLE_STALE_MS;
}

function markCandleFeedAlive(): void {
	if (get(candleDataStatus) === 'stale' || get(candleDataStatus) === 'connecting') candleDataStatus.set('live');
}

let pendingBook: ReturnType<typeof hyperliquidBookEvent> | null = null;
let pendingBookGeneration = -1;
let pendingBookEpoch = -1;
let bookCommitScheduled = false;
let bookSubscriptionEpoch = 0;
let bookEventOrdinal = 0;
/** A late HTTP baseline must never overwrite an accepted live L2 frame. */
let liveBookFrameEpoch = -1;
let pendingBookSequences: number[] = [];

/**
 * Coalesce potentially several L2 book frames arriving within one animation
 * frame into a single store commit, mirroring the chart overlay's rAF
 * coalescing so the order book never re-renders faster than the display can
 * paint. A stale batch (superseded by a market switch before its frame fires)
 * is dropped without recording a store-commit latency sample, since no real
 * commit happened for it.
 */
function scheduleBookCommit(generation: number, epoch: number): void {
	pendingBookGeneration = generation;
	pendingBookEpoch = epoch;
	if (bookCommitScheduled || typeof requestAnimationFrame === 'undefined') return;
	bookCommitScheduled = true;
	requestAnimationFrame(() => {
		bookCommitScheduled = false;
		const sequences = pendingBookSequences;
		pendingBookSequences = [];
		if (pendingBook && pendingBookGeneration === marketGeneration && pendingBookEpoch === bookSubscriptionEpoch) {
			orderBook.set(pendingBook.payload);
			for (const sequence of sequences) markStoreCommit('book', sequence);
		} else {
			for (const sequence of sequences) dropFeedReceive('book', sequence);
		}
		pendingBook = null;
	});
}

function canonicalBookEvent(book: OrderBook, generation: number, subscriptionEpoch: number, eventTimeMs?: number, eventSequence = ++bookEventOrdinal): ReturnType<typeof hyperliquidBookEvent> {
	const market = get(marketRegistry).find((candidate) => candidate.apiCoin === currentCoin);
	if (!market) throw new Error(`Hyperliquid book event market identity is unavailable: ${currentCoin}`);
	// The grouping is captured at commit time because a grouping change tears
	// down and rebuilds the book subscription with a fresh epoch; a frame from
	// the old grouping is dropped by the epoch check before reaching here.
	return hyperliquidBookEvent(market, book, get(bookSigFigs), generation, subscriptionEpoch, eventSequence, Date.now(), eventTimeMs);
}


/**
 * chartCandles holds only committed (closed) bars; the in-progress bar lives
 * in liveCandle. A tick that stays within the current bar only replaces that
 * one small object. A tick that crosses a bar boundary commits the
 * just-finished bar to history with a single O(1) append, so the 1500-bar
 * array is copied once per bar close instead of once per tick.
 */
function upsertCandle(candle: ReturnType<typeof normalizeCandle>, generation: number): void {
	if (generation !== marketGeneration) return;
	lastCandleEventAt = Date.now();
	markCandleFeedAlive();
	const previous = get(liveCandle);
	if (!previous || candle.time > previous.time) {
		if (previous) chartCandles.update((existing) => [...existing, previous]);
		liveCandle.set(candle);
		return;
	}
	if (candle.time === previous.time) {
		liveCandle.set(candle);
		return;
	}
	// Out-of-order/backfill correction against already-committed history.
	chartCandles.update((existing) => {
		const index = existing.findIndex((item) => item.time === candle.time);
		if (index < 0) return [...existing, candle].sort((a, b) => a.time - b.time);
		const updated = [...existing];
		updated[index] = candle;
		return updated;
	});
}

/**
 * Keep the chart visibly live even when Hyperliquid's candle history endpoint
 * is temporarily rate-limited. This is not synthetic market data: the candle
 * is an OHLCV aggregation of the authenticated public trade stream and is
 * replaced/merged by the authoritative candle snapshot whenever it arrives.
 * Operates on the single in-progress candle rather than the full history, and
 * is only fed live trade flow while the authoritative candle stream is absent
 * or stale so a healthy candle stream is never redundantly double-updated.
 */
function upsertTradeCandle(trade: { price: number; size: number; timestamp: number }, generation: number): void {
	if (generation !== marketGeneration || !Number.isFinite(trade.price) || trade.price <= 0) return;
	const intervalMs = INTERVAL_MS[currentTimeframe] ?? 60 * 60_000;
	const previous = get(liveCandle);
	const merged = mergeTradeIntoCandles(previous ? [previous] : [], trade, intervalMs);
	if (merged.length === 0) return;
	if (merged.length > 1) {
		chartCandles.update((existing) => [...existing, merged[0]]);
	}
	const next = merged[merged.length - 1];
	if (next !== previous) liveCandle.set(next);
}

async function loadCandleHistory(coin: string, interval: string, generation: number): Promise<void> {
	try {
		const endTime = Date.now();
		const intervalMs = INTERVAL_MS[interval] ?? 60 * 60_000;
		const startTime = endTime - intervalMs * 1_500;
		const data = await getPublicInfoClient().candleSnapshot({
			coin,
			interval: toHlInterval(interval),
			startTime,
			endTime
		});
		const candles = data.map((c) =>
			normalizeCandle({
				t: c.t,
				T: c.T,
				s: c.s,
				i: c.i,
				o: c.o,
				c: c.c,
				h: c.h,
				l: c.l,
				v: c.v,
				n: c.n
			} as CandleEvent)
		);
		const marketKey = get(marketRegistry).find((market) => market.apiCoin === coin)?.marketKey;
		if (
			generation !== marketGeneration ||
			coin !== currentCoin ||
			interval !== currentTimeframe ||
			!marketKey
		) {
			return;
		}
		const inProgress = get(liveCandle);
		const liveDuringFlight = inProgress ? [...get(chartCandles), inProgress] : get(chartCandles);
		const merged = mergeCandleSnapshot(candles, liveDuringFlight);
		if (merged.length === 0) return;
		// The REST snapshot is the authoritative history baseline. Keep the
		// in-progress bar separate so lightweight-charts receives all committed
		// bars immediately instead of only the final candle.
		chartCandles.set(merged.slice(0, -1));
		liveCandle.set(merged[merged.length - 1]);
		saveCachedCandleHistory(hyperliquidPublicNetwork.network, marketKey, coin, interval, merged);
	} catch (e) {
		console.warn('[hl] candle snapshot failed:', e);
	}
}

function renderCachedCandleHistory(coin: string, interval: string): boolean {
	const marketKey = get(marketRegistry).find((market) => market.apiCoin === coin)?.marketKey;
	if (!marketKey) return false;
	const cached = loadCachedCandleHistory(hyperliquidPublicNetwork.network, marketKey, coin, interval);
	if (cached.length === 0) return false;
	chartCandles.set(cached.slice(0, -1));
	liveCandle.set(cached[cached.length - 1]);
	return true;
}

function hydrateCachedCandleHistory(coin: string, interval: string, generation: number): void {
	if (
		generation !== marketGeneration ||
		coin !== currentCoin ||
		interval !== currentTimeframe
	) return;
	renderCachedCandleHistory(coin, interval);
}

async function loadMarketSnapshots(coin: string, generation: number, bookEpoch: number): Promise<boolean> {
	const client = getPublicInfoClient();
	let loaded = false;
	const [book, trades] = await withTimeout(
		Promise.allSettled([
			client.l2Book({ coin, nSigFigs: get(bookSigFigs) }),
			client.recentTrades({ coin })
		]),
		STARTUP_HTTP_TIMEOUT_MS,
		'public market snapshot'
	);
	if (book.status === 'fulfilled' && book.value) {
		const normalizedBook = normalizeL2Book(book.value);
		if (normalizedBook) {
			// HTTP is only a stale baseline. Once the socket has supplied a valid
			// frame for this subscription, never let a slower HTTP response replace it.
			if (generation === marketGeneration && bookEpoch === bookSubscriptionEpoch && liveBookFrameEpoch !== bookEpoch) {
				try {
					orderBook.set(canonicalBookEvent(normalizedBook, generation, bookEpoch, book.value.time).payload);
					markMarketFeedAlive('book');
					loaded = true;
				} catch (error) {
					console.warn('[hl] canonical book snapshot rejected:', error);
				}
			}
		} else console.warn('[hl] order book snapshot was malformed or crossed');
	}
	if (trades.status === 'fulfilled') {
		const normalizedTrades = normalizeTrades(trades.value).slice(0, MAX_TRADES);
		recentTrades.set(normalizedTrades);
		for (const trade of [...normalizedTrades].reverse()) upsertTradeCandle(trade, generation);
		markMarketFeedAlive('trades');
		loaded = true;
	}
	if (book.status === 'rejected') console.warn('[hl] order book snapshot failed:', book.reason);
	if (trades.status === 'rejected') console.warn('[hl] recent trades snapshot failed:', trades.reason);
	return loaded;
}

function requireRegisteredApiCoin(apiCoin: string): string {
	const descriptor = get(marketRegistry).find((market) => market.apiCoin === apiCoin);
	if (!descriptor) {
		throw new Error(`Hyperliquid market identity is not registered: ${apiCoin}`);
	}
	return descriptor.apiCoin;
}

async function subscribeMarketNow(apiCoin: string, timeframe?: string): Promise<void> {
	const coin = requireRegisteredApiCoin(apiCoin);
	const tf = timeframe ?? get(chartTimeframe);

	if (coin === currentCoin && tf === currentTimeframe) return;

	const client = getPublicSubscriptionClient();
	const bookClient = getPublicBookSubscriptionClient();

	if (coin !== currentCoin) {
		await unsubscribeMarketFeeds();
		const generation = ++marketGeneration;
		currentCoin = coin;
		currentTimeframe = tf;
		marketFeedStartedAt = Date.now();
		chartCandles.set([]);
		liveCandle.set(null);
		hydrateCachedCandleHistory(coin, tf, generation);
		lastCandleEventAt = 0;
		candleDataStatus.set('connecting');
		recentTrades.set([]);
		orderBook.set({ bids: [], asks: [], spread: 0, spreadPercent: 0 });
		marketDataStatus.set('connecting');

		let snapshotLoaded = false;
		try {
			// Start the low-latency socket subscriptions before waiting on HTTP.
			// A rate-limited or stalled REST snapshot must not prevent live frames
			// from reaching the terminal.
			const bookEpoch = ++bookSubscriptionEpoch;
			liveBookFrameEpoch = -1;
			const candleHistoryPromise = withTimeout(
				loadCandleHistory(coin, tf, generation),
				STARTUP_HTTP_TIMEOUT_MS,
				'candle history'
			).catch((error) => {
				console.warn('[hl] candle history delayed; continuing with cached history and live trades:', error);
			});
			const snapshotPromise = loadMarketSnapshots(coin, generation, bookEpoch).catch((error) => {
				console.warn('[hl] public market snapshot failed; continuing with websocket feeds:', error);
				return false;
			});
			publicPlane?.setTrades(coin);
			publicPlane?.setCandle(coin, toHlInterval(tf));
			const bookSubscriptionPromise = bookClient.l2Book({ coin, nSigFigs: get(bookSigFigs) }, (data) => {
				if (bookEpoch !== bookSubscriptionEpoch) return;
				const normalizedBook = normalizeL2Book(data);
				if (!normalizedBook) {
					marketDataStatus.set('stale');
					scheduleMarketRecovery();
					return;
				}
				const sequence = ++bookEventOrdinal;
				markFeedReceive('book', sequence);
				markMarketFeedAlive('book');
				try {
					pendingBook = canonicalBookEvent(normalizedBook, generation, bookEpoch, data.time, sequence);
					liveBookFrameEpoch = bookEpoch;
				} catch (error) {
					dropFeedReceive('book', sequence);
					console.warn('[hl] canonical book event rejected:', error);
					marketDataStatus.set('stale');
					scheduleMarketRecovery();
					return;
				}
				pendingBookSequences.push(sequence);
				scheduleBookCommit(generation, bookEpoch);
			});
			// Candle history owns the largest visible surface. Do not place it behind
			// a separate order-book socket handshake; both startup paths run now.
			await candleHistoryPromise;
			activeSubs.l2Book = await bookSubscriptionPromise;
			activeSubs.l2Book.failureSignal.addEventListener('abort', scheduleMarketRecovery, { once: true });
			snapshotLoaded = await snapshotPromise;
			// Creating subscriptions is not evidence that data is flowing. Do not
			// promote the UI to live until all required selected-market feeds have
			// actually delivered a recent frame (or retain an explicitly stale HTTP
			// baseline while the socket catches up).
			marketDataStatus.set(
				selectedMarketFeedsAreHealthy() ? 'live' : snapshotLoaded ? 'stale' : 'connecting'
			);
		} catch (e) {
			console.error('[hl] subscription failed:', e);
			// Keep a truthful HTTP baseline visible during a socket outage. The
			// watchdog marks it stale until the low-latency stream recovers. Do not
			// discard trade-derived candles when only the candle stream failed: the
			// book/trades subscriptions are authoritative enough to keep a live,
			// visibly updating OHLC fallback on screen.
			if (!snapshotLoaded) {
				orderBook.set({ bids: [], asks: [], spread: 0, spreadPercent: 0 });
				recentTrades.set([]);
			}
			marketDataStatus.set(snapshotLoaded || get(chartCandles).length > 0 ? 'stale' : 'error');
		}
	} else {
		const generation = ++marketGeneration;
		currentTimeframe = tf;
		chartCandles.set([]);
		liveCandle.set(null);
		hydrateCachedCandleHistory(coin, tf, generation);
		lastCandleEventAt = 0;
		candleDataStatus.set('connecting');

		publicPlane?.setCandle(coin, toHlInterval(tf));
		await loadCandleHistory(coin, tf, generation);
	}
}

/** Serialize rapid market/timeframe changes so stale teardown cannot detach the
 * newer subscription. A stop/start lifecycle invalidates queued work. */
export function subscribeMarket(apiCoin: string, timeframe?: string): Promise<void> {
	const request = ++marketSwitchRequest;
	const lifecycle = feedLifecycle;
	const run = marketSwitchQueue.then(async () => {
		if (lifecycle !== feedLifecycle || request < marketSwitchRequest) return;
		await subscribeMarketNow(apiCoin, timeframe);
	});
	marketSwitchQueue = run.catch(() => undefined);
	return run;
}

/** Rebuild only the selected book; all trade and chart subscriptions stay live. */
export function resubscribeOrderBook(apiCoin: string): Promise<void> {
	const lifecycle = feedLifecycle;
	const run = marketSwitchQueue.then(async () => {
		if (lifecycle !== feedLifecycle || apiCoin !== currentCoin) return;
		const coin = requireRegisteredApiCoin(apiCoin);
		try { await activeSubs.l2Book?.unsubscribe(); } catch { /* ignore */ }
		activeSubs.l2Book = undefined;
		const bookEpoch = ++bookSubscriptionEpoch;
		liveBookFrameEpoch = -1;
		pendingBook = null;
		pendingBookSequences = [];
		orderBook.set({ bids: [], asks: [], spread: 0, spreadPercent: 0 });
		lastMarketFeedAt.book = 0;
		marketDataStatus.set('connecting');
		const generation = marketGeneration;
		activeSubs.l2Book = await getPublicBookSubscriptionClient().l2Book({ coin, nSigFigs: get(bookSigFigs) }, (data) => {
			if (generation !== marketGeneration || bookEpoch !== bookSubscriptionEpoch) return;
			const normalizedBook = normalizeL2Book(data);
			if (!normalizedBook) {
				marketDataStatus.set('stale');
				scheduleMarketRecovery();
				return;
			}
			const sequence = ++bookEventOrdinal;
			markFeedReceive('book', sequence);
			markMarketFeedAlive('book');
			try {
				pendingBook = canonicalBookEvent(normalizedBook, generation, bookEpoch, data.time, sequence);
				liveBookFrameEpoch = bookEpoch;
			} catch (error) {
				dropFeedReceive('book', sequence);
				console.warn('[hl] canonical book event rejected:', error);
				marketDataStatus.set('stale');
				scheduleMarketRecovery();
				return;
			}
			pendingBookSequences.push(sequence);
			scheduleBookCommit(generation, bookEpoch);
		});
		activeSubs.l2Book.failureSignal.addEventListener('abort', scheduleMarketRecovery, { once: true });
	});
	marketSwitchQueue = run.catch(() => undefined);
	return run;
}

async function unsubscribeMarketFeeds(): Promise<void> {
	publicPlane?.setTrades();
	publicPlane?.setCandle();
	for (const key of ['l2Book', 'trades', 'candle'] as const) {
		try {
			await activeSubs[key]?.unsubscribe();
		} catch {
			/* ignore */
		}
		activeSubs[key] = undefined;
	}
}

export async function subscribeAllMids(): Promise<void> {
	if (midsSubActive) return;
	const client = getPublicSubscriptionClient();

	try {
		publicPlane = startHyperliquidPublicPlane(hyperliquidPublicNetwork.network, (event) => {
			if (event.type === 'status') {
			if (event.status === 'error' || event.status === 'closed') {
				marketDataStatus.set('stale');
				candleDataStatus.set('stale');
				scheduleMarketRecovery();
				}
				return;
			}
			if (event.type === 'trades') {
				if (event.coin !== currentCoin) return;
				markFeedReceive('trades', event.sequence, event.receivedAtMonoMs);
				markMarketFeedAlive('trades');
				const trades = event.trades;
				recentTrades.set(trades.slice(0, MAX_TRADES));
				if (!candleStreamHealthy()) {
					for (const trade of trades) upsertTradeCandle(trade, marketGeneration);
				}
				markStoreCommit('trades', event.sequence);
				return;
			}
			if (event.type === 'candle') {
				if (event.coin !== currentCoin || event.interval !== toHlInterval(currentTimeframe)) return;
				markFeedReceive('candle', event.sequence, event.receivedAtMonoMs);
				markMarketFeedAlive('trades');
				upsertCandle(event.candle, marketGeneration);
				markStoreCommit('candle', event.sequence);
				return;
			}
			markFeedReceive('allMids', event.sequence, event.receivedAtMonoMs);
			markMarketFeedAlive('mids');
			const markets = get(marketRegistry);
			ensureMarketIndex(markets);
			const selected = get(selectedMarket);
			const selectedMid = selected?.apiCoin ? event.mids[selected.apiCoin] : undefined;
			const selectedPrice = selectedMid === undefined ? Number.NaN : parseFloat(selectedMid);
			const previousSelectedPrice = selected?.lastPrice;
			const selectedUpdate = Number.isFinite(selectedPrice) && selectedPrice > 0;
			if (selectedUpdate) selectedFeedFrameCount += 1;
			// The venue sends all mids in one frame. Indexing by the exact API coin
			// keeps this hot path linear in the received frame. Only the selected
			// market is updated synchronously; catalog quotes are coalesced below.
			for (const [apiCoin, mid] of Object.entries(event.mids)) {
				const price = parseFloat(mid);
				if (!Number.isFinite(price) || price <= 0) continue;
				const market = marketByApiCoin.get(apiCoin);
				if (!market) continue;
				market.lastPrice = price;
				market.markPrice = price;
				lastAllMidByApiCoin.set(apiCoin, event.receivedAtMs);
				if (selected?.apiCoin !== apiCoin) pendingCatalogQuotes.set(apiCoin, price);
			}
			catalogQueueDepthMax = Math.max(catalogQueueDepthMax, pendingCatalogQuotes.size);
			if (pendingCatalogQuotes.size > 0) scheduleCatalogQuoteFlush();
			if (pendingCatalogQuotes.size > 0 || selectedUpdate) markStoreCommit('allMids', event.sequence);

			if (selected && selectedUpdate) {
				const price = selectedPrice;
				selectedMarket.update((market) => market ? { ...market, lastPrice: price, markPrice: price } : market);
				// Bootstrap identities intentionally start at zero. Keep the
				// ticket actionable as soon as the live mid arrives, while never
				// overwriting a price the trader has focused or edited.
				const currentOrderPrice = get(orderPrice);
				if (
					!get(priceInputFocused) &&
					(currentOrderPrice === null || currentOrderPrice === 0 || currentOrderPrice === previousSelectedPrice)
				) {
					orderPrice.set(price);
				}
			}
		});

		activeSubs.allDexsAssetCtxs = await client.allDexsAssetCtxs((data) => {
			const selected = get(selectedMarket);
			if (selected?.kind === 'corePerp' || selected?.kind === 'hip3Perp') markMarketContextAlive('perp');
			marketRegistry.update((markets) => applyAllDexPerpContexts(markets, data.ctxs));
			if (selected) {
				const updated = get(marketRegistry).find((market) => market.marketKey === selected.marketKey);
				if (updated) selectedMarket.set(updated);
			}
		});
		activeSubs.allDexsAssetCtxs.failureSignal.addEventListener('abort', () => {
			marketContextStatus.set('stale');
			scheduleMarketRecovery();
		}, { once: true });

		activeSubs.spotAssetCtxs = await client.spotAssetCtxs((data) => {
			const selected = get(selectedMarket);
			if (selected?.kind === 'spot') markMarketContextAlive('spot');
			marketRegistry.update((markets) => applySpotContexts(markets, data));
			if (selected?.kind === 'spot') {
				const updated = get(marketRegistry).find((market) => market.marketKey === selected.marketKey);
				if (updated) selectedMarket.set(updated);
			}
		});
		activeSubs.spotAssetCtxs.failureSignal.addEventListener('abort', () => {
			marketContextStatus.set('stale');
			scheduleMarketRecovery();
		}, { once: true });
		midsSubActive = true;
	} catch (e) {
		console.error('[hl] allMids subscription failed:', e);
	}
}

export async function startHlFeeds(initialCoin?: string): Promise<void> {
	loadBookSigFigs();
	loadBookDepth();
	feedLifecycle += 1;
	marketDataStatus.set('connecting');
	candleDataStatus.set('connecting');
	marketContextStatus.set('connecting');
	startMarketHealthWatchdog();
	bindMarketTransportHealth();
	try {
		// Establish the selected BTC identity and its critical feeds before any
		// broad catalog HTTP enrichment. Hyperliquid shares one Info rate-limit
		// bucket; letting HIP-3 discovery win that race visibly starves chart and
		// book startup.
		const cachedMarkets = get(marketRegistry).length === 0 ? readCachedMarketCatalog() : [];
		const markets = get(marketRegistry).length > 0
			? get(marketRegistry)
			: cachedMarkets.length > 0
				? cachedMarkets
				: [createCoreBtcBootstrapMarket()];
		if (get(marketRegistry).length === 0) {
			marketRegistry.set(markets);
			perpMarketsList.set(markets.filter((market) => market.kind === 'corePerp' || market.kind === 'hip3Perp'));
			spotMarketsList.set(markets.filter((market) => market.kind === 'spot'));
			if (!get(selectedMarket) && markets[0]) selectedMarket.set(markets[0]);
		}
		const selected = get(selectedMarket);
		const coin = selected?.apiCoin ?? markets.find((market) => market.marketKey === 'perp:BTC')?.apiCoin ?? initialCoin;
		if (!coin) throw new Error('No exact Hyperliquid market identity is available');
		// Render validated public history before the first network await. It stays
		// explicitly non-live until the current session's feeds and snapshot prove
		// freshness, but a returning trader never waits on socket setup to see a chart.
		renderCachedCandleHistory(coin, get(chartTimeframe));
		// Open the public-plane socket immediately, but do not make the selected
		// market wait for all-mids/context subscription acknowledgements. The
		// plane is created synchronously before subscribeMarket reaches its first
		// await, so candle/trade forwarding remains available to that path.
		const allMidsPromise = subscribeAllMids().catch((error) => {
			console.error('[hl] all-mids subscription failed:', error);
		});
		await subscribeMarket(coin);
		await allMidsPromise;
		// Catalog expansion is useful but not part of the selected-market critical
		// path. It starts only after chart/book/trades have had first access to the
		// shared venue request budget.
		startMarketRegistryRefresh();
		selectedMarketUnsubscribe?.();
		selectedMarketUnsubscribe = selectedMarket.subscribe((market) => {
			if (!market || !currentCoin || market.apiCoin === currentCoin) return;
			void subscribeMarket(market.apiCoin, get(chartTimeframe)).catch((error) => {
				console.error('[hl] selected market feed switch failed:', error);
				marketDataStatus.set('error');
			});
		});
	} catch (error) {
		marketDataStatus.set('error');
		throw error;
	}
}


export async function stopHlFeeds(): Promise<void> {
	feedLifecycle += 1;
	selectedMarketUnsubscribe?.();
	selectedMarketUnsubscribe = null;
	if (marketReconnectTimer) clearTimeout(marketReconnectTimer);
	marketReconnectTimer = null;
	if (catalogQuoteFlushTimer) clearTimeout(catalogQuoteFlushTimer);
	catalogQuoteFlushTimer = null;
	pendingCatalogQuotes.clear();
	// Clear selection before closing transports. A close event from an old
	// generation must never schedule recovery for a stopped or newly started
	// feed lifecycle.
	currentCoin = '';
	currentTimeframe = '';
	await unsubscribeAll();
	await closeHlClients();
	marketTransportHealthBound = false;
	bookTransportHealthBound = false;
	pendingBookSequences = [];
	stopMarketRegistryRefresh();
	++marketGeneration;
	marketFeedStartedAt = 0;
	midsSubActive = false;
	if (marketHealthTimer) clearInterval(marketHealthTimer);
	marketHealthTimer = null;
	for (const feed of REQUIRED_MARKET_FEEDS) lastMarketFeedAt[feed] = 0;
	lastAllMidByApiCoin.clear();
	lastPerpContextAt = 0;
	lastSpotContextAt = 0;
	orderBook.set({ bids: [], asks: [], spread: 0, spreadPercent: 0 });
	recentTrades.set([]);
	chartCandles.set([]);
	liveCandle.set(null);
	lastCandleEventAt = 0;
	marketDataStatus.set('idle');
	candleDataStatus.set('idle');
	marketContextStatus.set('idle');
	marketCatalogStatus.set('idle');
}

export async function onMarketSelected(apiCoin: string, timeframe?: string): Promise<void> {
	await subscribeMarket(apiCoin, timeframe);
}

export async function onTimeframeChanged(timeframe: string): Promise<void> {
	const selected = get(selectedMarket);
	const coin = currentCoin || selected?.apiCoin;
	if (!coin) throw new Error('No exact Hyperliquid market identity is selected');
	await subscribeMarket(coin, timeframe);
}