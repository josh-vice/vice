import { get, writable, type Writable } from 'svelte/store';
import { hyperliquidNetwork } from './hl/network';
import { marketDataStatus, marketRegistry, recentTrades, selectedMarket } from './stores';
import type { MarketDescriptor } from './types';

export type PriceAlertDirection = 'above' | 'below';

export type PriceAlert = {
	id: string;
	marketKey: string;
	apiCoin: string;
	symbol: string;
	direction: PriceAlertDirection;
	threshold: number;
	createdAt: number;
};

export type PriceAlertNotice = {
	alertIds: string[];
	marketKey: string;
	message: string;
	firedAt: number;
} | null;

const STORAGE_KEY = `vice.price-alerts.v1:${hyperliquidNetwork.network}`;
const MAX_ALERTS = 64;

export const priceAlerts: Writable<PriceAlert[]> = writable([]);
export const priceAlertNotice: Writable<PriceAlertNotice> = writable(null);

let loaded = false;
let lastLivePriceByMarket = new Map<string, number>();
let paused = true;
let indexedAlerts: PriceAlert[] | undefined;
let alertsByMarket = new Map<string, PriceAlert[]>();
let watchedMarketKeys: string[] = [];

function canUseStorage(): boolean {
	return typeof localStorage !== 'undefined';
}

function validAlert(value: unknown): value is PriceAlert {
	if (!value || typeof value !== 'object') return false;
	const alert = value as Partial<PriceAlert>;
	return typeof alert.id === 'string' && typeof alert.marketKey === 'string' &&
		typeof alert.apiCoin === 'string' && typeof alert.symbol === 'string' &&
		(alert.direction === 'above' || alert.direction === 'below') &&
		typeof alert.threshold === 'number' && Number.isFinite(alert.threshold) && alert.threshold > 0 &&
		typeof alert.createdAt === 'number' && Number.isFinite(alert.createdAt);
}

function persist(alerts: PriceAlert[]): void {
	if (!canUseStorage()) return;
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts.slice(0, MAX_ALERTS)));
	} catch {
		// Alerts are a local convenience. A storage failure must not affect the
		// public feed or trading path.
	}
}

function refreshAlertIndex(): void {
	const alerts = get(priceAlerts);
	if (alerts === indexedAlerts) return;
	indexedAlerts = alerts;
	alertsByMarket = new Map();
	for (const alert of alerts) {
		const marketAlerts = alertsByMarket.get(alert.marketKey);
		if (marketAlerts) marketAlerts.push(alert);
		else alertsByMarket.set(alert.marketKey, [alert]);
	}
	watchedMarketKeys = [...alertsByMarket.keys()];
}

export function loadPriceAlerts(): PriceAlert[] {
	if (loaded) return get(priceAlerts);
	loaded = true;
	if (!canUseStorage()) return [];
	try {
		const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
		const alerts = Array.isArray(parsed) ? parsed.filter(validAlert).slice(0, MAX_ALERTS) : [];
		priceAlerts.set(alerts);
		return alerts;
	} catch {
		priceAlerts.set([]);
		return [];
	}
}

export function createPriceAlert(
	market: MarketDescriptor | null,
	direction: PriceAlertDirection,
	threshold: number
): { ok: true; alert: PriceAlert } | { ok: false; error: string } {
	loadPriceAlerts();
	if (!market) return { ok: false, error: 'Select a live market before adding an alert' };
	if (!Number.isFinite(threshold) || threshold <= 0) return { ok: false, error: 'Alert price must be greater than zero' };
	const alert: PriceAlert = {
		id: crypto.randomUUID(), marketKey: market.marketKey, apiCoin: market.apiCoin,
		symbol: market.symbol, direction, threshold, createdAt: Date.now()
	};
	priceAlerts.update((current) => {
		const next = [alert, ...current].slice(0, MAX_ALERTS);
		persist(next);
		return next;
	});
	// A newly-created alert needs a new live observation. It must not fire
	// solely because the current price already sits across its threshold.
	lastLivePriceByMarket.delete(market.marketKey);
	return { ok: true, alert };
}

