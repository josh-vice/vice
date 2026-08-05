import { HttpTransport } from '@nktkas/hyperliquid';
import {
	metaAndAssetCtxs,
	outcomeMeta,
	perpCategories,
	perpDexs,
	spotMetaAndAssetCtxs
} from '@nktkas/hyperliquid/api/info';
import { get } from 'svelte/store';
import {
	marketRegistry,
	marketCatalogStatus,
	perpMarketsList,
	selectedMarket,
	spotMarketsList
} from '$lib/stores';
import type { MarketDescriptor } from '$lib/types';
import { assertInstrumentId, type InstrumentId } from '$lib/venue/identity';
import { hyperliquidNetwork } from './network';

const transport = new HttpTransport({ isTestnet: hyperliquidNetwork.isTestnet });
let refreshPromise: Promise<MarketDescriptor[]> | null = null;
let refreshTimer: ReturnType<typeof setInterval> | null = null;
const baselineWaiters: Array<(markets: MarketDescriptor[]) => void> = [];

const MAX_INFO_RETRIES = 3;
// The Info API is shared across the whole catalog. A small serialized window
// avoids turning a large HIP-3 universe into a burst of 429s at startup.
const MAX_CONCURRENT_INFO_REQUESTS = 1;
const INFO_BATCH_DELAY_MS = 250;
const MARKET_CATALOG_CACHE_KEY = 'vice.hl.market-catalog.v1';

type CachedMarketCatalog = {
	network: string;
	savedAt: number;
	markets: MarketDescriptor[];
};

function readCachedMarketCatalog(): MarketDescriptor[] {
	if (typeof localStorage === 'undefined') return [];
	try {
		const parsed = JSON.parse(localStorage.getItem(MARKET_CATALOG_CACHE_KEY) ?? 'null') as CachedMarketCatalog | null;
		if (
			!parsed ||
			parsed.network !== hyperliquidNetwork.network ||
			!Array.isArray(parsed.markets) ||
			parsed.markets.length === 0 ||
			parsed.markets.length > 10_000 ||
			!parsed.markets.every((market) =>
				typeof market.marketKey === 'string' &&
				typeof market.apiCoin === 'string' &&
				typeof market.assetId === 'number' &&
				(market.kind === 'corePerp' || market.kind === 'hip3Perp' || market.kind === 'spot' || market.kind === 'outcome')
			)
		) return [];
		return parsed.markets.map(withHyperliquidInstrument);
	} catch {
		return [];
	}
}

function writeCachedMarketCatalog(markets: MarketDescriptor[]): void {
	if (typeof localStorage === 'undefined' || markets.length === 0) return;
	try {
		localStorage.setItem(
			MARKET_CATALOG_CACHE_KEY,
			JSON.stringify({ network: hyperliquidNetwork.network, savedAt: Date.now(), markets })
		);
	} catch {
		// Cache is an optimization only; storage quotas/private browsing must not
		// affect authoritative refresh or live feed startup.
	}
}

function isRateLimited(error: unknown): boolean {
	return /429|too many requests|rate limit/i.test(error instanceof Error ? error.message : String(error));
}

async function withInfoBackoff<T>(operation: () => Promise<T>): Promise<T> {
	let lastError: unknown;
	for (let attempt = 0; attempt < MAX_INFO_RETRIES; attempt += 1) {
		try {
			return await operation();
		} catch (error) {
			lastError = error;
			if (!isRateLimited(error) || attempt === MAX_INFO_RETRIES - 1) throw error;
			// Metadata is a shared, low-frequency HTTP surface. Back off long
			// enough for a 429 window to clear, while the websocket price feeds
			// remain the low-latency source for already-known markets.
			await new Promise((resolve) => setTimeout(resolve, 750 * 2 ** attempt));
		}
	}
	throw lastError instanceof Error ? lastError : new Error('Hyperliquid Info request failed');
}

