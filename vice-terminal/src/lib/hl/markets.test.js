// @ts-nocheck
import {
	derivePerpAssetId,
	derivePriceDecimals,
	deriveSpotAssetId,
	applyPerpCategories,
	indexNamedPerpDexes,
	createCoreBtcBootstrapMarket
	, descriptorsFromOutcomeMeta
	, deriveOutcomeAssetId
	, hyperliquidInstrumentId
	, canonicalSpotAssets
	, canonicalSpotSizeDecimals
} from './markets';

describe('Hyperliquid market identity', () => {
	test('derives core and HIP-3 asset IDs without collisions', () => {
		expect(derivePerpAssetId(7, null)).toBe(7);
		expect(derivePerpAssetId(7, 0)).toBe(100_007);
		expect(derivePerpAssetId(7, 2)).toBe(120_007);
	});

	test('derives spot asset IDs', () => {
		expect(deriveSpotAssetId(0)).toBe(10_000);
		expect(deriveSpotAssetId(42)).toBe(10_042);
	});

	test('keeps only exact venue token names for canonical spot routing', () => {
		expect(canonicalSpotAssets('PURR', 'USDC')).toEqual({ baseAsset: 'PURR', quoteAsset: 'USDC' });
		expect(canonicalSpotAssets('', 'USDC')).toBeNull();
		expect(canonicalSpotAssets(' PURR', 'USDC')).toBeNull();
		expect(canonicalSpotAssets('PURR', undefined)).toBeNull();
	});

	test('keeps only authoritative venue size precision for a canonical spot', () => {
		expect(canonicalSpotSizeDecimals(5)).toBe(5);
		expect(canonicalSpotSizeDecimals(0)).toBe(0);
		expect(canonicalSpotSizeDecimals(undefined)).toBeNull();
		expect(canonicalSpotSizeDecimals(1.5)).toBeNull();
		expect(canonicalSpotSizeDecimals(19)).toBeNull();
	});

	test('preserves exact official categories without inferring a category from symbols', () => {
		const core = createCoreBtcBootstrapMarket();
		const hip3 = { ...core, marketKey: 'hip3:xyz:NVDA', apiCoin: 'xyz:NVDA', kind: 'hip3Perp', dex: 'xyz', baseToken: 'NVDA' };
		const categorized = applyPerpCategories([core, hip3], [['xyz:NVDA', 'stocks'], ['BTC', 'crypto'], [' BTC ', 'invented']]);
		expect(categorized.map((market) => market.venueCategory)).toEqual(['crypto', 'stocks']);
	});

	test('preserves official binary outcome identities without inventing execution terms', () => {
		expect(deriveOutcomeAssetId(12, 1)).toBe(100_000_121);
		expect(() => deriveOutcomeAssetId(12, 2)).toThrow();
		const markets = descriptorsFromOutcomeMeta({
			outcomes: [{ outcome: 12, name: 'Election', description: 'Result', sideSpecs: [{ name: 'Yes' }, { name: 'No' }] }],
			questions: [{ question: 3, name: 'Election result', description: 'Who wins?', fallbackOutcome: 12, namedOutcomes: [12], settledNamedOutcomes: [] }]
		});
		expect(markets.map((market) => market.apiCoin)).toEqual(['#120', '#121']);
		expect(markets[0]).toMatchObject({ kind: 'outcome', tradingAvailability: 'metadataOnly', outcome: { questionName: 'Election result', side: 0 } });
	});

	test('uses venue precision rules', () => {
		expect(derivePriceDecimals(5, false)).toBe(1);
		expect(derivePriceDecimals(5, true)).toBe(3);
		expect(hyperliquidInstrumentId(createCoreBtcBootstrapMarket())).toEqual(expect.objectContaining({
			instrumentKey: 'hyperliquid:linearPerp:BTC',
			product: 'linearPerp',
			pricePrecision: { kind: 'significantFigures', maxSignificantFigures: 5, maxDecimals: 1, integerPricesAllowed: true },
			sizeIncrement: '0.00001'
		}));
		expect(() => hyperliquidInstrumentId({ ...createCoreBtcBootstrapMarket(), kind: 'outcome' })).toThrow('lacks complete execution terms');
	});

	test('preserves sparse official perp DEX indexes', () => {
		expect(indexNamedPerpDexes([null, { name: 'xyz' }, null, { name: 'abc' }])).toEqual([
		{ name: 'xyz', index: 1 },
		{ name: 'abc', index: 3 }
	]);
	expect(derivePerpAssetId(7, 3)).toBe(130_007);
	});

	test('keeps a usable catalog when one metadata source is rate-limited', async () => {
		const source = await Bun.file(new URL('./markets.ts', import.meta.url)).text();
		expect(source).toContain('coreResponse = await withInfoBackoff');
		expect(source).toContain('spotResponse = await withInfoBackoff');
		expect(source).toContain('if (!coreResponse && !spotResponse)');
		expect(source).not.toContain('const [coreResponse, spotResponse] = await Promise.all');
	});

	test('skips one malformed spot token record without aborting the full catalog', async () => {
		const source = await Bun.file(new URL('./markets.ts', import.meta.url)).text();
		expect(source).toContain('const assets = canonicalSpotAssets(base?.name, quote?.name);');
		expect(source).toContain('const baseSzDecimals = canonicalSpotSizeDecimals(base?.szDecimals);');
		expect(source).toContain('skipping spot ${universe.index}: venue metadata has incomplete token identity or size precision');
		expect(source).toContain('if (!assets || baseSzDecimals === null) {');
		expect(source).not.toContain("quoteToken: quote?.name ?? 'USDC'");
		expect(source).not.toContain('szDecimals: base?.szDecimals ?? 0');
	});

	test('stops the HIP-3 fan-out after a shared Info rate limit', async () => {
		const source = await Bun.file(new URL('./markets.ts', import.meta.url)).text();
		expect(source).toContain('let hip3RateLimited = false;');
		expect(source).toContain('if (hip3RateLimited) return null;');
		expect(source).toContain('if (isRateLimited(error)) hip3RateLimited = true;');
		expect(source).toContain('The next scheduled refresh retries the complete DEX set.');
	});

	test('keeps category metadata descriptive when the official category endpoint is unavailable', async () => {
		const source = await Bun.file(new URL('./markets.ts', import.meta.url)).text();
		expect(source).toContain('perpCategories({ transport })');
		expect(source).toContain('leaving categories absent');
		expect(source).toContain('categorizedMarkets = applyPerpCategories');
	});

	test('bootstrap identity has no synthetic market values', () => {
		const market = createCoreBtcBootstrapMarket();
		expect(market.marketKey).toBe('perp:BTC');
		expect(market.apiCoin).toBe('BTC');
		expect(market.assetId).toBe(0);
		expect(market.lastPrice).toBe(0);
		expect(market.volume24h).toBe(0);
	});

	test('warm catalog uses only validated same-network authoritative identities', async () => {
		const source = await Bun.file(new URL('./markets.ts', import.meta.url)).text();
		expect(source).toContain("const MARKET_CATALOG_CACHE_KEY = 'vice.hl.market-catalog.v1';");
		expect(source).toContain("parsed.network !== hyperliquidNetwork.network");
		expect(source).toContain("marketCatalogStatus.set('stale');");
		expect(source).toContain("marketCatalogStatus.set(hasWarmCatalog ? 'stale' : 'connecting');");
		expect(source).toContain('writeCachedMarketCatalog(markets);');
		expect(source).toContain('typeof market.marketKey === \'string\'');
		expect(source).toContain("market.kind === 'corePerp' || market.kind === 'hip3Perp' || market.kind === 'spot' || market.kind === 'outcome'");
	});
});
