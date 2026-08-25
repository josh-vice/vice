import { writable, derived, get, type Writable, type Readable } from 'svelte/store';
import type { MarketDescriptor, OrderBook, Position, Order, Fill, Balance, OptionChain, Trade, Subaccount, CLICommand, MarketType, OrderSide, OrderType, OptionContract, ChartCandle, ChartInteractionMode, ChartDraft, ChartActiveField, RevenueSnapshot, OrderPreset, AdvancedOrderConfig } from './types';
import { marketMatchesWatchlistQuery } from './marketWatchlist';
import { emptyFatFingerLimits, type FatFingerLimits } from './execution/fatFinger';
import { onTimeframeChanged, startHlFeeds, stopHlFeeds, stopHlFeedsForDexSwitch } from './hl';
import { fixturesEnabled, type HealthStatus } from './productionTruth';
import { hyperliquidNetwork } from './hl/network';
import { marketCapabilities } from './marketCapabilities';
import {
	type EnablementReporter,
	noopEnablementReporter,
	classifyEnablementError
} from './execution/enablement';

export type { HealthStatus } from './productionTruth';

// DEX selection
export type Dex = 'hyperliquid' | 'lighter' | 'nado' | 'derive';
export const selectedDex: Writable<Dex> = writable('hyperliquid');

export const dexMeta: Record<Dex, { label: string; abbr: string; color: string }> = {
	hyperliquid: { label: 'Hyperliquid', abbr: 'HL', color: '#f97316' },
	lighter:     { label: 'Lighter',     abbr: 'LT', color: '#ffffff' },
	nado:        { label: 'Nado',        abbr: 'ND', color: '#ffffff' },
	derive:      { label: 'Derive',      abbr: 'DV', color: '#4fffcc' }
};

// Live market list (populated from Hyperliquid)
export const marketRegistry: Writable<MarketDescriptor[]> = writable([]);
export const perpMarketsList: Writable<MarketDescriptor[]> = writable([]);
export const spotMarketsList: Writable<MarketDescriptor[]> = writable([]);
export const outcomeMarketsList: Writable<MarketDescriptor[]> = writable([]);

// Chart state. chartCandles holds only completed/committed history bars;
// the current in-progress bar lives in liveCandle so every trade/candle tick
// updates one small object instead of copying the entire history array.
export const chartCandles: Writable<ChartCandle[]> = writable([]);
export const liveCandle: Writable<ChartCandle | null> = writable(null);
export const chartTimeframe: Writable<string> = writable('1h');

// Chart trading UX (Insilico-style)
export const designerMode: Writable<boolean> = writable(false);
export const clickPlacementMode: Writable<boolean> = writable(false);
export const priceInputFocused: Writable<boolean> = writable(false);
export const chartPreviewPrice: Writable<number | null> = writable(null);
export const chartInteraction: Writable<ChartInteractionMode> = writable({ kind: 'idle' });
export const chartActiveField: Writable<ChartActiveField> = writable('entry');
export const chartDraft: Writable<ChartDraft> = writable({});
export const clickPlacementSide: Writable<'auto' | 'buy' | 'sell'> = writable('auto');
export const chartRiskPercent: Writable<number> = writable(1);
export const marketType: Writable<MarketType> = writable('perp');
export const selectedMarket: Writable<MarketDescriptor | null> = writable(null);
export const selectedOption: Writable<OptionContract | null> = writable(null);
export const cliOpen: Writable<boolean> = writable(false);
export const cliHistory: Writable<CLICommand[]> = writable([]);

// Subaccount
export const demoFixturesEnabled = fixturesEnabled(
	import.meta.env.DEV,
	import.meta.env.VITE_ENABLE_DEMO_FIXTURES
);
const emptySubaccount: Subaccount = {
	id: 'primary',
	name: 'Primary',
	avatar: '',
	equity: 0,
	marginUsed: 0,
	marginFree: 0,
	leverage: 1
};
export const subaccounts: Writable<Subaccount[]> = writable([emptySubaccount]);
export const activeSubaccount: Writable<Subaccount> = writable(emptySubaccount);