async function boundedMap<T, R>(items: T[], operation: (item: T) => Promise<R>): Promise<R[]> {
	const results: R[] = [];
	for (let start = 0; start < items.length; start += MAX_CONCURRENT_INFO_REQUESTS) {
		const batch = items.slice(start, start + MAX_CONCURRENT_INFO_REQUESTS);
		results.push(...(await Promise.all(batch.map(operation))));
		if (start + MAX_CONCURRENT_INFO_REQUESTS < items.length) {
			await new Promise((resolve) => setTimeout(resolve, INFO_BATCH_DELAY_MS));
		}
	}
	return results;
}

function number(value: string | null | undefined): number {
	const parsed = Number(value ?? 0);
	return Number.isFinite(parsed) ? parsed : 0;
}

function decimalIncrement(decimals: number): string {
	if (!Number.isInteger(decimals) || decimals < 0 || decimals > 18) throw new Error('Hyperliquid identity has invalid size decimals');
	return decimals === 0 ? '1' : `0.${'0'.repeat(decimals - 1)}1`;
}

/** Keep a public token name only when it is a non-empty exact venue value. */
export function canonicalSpotAssets(baseName: unknown, quoteName: unknown): { baseAsset: string; quoteAsset: string } | null {
	if (
		typeof baseName !== 'string' || baseName.length === 0 || baseName !== baseName.trim() ||
		typeof quoteName !== 'string' || quoteName.length === 0 || quoteName !== quoteName.trim()
	) return null;
	return { baseAsset: baseName, quoteAsset: quoteName };
}

/** A missing venue size precision must never become a synthetic whole-unit lot. */
export function canonicalSpotSizeDecimals(value: unknown): number | null {
	return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 18 ? value : null;
}

/** Hyperliquid has a significant-figure price rule, not a static tick. */
export function hyperliquidInstrumentId(market: Pick<MarketDescriptor, 'apiCoin' | 'kind' | 'type' | 'baseToken' | 'quoteToken' | 'szDecimals' | 'priceDecimals'>): InstrumentId {
	if (market.kind === 'outcome') throw new Error('Hyperliquid outcome metadata lacks complete execution terms');
	if (!Number.isInteger(market.priceDecimals) || market.priceDecimals < 0 || market.priceDecimals > 18) {
		throw new Error('Hyperliquid identity has invalid price decimals');
	}
	return assertInstrumentId({
		instrumentKey: `hyperliquid:${market.type === 'spot' ? 'spot' : 'linearPerp'}:${market.apiCoin}`,
		venue: 'hyperliquid',
		venueSymbol: market.apiCoin,
		product: market.type === 'spot' ? 'spot' : 'linearPerp',
		baseAsset: market.baseToken,
		quoteAsset: market.quoteToken,
		settlementAsset: market.quoteToken,
		contractMultiplier: '1',
		pricePrecision: { kind: 'significantFigures', maxSignificantFigures: 5, maxDecimals: market.priceDecimals, integerPricesAllowed: true },
		sizeIncrement: decimalIncrement(market.szDecimals)
	});
}

/** Outcome rows remain metadata-only until their venue terms are complete. */
export function withHyperliquidInstrument(market: MarketDescriptor): MarketDescriptor {
	return market.kind === 'outcome' ? market : { ...market, instrument: hyperliquidInstrumentId(market) };
}

export function derivePriceDecimals(szDecimals: number, spot: boolean): number {
	return Math.max(0, (spot ? 8 : 6) - szDecimals);
}

export function derivePerpAssetId(index: number, dexIndex: number | null): number {
	return dexIndex === null ? index : 100_000 + dexIndex * 10_000 + index;
}

export function deriveSpotAssetId(index: number): number {
	return 10_000 + index;
}

/** Hyperliquid reserves 100,000,000 + (10 * outcome + side) for binary outcomes. */
export function deriveOutcomeAssetId(outcome: number, side: number): number {
	if (!Number.isInteger(outcome) || outcome < 0 || (side !== 0 && side !== 1)) {
		throw new Error('Hyperliquid outcome identity requires a non-negative outcome and binary side');
	}
	return 100_000_000 + 10 * outcome + side;
}

