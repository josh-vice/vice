import { describe, expect, test } from 'bun:test';

describe('exact feed identity boundary', () => {
	test('subscription entry points validate registered API coins before subscribing', async () => {
		const source = await Bun.file(new URL('./subscriptions.ts', import.meta.url)).text();
		expect(source).toContain('function requireRegisteredApiCoin(apiCoin: string)');
		expect(source).toContain("market.apiCoin === apiCoin");
		expect(source).toContain('const coin = requireRegisteredApiCoin(apiCoin);');
		expect(source).toContain('export async function onMarketSelected(apiCoin: string');
		expect(source).not.toContain('export async function onMarketSelected(symbol: string');
	});

	test('feed routing does not derive a coin from display text', async () => {
		const source = await Bun.file(new URL('./subscriptions.ts', import.meta.url)).text();
		expect(source).not.toContain('symbol.replace');
		expect(source).not.toContain('symbol.split');
		expect(source).not.toContain('toUpperCase()');
	});

	test('public feeds are not blocked by the full HIP-3 catalog sweep', async () => {
		const source = await Bun.file(new URL('./subscriptions.ts', import.meta.url)).text();
		expect(source).toContain('createCoreBtcBootstrapMarket()');
		expect(source).toContain('startMarketRegistryRefresh();');
		expect(source).toContain('await subscribeMarket(coin);');
		expect(source.indexOf('await subscribeMarket(coin);')).toBeLessThan(source.indexOf('startMarketRegistryRefresh();'));
	});

	test('cached candle history hydrates before network refresh and history does not wait on the book socket', async () => {
		const source = await Bun.file(new URL('./subscriptions.ts', import.meta.url)).text();
		const startupSource = source.slice(source.indexOf('export async function startHlFeeds'));
		expect(source).toContain('hydrateCachedCandleHistory(coin, tf, generation);');
		expect(startupSource).toContain('renderCachedCandleHistory(coin, get(chartTimeframe));');
		expect(startupSource.indexOf('renderCachedCandleHistory(coin, get(chartTimeframe));')).toBeLessThan(startupSource.indexOf('await subscribeAllMids();'));
		expect(source).toContain('const candleHistoryPromise = withTimeout(');
		expect(source).toContain('const bookSubscriptionPromise = bookClient.l2Book');
		expect(source.indexOf('const candleHistoryPromise = withTimeout(')).toBeLessThan(source.indexOf('const bookSubscriptionPromise = bookClient.l2Book'));
		expect(source).toContain('activeSubs.l2Book = await bookSubscriptionPromise;');
	});

	test('catalog-driven selection replacements switch the exact live feed', async () => {
		const source = await Bun.file(new URL('./subscriptions.ts', import.meta.url)).text();
		expect(source).toContain('selectedMarketUnsubscribe = selectedMarket.subscribe');
		expect(source).toContain('market.apiCoin === currentCoin');
		expect(source).toContain('subscribeMarket(market.apiCoin, get(chartTimeframe))');
		expect(source).toContain('selectedMarketUnsubscribe = null');
	});

	test('rapid market switches serialize teardown and invalidate queued lifecycle work', async () => {
		const source = await Bun.file(new URL('./subscriptions.ts', import.meta.url)).text();
		expect(source).toContain('let marketSwitchQueue: Promise<void> = Promise.resolve();');
		expect(source).toContain('marketSwitchQueue.then(async () =>');
		expect(source).toContain('request < marketSwitchRequest');
		expect(source).toContain('lifecycle !== feedLifecycle');
		expect(source).toContain('feedLifecycle += 1;');
		expect(source).toContain('await closeHlClients();');
		expect(source).toContain('marketTransportHealthBound = false;');
		expect(source).toContain('bookTransportHealthBound = false;');
		expect(source).toContain('if (lifecycle !== feedLifecycle) return;');
	});

	test('live mids hydrate a zero bootstrap price without overwriting focused ticket input', async () => {
		const source = await Bun.file(new URL('./subscriptions.ts', import.meta.url)).text();
		expect(source).toContain('const previousPrice = selected.lastPrice;');
		expect(source).toContain('!get(priceInputFocused)');
		expect(source).toContain('currentOrderPrice === null || currentOrderPrice === 0 || currentOrderPrice === previousPrice');
		expect(source).toContain('orderPrice.set(price);');
	});

	test('live status requires the selected market book, trades, and mids feeds', async () => {
		const source = await Bun.file(new URL('./subscriptions.ts', import.meta.url)).text();
		expect(source).toContain("const REQUIRED_MARKET_FEEDS = ['mids', 'book', 'trades'] as const;");
		expect(source).toContain('selectedMarketFeedsAreHealthy');
		expect(source).toContain("markMarketFeedAlive('book')");
		expect(source).toContain("markMarketFeedAlive('trades')");
		expect(source).toContain("markMarketFeedAlive('mids')");
		expect(source).toContain("get(marketDataStatus) === 'stale' || get(marketDataStatus) === 'connecting'");
		expect(source).not.toContain('lastMarketEventAt');
	});

	test('all-mids updates use an exact API-coin index on the hot path', async () => {
		const source = await Bun.file(new URL('./subscriptions.ts', import.meta.url)).text();
		expect(source).toContain('marketByApiCoin = new Map');
		expect(source).toContain('marketByApiCoin.get(apiCoin)');
		expect(source).toContain('startHyperliquidPublicPlane(hyperliquidNetwork.network');
		expect(source).toContain('Object.entries(event.mids)');
		expect(source).toContain('const lastAllMidByApiCoin = new Map<string, number>();');
		expect(source).toContain('lastAllMidByApiCoin.set(apiCoin, event.receivedAt);');
		expect(source).toContain('export function exactAllMidIsLive(apiCoin: string');
		expect(source).not.toContain('for (const market of markets) {\n\t\t\t\t\tconst mid = data.mids[market.apiCoin]');
	});

	test('selected-market trade frames come from the shared worker and retain exact coin identity', async () => {
		const source = await Bun.file(new URL('./subscriptions.ts', import.meta.url)).text();
		expect(source).toContain('publicPlane?.setTrades(coin);');
		expect(source).toContain("if (event.type === 'trades') {");
		expect(source).toContain('if (event.coin !== currentCoin) return;');
		expect(source).not.toContain('activeSubs.trades = await client.trades');
	});

	test('selected-market candles come from the shared worker with exact interval identity', async () => {
		const source = await Bun.file(new URL('./subscriptions.ts', import.meta.url)).text();
		expect(source).toContain('publicPlane?.setCandle(coin, toHlInterval(tf));');
		expect(source).toContain("if (event.type === 'candle') {");
		expect(source).toContain('event.interval !== toHlInterval(currentTimeframe)');
		expect(source).toContain('candleDataStatus');
		expect(source).toContain('function markCandleFeedAlive(): void');
		expect(source).toContain("candleDataStatus.set('connecting')");
		expect(source).toContain("candleDataStatus.set('stale')");
		expect(source).not.toContain('activeSubs.candle = await client.candle');
	});

	test('feed status does not become live merely because subscriptions were created', async () => {
		const source = await Bun.file(new URL('./subscriptions.ts', import.meta.url)).text();
		expect(source).toContain("selectedMarketFeedsAreHealthy() ? 'live' : snapshotLoaded ? 'stale' : 'connecting'");
		expect(source).toContain("get(marketDataStatus) === 'stale' || get(marketDataStatus) === 'connecting'");
		expect(source).not.toContain("await loadCandleHistory(coin, tf, generation);\n\t\t\tmarketDataStatus.set('live');");
	});

	test('silent open sockets recover after the startup delivery deadline', async () => {
		const source = await Bun.file(new URL('./subscriptions.ts', import.meta.url)).text();
		expect(source).toContain('let marketFeedStartedAt = 0;');
		expect(source).toContain('marketFeedStartedAt = Date.now();');
		expect(source).toContain('Date.now() - marketFeedStartedAt > 8_000');
		expect(source).toContain('marketDataStatus.set(\'stale\');');
		expect(source).toContain('scheduleMarketRecovery();');
	});

	test('timeframe changes keep using the selected-market health callback', async () => {
		const source = await Bun.file(new URL('./subscriptions.ts', import.meta.url)).text();
		expect(source).not.toContain('markMarketAlive(');
		expect(source).toContain("markMarketFeedAlive('trades');");
	});

	test('candle-stream failure preserves real trade-derived chart fallback', async () => {
		const source = await Bun.file(new URL('./subscriptions.ts', import.meta.url)).text();
		expect(source).toContain('discard trade-derived candles when only the candle stream failed');
		expect(source).toContain("marketDataStatus.set(snapshotLoaded || get(chartCandles).length > 0 ? 'stale' : 'error');");
		expect(source).not.toContain("\n\t\t\tchartCandles.set([]);\n\t\t\tmarketDataStatus.set(snapshotLoaded ? 'stale' : 'error');");
	});

	test('the in-progress bar renders through the single liveCandle store, not the history array', async () => {
		const source = await Bun.file(new URL('./subscriptions.ts', import.meta.url)).text();
		expect(source).toContain('liveCandle.set(candle)');
		expect(source).toContain('const previous = get(liveCandle);');
		// The historical-array full-copy path only runs once per bar close
		// (chartCandles.update((existing) => [...existing, previous])), never on
		// every same-interval tick.
		expect(source).toContain('chartCandles.update((existing) => [...existing, previous]);');
	});

	test('trade-derived candle fallback only runs while the candle stream is unhealthy', async () => {
		const source = await Bun.file(new URL('./subscriptions.ts', import.meta.url)).text();
		expect(source).toContain('function candleStreamHealthy(): boolean {');
		expect(source).toContain('if (!candleStreamHealthy()) {');
		expect(source).toContain('for (const trade of trades) upsertTradeCandle(trade, marketGeneration);');
	});

	test('liveCandle resets alongside chartCandles at every market/timeframe/stop boundary', async () => {
		const source = await Bun.file(new URL('./subscriptions.ts', import.meta.url)).text();
		const resets = source.split('chartCandles.set([]);').length - 1;
		const liveResets = source.split('liveCandle.set(null);').length - 1;
		expect(resets).toBeGreaterThan(0);
		expect(liveResets).toBe(resets);
	});

	test('the order book commits at most once per animation frame', async () => {
		const source = await Bun.file(new URL('./subscriptions.ts', import.meta.url)).text();
		expect(source).toContain('function scheduleBookCommit(generation: number, epoch: number): void {');
		expect(source).toContain('requestAnimationFrame(() => {');
		expect(source).toContain('pendingBookGeneration === marketGeneration');
		expect(source).toContain('pendingBookEpoch === bookSubscriptionEpoch');
		expect(source).toContain('const normalizedBook = normalizeL2Book(data);');
		expect(source).toContain('if (!normalizedBook) {');
		expect(source).toContain('pendingBook = canonicalBookEvent(normalizedBook, generation, bookEpoch, data.time);');
  expect(source).toContain('scheduleBookCommit(generation, bookEpoch);');
		// The live handler defers to the coalescing scheduler rather than
		// committing straight to the store on every raw WS frame.
		expect(source).not.toContain('orderBook.set(normalizeL2Book(data));');
	});

	test('accepted live books commit through the canonical Hyperliquid event boundary', async () => {
		const source = await Bun.file(new URL('./subscriptions.ts', import.meta.url)).text();
		expect(source).toContain("import { closeHlClients, getBookSubscriptionClient, getBookTransport, getSubscriptionClient, getInfoClient, getTransport } from './client';");
		expect(source).toContain('const bookClient = getBookSubscriptionClient();');
		expect(source).toContain('activeSubs.l2Book = await bookSubscriptionPromise');
		expect(source).toContain('activeSubs.l2Book = await getBookSubscriptionClient().l2Book');
		expect(source).toContain('bindMarketSocketHealth(getBookTransport().socket, feedLifecycle);');
		expect(source).toContain("import { hyperliquidBookEvent } from '$lib/venue/hyperliquid';");
		expect(source).toContain('pendingBook = canonicalBookEvent(normalizedBook, generation, bookEpoch, data.time);');
		expect(source).toContain('orderBook.set(pendingBook.payload);');
		expect(source).toContain('bookEventOrdinal = 0;');
	});

	test('HTTP book baselines use the same canonical identity and cannot overwrite a live frame', async () => {
		const source = await Bun.file(new URL('./subscriptions.ts', import.meta.url)).text();
		expect(source).toContain('async function loadMarketSnapshots(coin: string, generation: number, bookEpoch: number): Promise<boolean> {');
		expect(source).toContain('generation === marketGeneration && bookEpoch === bookSubscriptionEpoch && liveBookFrameEpoch !== bookEpoch');
		expect(source).toContain('orderBook.set(canonicalBookEvent(normalizedBook, generation, bookEpoch, book.value.time).payload);');
		expect(source.match(/pendingBook = canonicalBookEvent\(normalizedBook, generation, bookEpoch, data\.time\);/g)).toHaveLength(2);
		expect(source.match(/liveBookFrameEpoch = bookEpoch;/g)).toHaveLength(2);
	});
});