// Independent health signals. Never infer account connectivity from public data.
export const isConnected: Writable<boolean> = writable(false);
export const walletAddress: Writable<string | null> = writable(null);
export const walletStatus: Writable<HealthStatus> = writable('idle');
export const marketDataStatus: Writable<HealthStatus> = writable('idle');
// Completed-candle automation must not treat the chart's trade-derived
// fallback as an authoritative candle stream. Keep that health independent.
export const candleDataStatus: Writable<HealthStatus> = writable('idle');
// Asset contexts own funding, OI, volume, index, and mark. Keep their health
// separate from book/trade/mid health so a stale context cannot look live.
export const marketContextStatus: Writable<HealthStatus> = writable('idle');
export const marketCatalogStatus: Writable<HealthStatus> = writable('idle');
export const accountSyncStatus: Writable<HealthStatus> = writable('idle');
export const activeAssetSyncStatus: Writable<HealthStatus> = writable('idle');
export const executionStatus: Writable<HealthStatus> = writable('idle');
export const algoServiceStatus: Writable<HealthStatus> = writable('idle');
export type DeadmanStatus = 'idle' | 'arming' | 'armed' | 'clearing' | 'uncertain';
export const deadmanStatus: Writable<DeadmanStatus> = writable('idle');

let boundProvider: any = null;
let accountsChangedHandler: ((accounts: string[]) => void) | null = null;
let providerDisconnectHandler: (() => void) | null = null;
let chainChangedHandler: (() => void) | null = null;

// Market data stores
const emptyOrderBook: OrderBook = { bids: [], asks: [], spread: 0, spreadPercent: 0 };
export const orderBook: Writable<OrderBook> = writable(emptyOrderBook);
export const recentTrades: Writable<Trade[]> = writable([]);

// User data stores
export const positions: Writable<Position[]> = writable([]);
export const openOrders: Writable<Order[]> = writable([]);
export const fills: Writable<Fill[]> = writable([]);
export const twapJobs: Writable<import('$lib/types').TwapJob[]> = writable([]);
export const localAlgoJobs: Writable<import('$lib/execution/algoJobs').LocalAlgoJob[]> = writable([]);
export const balances: Writable<Balance[]> = writable([]);
export const revenueSnapshot: Writable<RevenueSnapshot | null> = writable(null);
export const revenueSyncStatus: Writable<HealthStatus> = writable('idle');

// Options are unsupported in production until they have an authoritative venue feed.
const emptyOptionChain: OptionChain = { underlying: '', spotPrice: 0, expiries: [], strikes: [], contracts: [] };
export const optionChain: Writable<OptionChain> = writable(emptyOptionChain);
export const selectedExpiry: Writable<string> = writable('');
export const optionViewMode: Writable<'calls' | 'puts' | 'all'> = writable('all');
export const strikeRangeFilter: Writable<[number, number]> = writable([0, 0]);

// Order entry state
export const orderSide: Writable<OrderSide> = writable('buy');
export const orderType: Writable<OrderType> = writable('limit');
export const orderPrice: Writable<number | null> = writable(null);
export const orderSize: Writable<number> = writable(0);
export const orderLeverage: Writable<number> = writable(1);
export const reduceOnly: Writable<boolean> = writable(false);
export const postOnly: Writable<boolean> = writable(true);
export const ioc: Writable<boolean> = writable(false);

const FAT_FINGER_LIMITS_KEY = 'vice.fat-finger-limits.v1';
export const fatFingerLimits: Writable<FatFingerLimits> = writable(emptyFatFingerLimits());

function fatFingerStorageKey(address: string): string {
	return `${FAT_FINGER_LIMITS_KEY}:${hyperliquidNetwork.network}:${address.toLowerCase()}`;
}

function loadAccountFatFingerLimits(address: string | null): void {
	if (!address || typeof localStorage === 'undefined') {
		fatFingerLimits.set(emptyFatFingerLimits());
		return;
	}
	try {
		const raw = JSON.parse(localStorage.getItem(fatFingerStorageKey(address)) ?? '{}');
		fatFingerLimits.set({
			maxOrderNotional: typeof raw.maxOrderNotional === 'string' ? raw.maxOrderNotional : '',
			maxPositionNotionalByMarket: raw.maxPositionNotionalByMarket && typeof raw.maxPositionNotionalByMarket === 'object'
				? Object.fromEntries(Object.entries(raw.maxPositionNotionalByMarket).filter((entry): entry is [string, string] => typeof entry[1] === 'string'))
				: {}
		});
	} catch {
		fatFingerLimits.set(emptyFatFingerLimits());
	}
}