export function removePriceAlert(id: string): void {
	priceAlerts.update((current) => {
		const next = current.filter((alert) => alert.id !== id);
		persist(next);
		return next;
	});
}

export function clearPriceAlertNotice(): void {
	priceAlertNotice.set(null);
}

function crossed(direction: PriceAlertDirection, previous: number, current: number, threshold: number): boolean {
	return direction === 'above'
		? previous < threshold && current >= threshold
		: previous > threshold && current <= threshold;
}

function pauseAllAlerts(): void {
	paused = true;
	lastLivePriceByMarket.clear();
}

function observeAlertCandidates(marketKey: string, price: number, candidates: PriceAlert[]): void {
	if (!Number.isFinite(price) || price <= 0) {
		lastLivePriceByMarket.delete(marketKey);
		return;
	}
	if (paused) {
		paused = false;
		lastLivePriceByMarket.clear();
	}
	const previous = lastLivePriceByMarket.get(marketKey);
	lastLivePriceByMarket.set(marketKey, price);
	if (previous === undefined) return;
	let fired: PriceAlert[] | undefined;
	for (const alert of candidates) {
		if (crossed(alert.direction, previous, price, alert.threshold)) (fired ??= []).push(alert);
	}
	if (!fired) return;
	priceAlertNotice.set({
		alertIds: fired.map((alert) => alert.id),
		marketKey,
		message: fired.map((alert) => `${alert.symbol} crossed ${alert.direction === 'above' ? 'above' : 'below'} ${alert.threshold}`).join(' · '),
		firedAt: Date.now()
	});
}

/**
 * Evaluates only fresh live values. A non-live interval deliberately clears
 * the baseline, so a price move while disconnected is reported by neither a
 * delayed notification nor a fabricated crossing after reconnect.
 */
export function observePriceAlerts(marketKey: string, price: number, live: boolean): void {
	loadPriceAlerts();
	if (!live) {
		pauseAllAlerts();
		return;
	}
	refreshAlertIndex();
	const candidates = alertsByMarket.get(marketKey);
	if (candidates) observeAlertCandidates(marketKey, price, candidates);
}

/** Start one browser-local monitor. It introduces no network, signing, or telemetry path. */
export function startPriceAlertMonitoring(): () => void {
	loadPriceAlerts();
	let indexedRegistry: MarketDescriptor[] | undefined;
	let marketsByKey = new Map<string, MarketDescriptor>();
	const refreshMarketIndex = () => {
		const registry = get(marketRegistry);
		if (registry === indexedRegistry) return;
		indexedRegistry = registry;
		marketsByKey = new Map();
		for (const market of registry) marketsByKey.set(market.marketKey, market);
	};
	const evaluate = () => {
		const live = get(marketDataStatus) === 'live';
		if (!live) {
			pauseAllAlerts();
			return;
		}
		refreshAlertIndex();
		if (watchedMarketKeys.length === 0) return;
		refreshMarketIndex();
		const selected = get(selectedMarket);
		const selectedTradePrice = get(recentTrades)[0]?.price;
		for (const marketKey of watchedMarketKeys) {
			const market = marketsByKey.get(marketKey);
			const price = selected?.marketKey === marketKey
				? selectedTradePrice ?? market?.lastPrice ?? selected.lastPrice
				: market?.lastPrice;
			const candidates = alertsByMarket.get(marketKey);
			if (candidates) observeAlertCandidates(marketKey, price ?? Number.NaN, candidates);
		}
	};
	const stops = [priceAlerts.subscribe(evaluate), selectedMarket.subscribe(evaluate), recentTrades.subscribe(evaluate), marketRegistry.subscribe(evaluate), marketDataStatus.subscribe(evaluate)];
	return () => stops.forEach((stop) => stop());
}