type OutcomeMetadata = Awaited<ReturnType<typeof outcomeMeta>>;

/**
 * Preserve every venue-provided outcome identity and question label. outcomeMeta
 * does not include tick, lot, or complete execution terms, so these rows are
 * deliberately metadata-only until the venue publishes those constraints.
 */
export function descriptorsFromOutcomeMeta(metadata: OutcomeMetadata): MarketDescriptor[] {
	const questionsByOutcome = new Map<number, OutcomeMetadata['questions'][number]>();
	for (const question of metadata.questions) {
		for (const outcome of question.namedOutcomes) questionsByOutcome.set(outcome, question);
	}
	return metadata.outcomes.flatMap((outcome) => {
		const question = questionsByOutcome.get(outcome.outcome);
		return outcome.sideSpecs.slice(0, 2).map((sideSpec, side) => {
			const encoding = 10 * outcome.outcome + side;
			return {
				marketKey: `outcome:${outcome.outcome}:${side}`,
				apiCoin: `#${encoding}`,
				assetId: deriveOutcomeAssetId(outcome.outcome, side),
				kind: 'outcome' as const,
				dex: null,
				baseToken: sideSpec.name,
				quoteToken: 'USDC',
				szDecimals: 0,
				priceDecimals: 0,
				symbol: `${outcome.name} · ${sideSpec.name}`,
				name: question?.name ?? outcome.name,
				type: 'spot' as const,
				lastPrice: 0,
				change24h: 0,
				changePercent24h: 0,
				volume24h: 0,
				outcome: {
					outcomeId: outcome.outcome,
					side,
					questionName: question?.name,
					questionDescription: question?.description,
					outcomeDescription: outcome.description,
					settled: question?.settledNamedOutcomes.includes(outcome.outcome) ?? false
				},
				tradingAvailability: 'metadataOnly' as const,
				tradingUnavailableReason: 'Hyperliquid outcome metadata does not provide lot, tick, or complete execution terms.'
			};
		});
	});
}

/**
 * A real, stable core identity used only to keep the public feed usable while
 * the authoritative metadata catalog is rate-limited. It deliberately has
 * no synthetic price, volume, funding, or change values; those are filled by
 * the live allMids/book/candle feeds. The catalog remains degraded until the
 * full metadata refresh succeeds.
 */
export function createCoreBtcBootstrapMarket(): MarketDescriptor {
	return withHyperliquidInstrument({
		marketKey: 'perp:BTC',
		apiCoin: 'BTC',
		assetId: 0,
		kind: 'corePerp',
		dex: null,
		baseToken: 'BTC',
		quoteToken: 'USD',
		szDecimals: 5,
		priceDecimals: derivePriceDecimals(5, false),
		maxLeverage: 50,
		symbol: 'BTC-USD-PERP',
		name: 'BTC Perpetual',
		type: 'perp',
		lastPrice: 0,
		change24h: 0,
		changePercent24h: 0,
		volume24h: 0,
		openInterest: 0
	});
}

/** Preserve the venue-provided perpDexs index; null entries are meaningful gaps. */
export function indexNamedPerpDexes(dexs: Array<{ name: string } | null>): Array<{ name: string; index: number }> {
	return dexs.flatMap((dex, index) => (dex ? [{ name: dex.name, index }] : []));
}

/** Apply only exact venue categories; unknown or malformed labels stay absent. */
export function applyPerpCategories(
	markets: MarketDescriptor[],
	categories: ReadonlyArray<readonly [string, string]>
): MarketDescriptor[] {
	const byCoin = new Map(
		categories.filter(([coin, category]) => coin.trim().length > 0 && coin === coin.trim() && category.trim().length > 0 && category === category.trim())
	);
	return markets.map((market) => {
		if (market.kind !== 'corePerp' && market.kind !== 'hip3Perp') return market;
		const venueCategory = byCoin.get(market.apiCoin);
		return venueCategory ? { ...market, venueCategory } : market;
	});
}