export function setFatFingerLimits(next: FatFingerLimits): void {
	const normalized: FatFingerLimits = {
		maxOrderNotional: next.maxOrderNotional.trim(),
		maxPositionNotionalByMarket: Object.fromEntries(Object.entries(next.maxPositionNotionalByMarket)
			.map(([marketKey, value]) => [marketKey, value.trim()])
			.filter(([, value]) => value.length > 0))
	};
	fatFingerLimits.set(normalized);
	const address = get(walletAddress);
	if (address && typeof localStorage !== 'undefined') localStorage.setItem(fatFingerStorageKey(address), JSON.stringify(normalized));
}

const ORDER_PRESETS_KEY = 'vice.order-presets.v1';
export const orderPresets: Writable<OrderPreset[]> = writable([]);

function presetStorageKey(address: string): string {
	return `${ORDER_PRESETS_KEY}:${hyperliquidNetwork.network}:${address.toLowerCase()}`;
}

function canUsePresetStorage(): boolean {
	return typeof localStorage !== 'undefined';
}

function loadAccountOrderPresets(address: string | null): void {
	if (!address || !canUsePresetStorage()) {
		orderPresets.set([]);
		return;
	}
	try {
		const parsed = JSON.parse(localStorage.getItem(presetStorageKey(address)) ?? '[]');
		orderPresets.set(Array.isArray(parsed) ? parsed.slice(0, 32) : []);
	} catch {
		orderPresets.set([]);
	}
}

function persistAccountOrderPresets(address: string | null, presets: OrderPreset[]): void {
	if (address && canUsePresetStorage()) localStorage.setItem(presetStorageKey(address), JSON.stringify(presets.slice(0, 32)));
}

export function saveOrderPreset(name: string): { ok: boolean; error?: string } {
	const address = get(walletAddress);
	const cleanName = name.trim().slice(0, 40);
	if (!address) return { ok: false, error: 'Connect the wallet before saving a preset' };
	if (!cleanName) return { ok: false, error: 'Preset name is required' };
	const now = Date.now();
	const preset: OrderPreset = {
		id: crypto.randomUUID(), name: cleanName, orderType: get(orderType), orderSide: get(orderSide),
		orderPrice: get(orderPrice), orderSize: get(orderSize), orderLeverage: get(orderLeverage),
		reduceOnly: get(reduceOnly), postOnly: get(postOnly), ioc: get(ioc),
		advancedConfig: { ...get(advancedConfig) }, createdAt: now, updatedAt: now
	};
	const next = [preset, ...get(orderPresets)].slice(0, 32);
	orderPresets.set(next);
	persistAccountOrderPresets(address, next);
	return { ok: true };
}

export function applyOrderPreset(preset: OrderPreset): void {
	orderType.set(preset.orderType);
	orderSide.set(preset.orderSide);
	orderPrice.set(preset.orderPrice);
	orderSize.set(preset.orderSize);
	orderLeverage.set(preset.orderLeverage);
	reduceOnly.set(preset.reduceOnly);
	postOnly.set(preset.ioc ? false : preset.postOnly);
	ioc.set(preset.ioc);
	advancedConfig.set({ ...preset.advancedConfig } as AdvancedOrderConfig);
}

export function deleteOrderPreset(id: string): void {
	const address = get(walletAddress);
	const next = get(orderPresets).filter((preset) => preset.id !== id);
	orderPresets.set(next);
	persistAccountOrderPresets(address, next);
}

/** Set order size from available margin using the selected market's venue precision. */
export function setOrderSizePercent(percent: number): void {
	const market = get(selectedMarket);
	const account = get(activeSubaccount);
	const leverage = get(orderLeverage);
	const capabilities = marketCapabilities(market); // market.quoteToken remains authoritative.
	const quoteAvailable = market?.kind === 'spot'
		? get(balances).find((balance) => balance.asset.toUpperCase() === market.quoteToken.toUpperCase())?.available ?? 0
		: account.marginFree;
	const effectiveLeverage = market?.kind === 'spot'
		? 1
		: Math.min(leverage, market?.maxLeverage ?? leverage);
	if (!market || market.lastPrice <= 0 || quoteAvailable <= 0 || effectiveLeverage <= 0) {
		orderSize.set(0);
		return;
	}
	const clampedPercent = Math.max(0, Math.min(100, percent));
	const maxSize = (quoteAvailable * effectiveLeverage) / market.lastPrice;
	const precision = 10 ** (market.szDecimals ?? 4);
	orderSize.set(Math.floor(maxSize * (clampedPercent / 100) * precision) / precision);
}

