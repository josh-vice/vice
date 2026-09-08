import { writable, derived, get, type Writable, type Readable } from 'svelte/store';
import type { MarketDescriptor, OrderBook, Position, Order, Fill, Balance, Trade, Subaccount, CLICommand, MarketType, OrderSide, OrderType, ChartCandle, ChartInteractionMode, ChartDraft, ChartActiveField, OrderPreset, AdvancedOrderConfig } from './types';
import { marketMatchesWatchlistQuery } from './marketWatchlist';
import { firstMarketForType } from './marketSelectionModel';
import { emptyFatFingerLimits, type FatFingerLimits } from './execution/fatFinger';
import { onTimeframeChanged, startHlFeeds, stopHlFeeds } from './hl/subscriptions';
import { type HealthStatus } from './productionTruth';
import { hyperliquidNetwork, hyperliquidPublicNetwork } from './hl/network';
import { loadFastCachedCandleHistory } from './hl/candleCache';
import { marketCapabilities } from './marketCapabilities';
import {
	type EnablementReporter,
	noopEnablementReporter,
	classifyEnablementError
} from './execution/enablement';
import { discoverWalletProviders, requestWalletAccounts, type DiscoveredWallet } from './walletProviders';

export type { HealthStatus } from './productionTruth';


// Live market list (populated from Hyperliquid)
export const marketRegistry: Writable<MarketDescriptor[]> = writable([]);
export const perpMarketsList: Writable<MarketDescriptor[]> = writable([]);
export const spotMarketsList: Writable<MarketDescriptor[]> = writable([]);

// Chart state. chartCandles holds only completed/committed history bars;
// the current in-progress bar lives in liveCandle so every trade/candle tick
// updates one small object instead of copying the entire history array.
export const chartCandles: Writable<ChartCandle[]> = writable([]);
export const liveCandle: Writable<ChartCandle | null> = writable(null);
export type ChartHistoryStatus = 'idle' | 'loading' | 'ready' | 'error';
/** History loading is separate from candle-feed health so a first live tick
 * cannot paint a misleading one-bar chart while REST history is in flight. */
export const chartHistoryStatus: Writable<ChartHistoryStatus> = writable('idle');
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
export const cliOpen: Writable<boolean> = writable(false);
export const cliHistory: Writable<CLICommand[]> = writable([]);

// Subaccount
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
export const walletError: Writable<string> = writable('');
export const walletCandidates: Writable<DiscoveredWallet[]> = writable([]);
export const walletSelectionOpen: Writable<boolean> = writable(false);
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
let activeWalletProvider: DiscoveredWallet['provider'] | null = null;
let walletConnectGeneration = 0;
let walletConnectInFlight = false;
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
export const bottomPanelTab: Writable<'positions' | 'orders' | 'twaps' | 'algos' | 'balances' | 'fills'> = writable('positions');
export const bottomPanelHeight: Writable<number> = writable(250);
export const searchQuery: Writable<string> = writable('');
export const hotkeysEnabled: Writable<boolean> = writable(true);