function descriptorFromPerp(
	name: string,
	index: number,
	dex: string | null,
	dexIndex: number,
	meta: {
		szDecimals: number;
		maxLeverage: number;
		isDelisted?: true;
	},
	ctx: {
		markPx: string;
		midPx: string | null;
		prevDayPx: string;
		dayNtlVlm: string;
		openInterest: string;
		funding: string;
		oraclePx: string;
	}
): MarketDescriptor {
	const apiCoin = dex ? `${dex}:${name}` : name;
	const mark = number(ctx.midPx ?? ctx.markPx);
	const previous = number(ctx.prevDayPx);
	const change = mark - previous;
	return withHyperliquidInstrument({
		marketKey: dex ? `hip3:${dex}:${name}` : `perp:${name}`,
		apiCoin,
		assetId: derivePerpAssetId(index, dex ? dexIndex : null),
		kind: dex ? 'hip3Perp' : 'corePerp',
		dex,
		baseToken: name,
		quoteToken: 'USD',
		szDecimals: meta.szDecimals,
		priceDecimals: derivePriceDecimals(meta.szDecimals, false),
		maxLeverage: meta.maxLeverage,
		isDelisted: meta.isDelisted === true,
		symbol: dex ? `${dex.toUpperCase()}:${name}-PERP` : `${name}-USD-PERP`,
		name: dex ? `${name} Perp · ${dex}` : `${name} Perpetual`,
		type: 'perp',
		lastPrice: mark,
		change24h: change,
		changePercent24h: previous > 0 ? (change / previous) * 100 : 0,
		volume24h: number(ctx.dayNtlVlm),
		openInterest: number(ctx.openInterest),
		fundingRate: number(ctx.funding),
		markPrice: number(ctx.markPx),
		indexPrice: number(ctx.oraclePx)
	});
}