const DEFAULT_ADVANCED_CONFIG: AdvancedOrderConfig = {
	autoTakeProfitEnabled: false,
	autoTakeProfitStartPrice: 0,
	autoTakeProfitEndPrice: 0,
	autoTakeProfitLevels: 3,
	autoTakeProfitSkew: 1,
	scaleLevels: 5,
	scaleStartPrice: 0,
	scaleEndPrice: 0,
	scaleSkew: 1,
	twapDuration: 30,
	twapIntervals: 10,
	twapRandomize: true,
	adaptiveDuration: 30,
	adaptiveIntervals: 10,
	adaptiveParticipation: 0.1,
	adaptiveOffsetTicks: 1,
	povParticipation: 0.1,
	povWindowTrades: 20,
	breakEvenTrigger: 0,
	breakEvenOffset: 0,
	volatilityLookback: 20,
	volatilityMultiplier: 2,
	chaseOffset: 1,
	chaseMaxChases: 20,
	makerOffsetTicks: 0,
	conditionalTriggerPrice: 0,
	conditionalTriggerKind: 'stop',
	conditionalTriggerSource: 'priceCross',
	swarmOrders: 8,
	swarmSpread: 0.5,
	icebergDisplaySize: 0.1,
	icebergWaitForFill: true,
	icebergFillPollMs: 500,
	icebergFillTimeoutMs: 0,
	icebergRefillMs: 1500,
	takeProfit: 0,
	stopLoss: 0,
	trailOffset: 0.5,
	pingPongRange: 1,
	pingPongCycles: 5
};
export const advancedConfig: Writable<AdvancedOrderConfig> = writable({ ...DEFAULT_ADVANCED_CONFIG });

// UI state
export const bottomPanelTab: Writable<'positions' | 'orders' | 'twaps' | 'algos' | 'fills'> = writable('positions');
export const bottomPanelHeight: Writable<number> = writable(250);
export const searchQuery: Writable<string> = writable('');
export const hotkeysEnabled: Writable<boolean> = writable(true);

// Options are not a production surface yet; fixtures remain development-only.
export const portfolioGreeks = writable({ delta: 0, gamma: 0, theta: 0, vega: 0, netDelta: 0, netGamma: 0, netTheta: 0, netVega: 0 });

async function loadDevelopmentFixtures(): Promise<void> {
	if (!demoFixturesEnabled) return;
	const fixtures = await import('./data');
	const demoBase = fixtures.perpMarkets[0];
	const demoMarket: MarketDescriptor = {
		marketKey: 'perp:BTC',
		apiCoin: 'BTC',
		assetId: 0,
		kind: 'corePerp',
		dex: null,
		baseToken: 'BTC',
		quoteToken: 'USD',
		szDecimals: 5,
		priceDecimals: 1,
		maxLeverage: 50,
		symbol: demoBase.symbol,
		name: demoBase.name,
		type: 'perp',
		lastPrice: demoBase.lastPrice,
		change24h: demoBase.change24h,
		changePercent24h: demoBase.changePercent24h,
		volume24h: demoBase.volume24h,
		openInterest: demoBase.openInterest,
		fundingRate: demoBase.fundingRate,
		markPrice: demoBase.markPrice,
		indexPrice: demoBase.indexPrice
	};
	const fixtureSubaccounts = fixtures.mockSubaccounts;
	marketRegistry.set([demoMarket]);
	perpMarketsList.set([demoMarket]);
	selectedMarket.set(demoMarket);
	orderPrice.set(demoMarket.lastPrice);
	chartCandles.set(fixtures.btcChartData);
	subaccounts.set(fixtureSubaccounts);
	activeSubaccount.set(fixtureSubaccounts[0] ?? emptySubaccount);
	const basePrice = demoMarket.lastPrice;
	orderBook.set(fixtures.generateOrderBook(basePrice));
	recentTrades.set(fixtures.generateRecentTrades(basePrice));
	positions.set(fixtures.mockPositions);
	openOrders.set(fixtures.mockOrders);
	fills.set(fixtures.mockFills);
	balances.set(fixtures.mockBalances);
	optionChain.set(fixtures.btcOptionChain);
	selectedExpiry.set(fixtures.btcOptionChain.expiries[0] ?? '');
	strikeRangeFilter.set([
		fixtures.btcOptionChain.strikes[0] ?? 0,
		fixtures.btcOptionChain.strikes.at(-1) ?? 0
	]);
	portfolioGreeks.set(fixtures.mockPortfolioGreeks);
	isConnected.set(true);
	walletAddress.set('0x000000000000000000000000000000000000dE0');
	walletStatus.set('live');
	marketDataStatus.set('live');
	marketContextStatus.set('live');
	marketCatalogStatus.set('live');
	accountSyncStatus.set('live');
	activeAssetSyncStatus.set('live');
	executionStatus.set('live');
}