// Derived stores
export const filteredMarkets: Readable<MarketDescriptor[]> = derived(
	[marketType, searchQuery, perpMarketsList, spotMarketsList],
	([$marketType, $searchQuery, $perpMarketsList, $spotMarketsList]) => {
		const markets = $marketType === 'spot' ? $spotMarketsList : $perpMarketsList;
		return markets.filter((market) => marketMatchesWatchlistQuery(market, $searchQuery));
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
function sameMarket(left: MarketDescriptor | null, right: MarketDescriptor | null): boolean {
	return Boolean(left && right && left.marketKey === right.marketKey && left.apiCoin === right.apiCoin);
}

function resetMarketBoundState(market: MarketDescriptor | null, preserveChart = false): void {
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
	if (!preserveChart) {
		const cached = market
			? loadFastCachedCandleHistory(hyperliquidPublicNetwork.network, market.marketKey, market.apiCoin, get(chartTimeframe))
			: [];
		if (cached.length > 0) {
			// Populate both stores in the same synchronous selection turn. The chart
			// can therefore switch to a previously visited market without exposing
			// an empty or one-candle intermediate dataset.
			chartCandles.set(cached.slice(0, -1));
			liveCandle.set(cached[cached.length - 1]);
			chartHistoryStatus.set('ready');
		} else {
			chartCandles.set([]);
			liveCandle.set(null);
			chartHistoryStatus.set(market ? 'loading' : 'idle');
		}
	}
	orderBook.set(emptyOrderBook);
	recentTrades.set([]);
	marketDataStatus.set('connecting');
}

export function selectMarket(market: MarketDescriptor) {
	const previous = get(selectedMarket);
	selectedMarket.set(market);
	resetMarketBoundState(market, sameMarket(previous, market));
	void import('./hl/account')
		.then(({ setActiveAccountAsset }) => setActiveAccountAsset(market))
		.catch((e) => console.error('[hl] active account asset change failed:', e));
}

/** Switch the one selected public feed and wait for that exact market to prove live. */
export async function selectMarketForExecution(market: MarketDescriptor, timeoutMs = 12_000): Promise<boolean> {
	if (typeof window === 'undefined' || !Number.isFinite(timeoutMs) || timeoutMs <= 0) return false;
	const registered = get(marketRegistry).find((candidate) => candidate.marketKey === market.marketKey && candidate.apiCoin === market.apiCoin);
	if (!registered) return false;
	const previous = get(selectedMarket);
	selectedMarket.set(registered);
	resetMarketBoundState(registered, sameMarket(previous, registered));
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
	const next = firstMarketForType(registry, type, query);
	if (next) {
		selectMarket(next);
		return;
	}
	selectedMarket.set(null);
	resetMarketBoundState(null);
}


async function activateWallet(address: string, generation = walletConnectGeneration): Promise<boolean> {
	// Invalidate the previous account before touching the new provider address.
	// This prevents stale private state from being displayed during wallet
	// switching or reconnect.
	if (generation !== walletConnectGeneration) return false;
	isConnected.set(false);
	openOrders.set([]);
	positions.set([]);
	fills.set([]);
	twapJobs.set([]);
	balances.set([]);
	activeSubaccount.set({ ...emptySubaccount });
	walletStatus.set('connecting');
	accountSyncStatus.set('connecting');
	try {
		walletAddress.set(address);
		loadAccountOrderPresets(address);
		loadAccountFatFingerLimits(address);
		const { startAccountSubscriptions, stopAccountSubscriptions } = await import('./hl/account');
		await startAccountSubscriptions(address);
		if (generation !== walletConnectGeneration) {
			await stopAccountSubscriptions();
			return false;
		}
		isConnected.set(true);
		walletStatus.set('live');
		return true;
	} catch (error) {
		if (generation === walletConnectGeneration) {
			isConnected.set(false);
			walletAddress.set(null);
			orderPresets.set([]);
			fatFingerLimits.set(emptyFatFingerLimits());
			walletStatus.set('error');
			accountSyncStatus.set('error');
		}
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

async function stopLocalExecutionFamilies(): Promise<void> {
	// Explicit lazy imports avoid a Vite dynamic-import warning while preserving
	// the cycle-breaking load boundary between stores and execution modules.
	const stoppers = await Promise.all([
		import('./execution/scale').then(({ stopAllScaleTimers }) => stopAllScaleTimers),
		import('./execution/chase').then(({ stopAllChaseTimers }) => stopAllChaseTimers),
		import('./execution/oco').then(({ stopAllOcoTimers }) => stopAllOcoTimers),
		import('./execution/trailing').then(({ stopAllTrailingTimers }) => stopAllTrailingTimers),
		import('./execution/iceberg').then(({ stopAllIcebergTimers }) => stopAllIcebergTimers),
		import('./execution/swarm').then(({ stopAllSwarmTimers }) => stopAllSwarmTimers),
		import('./execution/pingPong').then(({ stopAllPingPongTimers }) => stopAllPingPongTimers),
		import('./execution/adaptiveTwap').then(({ stopAllAdaptiveTimers }) => stopAllAdaptiveTimers),
		import('./execution/pov').then(({ stopAllPovTimers }) => stopAllPovTimers),
		import('./execution/breakEven').then(({ stopAllBreakEvenTimers }) => stopAllBreakEvenTimers),
		import('./execution/conditionalLadder').then(({ stopAllConditionalLadderTimers }) => stopAllConditionalLadderTimers)
	]);
	for (const stop of stoppers) stop();
	const { setLocalAlgoOwner } = await import('./execution/algoJobs');
	setLocalAlgoOwner(null);
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
		walletConnectGeneration += 1;
		executionStatus.set('idle');
		void stopLocalExecutionFamilies().then(() => activateWallet(next)).catch(() => disconnectWallet());
	};
	providerDisconnectHandler = () => disconnectWallet();
	chainChangedHandler = () => {
		void stopLocalExecutionFamilies();
		void import('./execution/localExecution').then(({ localExecution }) => localExecution.lock());
		executionStatus.set('idle');
	};
	provider.on('accountsChanged', accountsChangedHandler);
	provider.on('disconnect', providerDisconnectHandler);
	provider.on('chainChanged', chainChangedHandler);
}

async function connectProvider(wallet: DiscoveredWallet): Promise<void> {
	if (walletConnectInFlight) return;
	walletConnectInFlight = true;
	const generation = ++walletConnectGeneration;
	walletSelectionOpen.set(false);
	walletCandidates.set([]);
	walletError.set('');
	walletStatus.set('connecting');
	try {
		const accounts = await requestWalletAccounts(wallet.provider);
		if (generation !== walletConnectGeneration) return;
		if (!accounts[0]) throw new Error(`${wallet.name} did not return an account`);
		if (!(await activateWallet(accounts[0], generation))) return;
		if (generation !== walletConnectGeneration) return;
		activeWalletProvider = wallet.provider;
		bindWalletProvider(wallet.provider);
	} catch (error) {
		if (generation !== walletConnectGeneration) return;
		walletStatus.set('error');
		walletError.set(error instanceof Error ? error.message : `${wallet.name} connection failed`);
	} finally {
		walletConnectInFlight = false;
	}

	}
export async function connectWallet(): Promise<void> {
	if (walletConnectInFlight) return;
	walletError.set('');
	walletStatus.set('connecting');
	try {
		const wallets = await discoverWalletProviders();
		if (wallets.length === 0) {
			walletStatus.set('error');
			walletError.set('No EVM wallet found. Install MetaMask, Rabby, Coinbase Wallet, Brave Wallet, or another EIP-6963 wallet.');
			return;
		}
		if (wallets.length > 1) {
			walletCandidates.set(wallets);
			walletSelectionOpen.set(true);
			walletStatus.set('idle');
			return;
		}
		await connectProvider(wallets[0]);
	} catch (error) {
		walletStatus.set('error');
		walletError.set(error instanceof Error ? error.message : 'Wallet discovery failed');
	}
}

export function selectWalletProvider(wallet: DiscoveredWallet): void {
	if (walletConnectInFlight) return;
	void connectProvider(wallet);
}

export function cancelWalletSelection(): void {
	walletConnectGeneration += 1;
	walletSelectionOpen.set(false);
	walletCandidates.set([]);
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
	options: { takeover?: boolean } = {},
	onPhase?: EnablementReporter
): Promise<void> {
	const report = onPhase ?? noopEnablementReporter;
	activeEnablementAbortController?.abort();
	const controller = new AbortController();
	activeEnablementAbortController = controller;
	const { assertTradingAllowed, assertFreshExecutionState } = await import('./execution/releaseSafety');
	assertTradingAllowed();
	const address = get(walletAddress);
	const provider = activeWalletProvider ?? (typeof window !== 'undefined' ? (window as any).ethereum : null);
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
	if (options.takeover) {
		const { refreshAccountSnapshot } = await import('./hl/account');
		if (!(await refreshAccountSnapshot(address))) throw new Error('Fresh account reconciliation is required before taking over secure trading');
	}
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
	void stopLocalExecutionFamilies();
	isConnected.set(false);
	activeWalletProvider = null;
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

let feedsStarted = false;

export function startPriceUpdates() {
	if (feedsStarted) return;
	feedsStarted = true;
	startHlFeeds().catch((e) => console.error('[hl] feed start failed:', e));
}

export function stopPriceUpdates() {
	if (!feedsStarted) return;
	feedsStarted = false;
	stopHlFeeds().catch((e) => console.error('[hl] feed stop failed:', e));
}