async function fetchMarketRegistry(onPartial?: (markets: MarketDescriptor[]) => void): Promise<MarketDescriptor[]> {
	let hip3Failure = false;
	let coreResponse: Awaited<ReturnType<typeof metaAndAssetCtxs>> | null = null;
	let spotResponse: Awaited<ReturnType<typeof spotMetaAndAssetCtxs>> | null = null;

	// Core and spot metadata share the same venue rate-limit bucket. A
	// concurrent Promise.all makes one transient 429 hide both authoritative
	// sources and leaves the terminal with no selected market at all. Load them
	// independently so a usable source can be published immediately and the
	// unavailable source remains explicitly degraded for the next refresh.
	try {
		coreResponse = await withInfoBackoff(() => metaAndAssetCtxs({ transport }));
	} catch (error) {
		hip3Failure = true;
		console.warn('[hl] core perp metadata unavailable; retaining any prior catalog and retrying:', error);
	}
	try {
		spotResponse = await withInfoBackoff(() => spotMetaAndAssetCtxs({ transport }));
	} catch (error) {
		hip3Failure = true;
		console.warn('[hl] spot metadata unavailable; retaining any prior catalog and retrying:', error);
	}
	if (!coreResponse && !spotResponse) {
		throw new Error('Hyperliquid core and spot market metadata are unavailable');
	}

	const markets: MarketDescriptor[] = [];
	if (coreResponse) {
		const [coreMeta, coreContexts] = coreResponse;
		for (let index = 0; index < coreMeta.universe.length; index += 1) {
			const asset = coreMeta.universe[index];
			const context = coreContexts[index];
			if (!context || asset.isDelisted) continue;
			markets.push(descriptorFromPerp(asset.name, index, null, 0, asset, context));
		}
	}

	if (spotResponse) {
		const [spotMeta, spotContexts] = spotResponse;
		const tokenByIndex = new Map(spotMeta.tokens.map((token) => [token.index, token]));
		for (let index = 0; index < spotMeta.universe.length; index += 1) {
			const universe = spotMeta.universe[index];
			const context = spotContexts[index];
			if (!context) continue;
			const base = tokenByIndex.get(universe.tokens[0]);
			const quote = tokenByIndex.get(universe.tokens[1]);
			const assets = canonicalSpotAssets(base?.name, quote?.name);
			const baseSzDecimals = canonicalSpotSizeDecimals(base?.szDecimals);
			// A partial token record cannot form a canonical routing identity. Skip
			// that one spot market instead of turning the entire public catalog into
			// a BTC-only fallback, guessing a settlement asset from its label, or
			// turning absent size precision into a whole-unit size increment.
			if (!assets || baseSzDecimals === null) {
				console.warn(`[hl] skipping spot ${universe.index}: venue metadata has incomplete token identity or size precision`);
				continue;
			}
			const mark = number(context.midPx ?? context.markPx);
			const previous = number(context.prevDayPx);
			const change = mark - previous;
			const displayName =
				universe.name.includes('/') || universe.name.startsWith('@')
					? `${assets.baseAsset}/${assets.quoteAsset}`
					: universe.name;
			markets.push(withHyperliquidInstrument({
				marketKey: `spot:${universe.index}`,
				apiCoin: `@${universe.index}`,
				assetId: deriveSpotAssetId(universe.index),
				kind: 'spot',
				dex: null,
				baseToken: assets.baseAsset,
				quoteToken: assets.quoteAsset,
				szDecimals: baseSzDecimals,
				priceDecimals: derivePriceDecimals(baseSzDecimals, true),
				symbol: displayName.replace('/', '-'),
				name: `${base?.fullName ?? assets.baseAsset} / ${assets.quoteAsset}`,
				type: 'spot',
				lastPrice: mark,
				change24h: change,
				changePercent24h: previous > 0 ? (change / previous) * 100 : 0,
				volume24h: number(context.dayNtlVlm),
				markPrice: number(context.markPx),
				indexPrice: mark
			}));
		}
	}
	const baseline = [...markets].sort((a, b) => b.volume24h - a.volume24h || a.symbol.localeCompare(b.symbol));
	onPartial?.(baseline);

	// Outcome identity is venue-authoritative. Keep it separate from the perp
	// fan-out: these rows remain discoverable even when a builder DEX is slow.
	try {
		markets.push(...descriptorsFromOutcomeMeta(await withInfoBackoff(() => outcomeMeta({ transport }))));
	} catch (error) {
		hip3Failure = true;
		console.warn('[hl] outcome metadata unavailable; retrying on the next refresh:', error);
	}

	// Core and spot are the useful minimum for a responsive terminal. HIP-3 is
	// deliberately loaded after that baseline so one rate-limited DEX cannot
	// take the whole market surface offline.
	const namedDexs = await withInfoBackoff(() => perpDexs({ transport })).catch((error) => {
		hip3Failure = true;
		console.warn('[hl] HIP-3 DEX index unavailable; retrying on the next refresh:', error);
		return [];
	});
	// A 429 is shared by the whole Info bucket. Once the bounded retry for one
	// HIP-3 request is exhausted, stop issuing more DEX requests in this refresh
	// rather than turning one venue throttle into a burst of guaranteed failures.
	// The next scheduled refresh retries the complete DEX set.
	let hip3RateLimited = false;
	const hip3Responses = await boundedMap(indexNamedPerpDexes(namedDexs), async (dex) => {
		if (hip3RateLimited) return null;
		try {
			return { dex, response: await withInfoBackoff(() => metaAndAssetCtxs({ transport }, { dex: dex.name })) };
		} catch (error) {
			hip3Failure = true;
			if (isRateLimited(error)) hip3RateLimited = true;
			console.warn(`[hl] HIP-3 DEX ${dex.name} unavailable; keeping the rest of the catalog live:`, error);
			return null;
		}
	});
	for (const result of hip3Responses) {
		if (!result) continue;
		const [meta, contexts] = result.response;
		for (let index = 0; index < meta.universe.length; index += 1) {
			const asset = meta.universe[index];
			const context = contexts[index];
			if (!context || asset.isDelisted) continue;
			markets.push(descriptorFromPerp(asset.name, index, result.dex.name, result.dex.index, asset, context));
		}
	}

	let categorizedMarkets = markets;
	try {
		categorizedMarkets = applyPerpCategories(markets, await withInfoBackoff(() => perpCategories({ transport })));
	} catch (error) {
		// Classification is descriptive only. Do not hide markets or invent a
		// category when the venue's optional metadata is unavailable.
		console.warn('[hl] perp category metadata unavailable; leaving categories absent:', error);
	}

	marketCatalogStatus.set(hip3Failure ? 'degraded' : 'live');
	return categorizedMarkets.sort(
		(a, b) => b.volume24h - a.volume24h || a.symbol.localeCompare(b.symbol)
	);
}