if (demoFixturesEnabled) void loadDevelopmentFixtures();

// Derived stores
export const filteredMarkets: Readable<MarketDescriptor[]> = derived(
	[marketType, searchQuery, perpMarketsList, spotMarketsList, outcomeMarketsList],
	([$marketType, $searchQuery, $perpMarketsList, $spotMarketsList, $outcomeMarketsList]) => {
		const markets =
			$marketType === 'spot'
				? $spotMarketsList
				: $marketType === 'prediction'
					? $outcomeMarketsList
					: $perpMarketsList;
		return markets.filter((market) => marketMatchesWatchlistQuery(market, $searchQuery));
	}
);

export const filteredOptionContracts: Readable<OptionContract[]> = derived(
	[optionChain, selectedExpiry, optionViewMode, strikeRangeFilter],
	([$optionChain, $selectedExpiry, $optionViewMode, $strikeRangeFilter]) => {
		let contracts = $optionChain.contracts.filter(c => c.expiry === $selectedExpiry);

		if ($optionViewMode !== 'all') {
			contracts = contracts.filter(c => c.optionType === ($optionViewMode === 'calls' ? 'call' : 'put'));
		}

		contracts = contracts.filter(c =>
			c.strike >= $strikeRangeFilter[0] && c.strike <= $strikeRangeFilter[1]
		);

		return contracts.sort((a, b) => a.strike - b.strike);
	}
);

export const totalUnrealizedPnl: Readable<number> = derived(
	positions,
	($positions) => $positions.reduce((sum, p) => sum + p.unrealizedPnl, 0)
);

export const totalEquity: Readable<number> = derived(
	balances,
	($balances) => {
		const stableBalance = $balances.find((b) => b.asset === 'USDC' || b.asset === 'USDT');
		return stableBalance?.equity || 0;
	}
);

// Actions
function resetMarketBoundState(market: MarketDescriptor | null): void {
	orderType.set('limit');
	orderSide.set('buy');
	orderPrice.set(market && market.lastPrice > 0 ? market.lastPrice : null);
	orderSize.set(0);
	orderLeverage.set(1);
	reduceOnly.set(false);
	postOnly.set(true);
	ioc.set(false);
	advancedConfig.set({ ...DEFAULT_ADVANCED_CONFIG });
	designerMode.set(false);
	clickPlacementMode.set(false);
	clickPlacementSide.set('auto');
	chartPreviewPrice.set(null);
	chartDraft.set({});
	chartInteraction.set({ kind: 'idle' });
	chartActiveField.set('entry');
	chartCandles.set([]);
	liveCandle.set(null);
	orderBook.set(emptyOrderBook);
	recentTrades.set([]);
	marketDataStatus.set('connecting');
}

export function selectMarket(market: MarketDescriptor) {
	selectedMarket.set(market);
	resetMarketBoundState(market);
	void import('./hl/account')
		.then(({ setActiveAccountAsset }) => setActiveAccountAsset(market))
		.catch((e) => console.error('[hl] active account asset change failed:', e));
}

/** Switch the one selected public feed and wait for that exact market to prove live. */
export async function selectMarketForExecution(market: MarketDescriptor, timeoutMs = 12_000): Promise<boolean> {
	if (typeof window === 'undefined' || !Number.isFinite(timeoutMs) || timeoutMs <= 0) return false;
	const registered = get(marketRegistry).find((candidate) => candidate.marketKey === market.marketKey && candidate.apiCoin === market.apiCoin);
	if (!registered) return false;
	resetMarketBoundState(registered);
	selectedMarket.set(registered);
	try {
		const { setActiveAccountAsset } = await import('./hl/account');
		await setActiveAccountAsset(registered);
	} catch {
		return false;
	}
	return new Promise((resolve) => {
		let done = false;
		let selectedUnsubscribe: (() => void) | undefined;
		let statusUnsubscribe: (() => void) | undefined;
		const finish = (value: boolean) => {
			if (done) return;
			done = true;
			clearTimeout(timer);
			selectedUnsubscribe?.();
			statusUnsubscribe?.();
			resolve(value);
		};
		const check = () => {
			const selected = get(selectedMarket);
			if (selected?.marketKey === registered.marketKey && selected.apiCoin === registered.apiCoin && get(marketDataStatus) === 'live') finish(true);
		};
		const timer = setTimeout(() => finish(false), timeoutMs);
		selectedUnsubscribe = selectedMarket.subscribe(check);
		statusUnsubscribe = marketDataStatus.subscribe(check);
		check();
	});
}

export function setChartTimeframe(tf: string) {
	chartTimeframe.set(tf);
	void onTimeframeChanged(tf).catch((e) => console.error('[hl] timeframe change failed:', e));
}

export function setMarketType(type: MarketType) {
	marketType.set(type);
	const query = get(searchQuery);
	const registry = get(marketRegistry);
	const next =
		type === 'spot'
			? registry.find((market) => market.kind === 'spot' && marketMatchesWatchlistQuery(market, query))
			: type === 'prediction'
				? registry.find((market) => market.kind === 'outcome' && marketMatchesWatchlistQuery(market, query))
				: registry.find((market) => (market.kind === 'corePerp' || market.kind === 'hip3Perp') && marketMatchesWatchlistQuery(market, query));
	if (next) {
		selectMarket(next);
		return;
	}
	selectedMarket.set(null);
	resetMarketBoundState(null);
}

export function selectOptionContract(contract: OptionContract) {
	selectedOption.set(contract);
	orderPrice.set(contract.ask);
}

async function activateWallet(address: string): Promise<void> {
	// Invalidate the previous account before touching the new provider address.
	// This prevents stale private state from being displayed during wallet
	// switching or reconnect.
	isConnected.set(false);
	openOrders.set([]);
	positions.set([]);
	fills.set([]);
	twapJobs.set([]);
	balances.set([]);
	revenueSnapshot.set(null);
	revenueSyncStatus.set('idle');
	activeSubaccount.set({ ...emptySubaccount });
	walletStatus.set('connecting');
	accountSyncStatus.set('connecting');
	try {
		walletAddress.set(address);
		loadAccountOrderPresets(address);
		loadAccountFatFingerLimits(address);
		const { startAccountSubscriptions } = await import('./hl/account');
		await startAccountSubscriptions(address);
		isConnected.set(true);
		walletStatus.set('live');
	} catch (error) {
		isConnected.set(false);
		walletAddress.set(null);
		orderPresets.set([]);
		fatFingerLimits.set(emptyFatFingerLimits());
		walletStatus.set('error');
		accountSyncStatus.set('error');
		throw error;
	}
}

function unbindWalletProvider(): void {
	if (!boundProvider?.removeListener) return;
	if (accountsChangedHandler) boundProvider.removeListener('accountsChanged', accountsChangedHandler);
	if (providerDisconnectHandler) boundProvider.removeListener('disconnect', providerDisconnectHandler);
	if (chainChangedHandler) boundProvider.removeListener('chainChanged', chainChangedHandler);
	boundProvider = null;
	accountsChangedHandler = null;
	providerDisconnectHandler = null;
	chainChangedHandler = null;
}