export async function refreshMarketRegistry(): Promise<MarketDescriptor[]> {
	if (refreshPromise) return refreshPromise;
	let hasWarmCatalog = false;
	if (get(marketRegistry).length === 0) {
		const cached = readCachedMarketCatalog();
		if (cached.length > 0) {
			hasWarmCatalog = true;
			marketRegistry.set(cached);
			perpMarketsList.set(cached.filter((market) => market.kind !== 'spot'));
			spotMarketsList.set(cached.filter((market) => market.kind === 'spot'));
			marketCatalogStatus.set('stale');
			const current = get(selectedMarket);
			const replacement = current
				? cached.find((market) => market.marketKey === current.marketKey)
				: cached.find((market) => market.marketKey === 'perp:BTC') ?? cached[0];
			if (replacement) selectedMarket.set(replacement);
		}
	}
	// A cached catalog is usable but not fresh. Keep that truth visible while
	// the authoritative Info refresh runs; cold starts remain explicitly loading.
	marketCatalogStatus.set(hasWarmCatalog ? 'stale' : 'connecting');
	const publish = (markets: MarketDescriptor[]) => {
		marketRegistry.set(markets);
		perpMarketsList.set(markets.filter((market) => market.kind !== 'spot'));
		spotMarketsList.set(markets.filter((market) => market.kind === 'spot'));
		while (baselineWaiters.length > 0) baselineWaiters.shift()?.(markets);
		const current = get(selectedMarket);
		const replacement = current
			? markets.find((market) => market.marketKey === current.marketKey)
			: markets.find((market) => market.marketKey === 'perp:BTC') ?? markets[0];
		if (replacement) selectedMarket.set(replacement);
	};
	refreshPromise = fetchMarketRegistry(publish)
		.then((markets) => {
			writeCachedMarketCatalog(markets);
			publish(markets);
			return markets;
		})
		.catch((error) => {
			// Keep an already-known authoritative catalog visible during a
			// metadata outage. On a cold start, use only the stable BTC market
			// identity as a live-feed bootstrap; never invent its price or account
			// state. The catalog remains explicitly degraded and retries normally.
			const existing = get(marketRegistry);
			const fallback = existing.length > 0 ? existing : [createCoreBtcBootstrapMarket()];
			publish(fallback);
			marketCatalogStatus.set('degraded');
			console.warn('[hl] market catalog unavailable; bootstrapping live public feed with known BTC identity:', error);
			return fallback;
		})
		.finally(() => {
			refreshPromise = null;
		});
	return refreshPromise;
}

/** Resolve as soon as core/spot (or the explicit BTC bootstrap identity) is
 * published; HIP-3 enrichment continues in the background. */
export function waitForMarketCatalogBaseline(): Promise<MarketDescriptor[]> {
	const current = get(marketRegistry);
	if (current.length > 0) return Promise.resolve(current);
	return new Promise((resolve) => baselineWaiters.push(resolve));
}

export function startMarketRegistryRefresh(): void {
	if (refreshTimer) return;
	void refreshMarketRegistry().catch(() => undefined);
	refreshTimer = setInterval(() => void refreshMarketRegistry().catch(() => undefined), 5 * 60_000);
}

export function stopMarketRegistryRefresh(): void {
	if (refreshTimer) clearInterval(refreshTimer);
	refreshTimer = null;
}