function bindWalletProvider(provider: any): void {
	unbindWalletProvider();
	if (!provider?.on) return;
	boundProvider = provider;
	accountsChangedHandler = (accounts: string[]) => {
		const next = accounts[0];
		if (!next) {
			disconnectWallet();
			return;
		}
		if (next.toLowerCase() === get(walletAddress)?.toLowerCase()) return;
		void import('./execution/localExecution').then(({ localExecution }) => localExecution.lock());
		executionStatus.set('idle');
		void activateWallet(next).catch(() => disconnectWallet());
	};
	providerDisconnectHandler = () => disconnectWallet();
	chainChangedHandler = () => {
		void import('./execution/localExecution').then(({ localExecution }) => localExecution.lock());
		executionStatus.set('idle');
	};
	provider.on('accountsChanged', accountsChangedHandler);
	provider.on('disconnect', providerDisconnectHandler);
	provider.on('chainChanged', chainChangedHandler);
}

export async function connectWallet(): Promise<void> {
	walletStatus.set('connecting');

	if (typeof window !== 'undefined' && (window as any).ethereum) {
		try {
			const accounts: string[] = await (window as any).ethereum.request({
				method: 'eth_requestAccounts'
			});
			if (accounts[0]) {
				await activateWallet(accounts[0]);
				bindWalletProvider((window as any).ethereum);
				return;
			}
		} catch {
			walletStatus.set('idle');
			return;
		}
	}

	walletStatus.set('idle');
}

let activeEnablementAbortController: AbortController | null = null;

export function cancelEnableTrading(): void {
	activeEnablementAbortController?.abort();
	activeEnablementAbortController = null;
	executionStatus.set('idle');
	void import('./execution/localExecution').then(({ localExecution }) => localExecution.lock());
}

export async function enableTrading(
	options: { approveBuilder?: boolean } = {},
	onPhase?: EnablementReporter
): Promise<void> {
	const report = onPhase ?? noopEnablementReporter;
	activeEnablementAbortController?.abort();
	const controller = new AbortController();
	activeEnablementAbortController = controller;
	const { assertTradingAllowed, assertFreshExecutionState } = await import('./execution/releaseSafety');
	assertTradingAllowed();
	const address = get(walletAddress);
	const provider = typeof window !== 'undefined' ? (window as any).ethereum : null;
	if (!address || !provider) {
		const notConnected = classifyEnablementError(
			new Error('Connect a browser wallet before enabling trading')
		);
		report({ kind: 'error', error: notConnected, detail: notConnected.message });
		throw new Error('Connect a browser wallet before enabling trading');
	}
	// Do not prompt for a master-wallet signature or start persisted local
	// algorithms while either authoritative account state or the selected public
	// market feed is stale. Mutations enforce the same invariant, but rejecting
	// here prevents a misleading "trading live" session during recovery.
	assertFreshExecutionState(get(isConnected), get(accountSyncStatus), get(marketDataStatus));
	executionStatus.set('connecting');
	try {
		const { localExecution } = await import('./execution/localExecution');
		await localExecution.initialize(provider, address, options, report);
		if (controller.signal.aborted) {
			localExecution.lock();
			executionStatus.set('idle');
			return;
		}
		// Establish the account scope before any algorithm recovery. Every local
		// state machine must read/write the same unlocked wallet namespace; relying
		// on one recovery helper to set this creates order-dependent recovery bugs.
		const { setLocalAlgoOwner } = await import('./execution/algoJobs');
		setLocalAlgoOwner(address);
		const { pauseRestartUnsafeLocalAlgoJobs } = await import('./execution/algoJobs');
		pauseRestartUnsafeLocalAlgoJobs();
		const { resumePersistedChases } = await import('./execution/chase');
		resumePersistedChases();
		const { resumePersistedOcos } = await import('./execution/oco');
		resumePersistedOcos();
		const { resumePersistedTrailings } = await import('./execution/trailing');
		resumePersistedTrailings();
		const { resumePersistedIcebergs } = await import('./execution/iceberg');
		resumePersistedIcebergs();
		const { resumePersistedSwarms } = await import('./execution/swarm');
		resumePersistedSwarms();
		const { resumePersistedPingPongs } = await import('./execution/pingPong');
		resumePersistedPingPongs();
		const { resumePersistedAdaptiveExecutions } = await import('./execution/adaptiveTwap');
		resumePersistedAdaptiveExecutions();
		const { resumePersistedPovs } = await import('./execution/pov');
		resumePersistedPovs();
		const { resumePersistedBreakEvens } = await import('./execution/breakEven');
		resumePersistedBreakEvens();
		const { resumePersistedConditionalLadders } = await import('./execution/conditionalLadder');
		resumePersistedConditionalLadders();
		const { resumePersistedScales } = await import('./execution/scale');
		resumePersistedScales();
		if (controller.signal.aborted) {
			localExecution.lock();
			executionStatus.set('idle');
			return;
		}
		activeEnablementAbortController = null;
		executionStatus.set('live');
	} catch (error) {
		const { localExecution } = await import('./execution/localExecution');
		localExecution.lock();
		if (controller.signal.aborted) {
			activeEnablementAbortController = null;
			executionStatus.set('idle');
			return;
		}
		// Initialization may have unlocked a local agent before reconciliation or
		// persisted-algorithm recovery failed. Do not leave a usable signer behind
		// while the UI reports an errored trading session.
		executionStatus.set('error');
		const classified = classifyEnablementError(error);
		report({ kind: 'error', error: classified, detail: classified.message });
		throw error;
	}
}

export function disconnectWallet() {
	cancelEnableTrading();
	unbindWalletProvider();
	void import('./hl/account').then(({ stopAccountSubscriptions }) => stopAccountSubscriptions());
	void import('./execution/localExecution').then(({ localExecution }) => localExecution.lock());
	void import('./execution/chase').then(async ({ stopAllChaseTimers }) => {
		stopAllChaseTimers();
		const { setLocalAlgoOwner } = await import('./execution/algoJobs');
		setLocalAlgoOwner(null);
	});
	void import('./execution/oco').then(({ stopAllOcoTimers }) => stopAllOcoTimers());
	void import('./execution/trailing').then(({ stopAllTrailingTimers }) => stopAllTrailingTimers());
	void import('./execution/iceberg').then(({ stopAllIcebergTimers }) => stopAllIcebergTimers());
	void import('./execution/swarm').then(({ stopAllSwarmTimers }) => stopAllSwarmTimers());
	void import('./execution/pingPong').then(({ stopAllPingPongTimers }) => stopAllPingPongTimers());
	void import('./execution/adaptiveTwap').then(({ stopAllAdaptiveTimers }) => stopAllAdaptiveTimers());
	void import('./execution/pov').then(({ stopAllPovTimers }) => stopAllPovTimers());
	void import('./execution/breakEven').then(({ stopAllBreakEvenTimers }) => stopAllBreakEvenTimers());
	void import('./execution/conditionalLadder').then(({ stopAllConditionalLadderTimers }) => stopAllConditionalLadderTimers());
	isConnected.set(false);
	walletAddress.set(null);
	orderPresets.set([]);
	walletStatus.set('idle');
	accountSyncStatus.set('idle');
	executionStatus.set('idle');
	deadmanStatus.set('idle');
	localAlgoJobs.set([]);
	activeSubaccount.set({ ...emptySubaccount });
}

export function toggleCLI() {
	cliOpen.update(v => !v);
}

export async function executeCliCommand(input: string): Promise<CLICommand> {
	const { runCliCommand } = await import('./cli/executor');
	const cmd = await runCliCommand(input);
	cliHistory.update((h) => [...h, cmd]);
	return cmd;
}

export function setSubaccount(sub: Subaccount) {
	activeSubaccount.set(sub);
}

export function onDexChanged(dex: Dex): void {
	if (dex === 'hyperliquid') {
		const market = get(selectedMarket);
		startHlFeeds(market?.apiCoin);
	} else {
		stopHlFeedsForDexSwitch();
		marketDataStatus.set('idle');
	}
}
let feedsStarted = false;

export function startPriceUpdates() {
	if (feedsStarted) return;
	if (demoFixturesEnabled) return;
	feedsStarted = true;
	startHlFeeds().catch((e) => console.error('[hl] feed start failed:', e));
}

export function stopPriceUpdates() {
	if (!feedsStarted) return;
	feedsStarted = false;
	stopHlFeeds().catch((e) => console.error('[hl] feed stop failed:', e));
}
