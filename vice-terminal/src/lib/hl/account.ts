import type { ISubscription } from '@nktkas/hyperliquid';
import { get } from 'svelte/store';
import type { Fill as ViceFill, MarketDescriptor, Order as ViceOrder, Position as VicePosition } from '$lib/types';
import { getTradingSubscriptionClient, getTradingTransport } from './client';
import {
	activeSubaccount,
	accountSyncStatus,
	balances,
	fills,
	openOrders,
	positions,
	twapJobs,
	activeAssetSyncStatus,
	selectedMarket
} from '$lib/stores';
import { hydrateMarketIdentity } from './accountIdentity';
import { createSnapshotCoordinator } from './snapshotCoordinator';
import { bindBrowserLifecycle, isBrowserOnline } from './browserLifecycle';
import { getMarketReconnectDelayMs } from './reliability';

let subscriptions: ISubscription[] = [];
let activeAssetSubscription: ISubscription | null = null;
let activeAssetGeneration = 0;
let currentAddress = '';
let refreshTimer: ReturnType<typeof setTimeout> | null = null;
let reconciliationTimer: ReturnType<typeof setInterval> | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempt = 0;
let reconnectInFlight: Promise<void> | null = null;
let boundTransportSocket: EventTarget | null = null;
let browserLifecycleUnbind: (() => void) | null = null;
let accountGeneration = 0;

const snapshotCoordinator = createSnapshotCoordinator(async (): Promise<boolean> => {
	const address = currentAddress;
	if (!address) return false;
	const generation = accountGeneration;
	accountSyncStatus.set('connecting');
	try {
		const response = await fetch(`/api/hl/account?address=${encodeURIComponent(address)}`);
		if (!response.ok) throw new Error('Account snapshot failed');
		const snapshot = await response.json();
		if (address !== currentAddress || generation !== accountGeneration) return false;
		// Do not pass hydrateMarketIdentity directly to Array.map: map supplies
		// the numeric index as the second argument, which would override the
		// registry default and fail with `registry.find is not a function`.
		openOrders.set((snapshot.orders ?? []).map((order: ViceOrder) => hydrateMarketIdentity(order)));
		positions.set((snapshot.positions ?? []).map((position: VicePosition) => hydrateMarketIdentity(position)));
		fills.set((snapshot.fills ?? []).map((fill: ViceFill) => hydrateMarketIdentity(fill)));
		twapJobs.set(snapshot.twaps ?? []);
		balances.set(snapshot.balances ?? []);
		activeSubaccount.update((account) => ({ ...account, ...(snapshot.account ?? {}) }));
		accountSyncStatus.set('live');
		return true;
	} catch (error) {
		if (address === currentAddress && generation === accountGeneration) {
			accountSyncStatus.set('error');
		}
		throw error;
	}
});

function bindTransportHealth(): void {
	const socket = getTradingTransport().socket;
	if (boundTransportSocket === socket) return;
	boundTransportSocket = socket;
	socket.addEventListener('close', () => {
		if (!currentAddress) return;
		accountSyncStatus.set('stale');
		scheduleSubscriptionRecovery(currentAddress);
	});
	socket.addEventListener('open', () => {
		if (!currentAddress) return;
		accountSyncStatus.set('connecting');
		scheduleSnapshot(currentAddress);
	});
}

function scheduleSubscriptionRecovery(address: string): void {
	if (!isBrowserOnline()) return;
	if (reconnectTimer) clearTimeout(reconnectTimer);
	const attempt = reconnectAttempt++;
	reconnectTimer = setTimeout(() => {
		reconnectTimer = null;
		if (address !== currentAddress || reconnectInFlight) return;
		reconnectInFlight = startAccountSubscriptions(address)
			.catch(() => {
				if (address === currentAddress) accountSyncStatus.set('error');
			})
			.finally(() => {
				reconnectInFlight = null;
			});
	}, getMarketReconnectDelayMs(attempt));
}

function scheduleSnapshot(address: string): void {
	if (refreshTimer) clearTimeout(refreshTimer);
	refreshTimer = setTimeout(() => {
		void refreshAccountSnapshot(address).catch(() => undefined);
	}, 75);
}

export async function refreshAccountSnapshot(address = currentAddress): Promise<boolean> {
	if (!address || address !== currentAddress) return false;
	return snapshotCoordinator.request();
}

export async function startAccountSubscriptions(address: string): Promise<void> {
	await stopAccountSubscriptions(true);
	accountGeneration += 1;
	currentAddress = address;
	bindTransportHealth();
	browserLifecycleUnbind = bindBrowserLifecycle({
		onResume: () => {
			if (!currentAddress) return;
			accountSyncStatus.set('stale');
			scheduleSnapshot(currentAddress);
			scheduleSubscriptionRecovery(currentAddress);
		},
		onOffline: () => {
			if (!currentAddress) return;
			accountSyncStatus.set('stale');
			activeAssetSyncStatus.set('stale');
		}
	});
	// A transient Info API failure must not prevent the WebSocket recovery path
	// from being installed. Keep private state non-actionable until a snapshot
	// succeeds, while order/fill/account events can trigger the next attempt.
	try {
		await refreshAccountSnapshot(address);
	} catch {
		if (currentAddress === address) accountSyncStatus.set('stale');
	}
	const client = getTradingSubscriptionClient();
	let ordersSub: ISubscription;
	let fillsSub: ISubscription;
	let twapsSub: ISubscription;
	let clearinghouseSub: ISubscription;
	let spotStateSub: ISubscription;
	try {
		[ordersSub, fillsSub, twapsSub, clearinghouseSub, spotStateSub] = await Promise.all([
			client.orderUpdates({ user: address as `0x${string}` }, () => scheduleSnapshot(address)),
			client.userFills(
				{ user: address as `0x${string}`, aggregateByTime: true },
				() => scheduleSnapshot(address)
			),
			client.userTwapHistory({ user: address as `0x${string}` }, () => scheduleSnapshot(address)),
			// These are authoritative account-state streams. They do not mutate
			// individual stores directly; every event is coalesced through the
			// generation-safe snapshot coordinator so positions, balances, fills,
			// orders, and revenue converge from one consistent venue snapshot.
			// One stream covers the core perp DEX and every HIP-3 DEX. A
			// core-only clearinghouse subscription would leave selected HIP-3
			// positions/balances stale while the UI still reported ACCOUNT LIVE.
			client.allDexsClearinghouseState({ user: address as `0x${string}` }, () => scheduleSnapshot(address)),
			client.spotState({ user: address as `0x${string}` }, () => scheduleSnapshot(address))
		]);
	} catch (error) {
		accountSyncStatus.set('stale');
		scheduleSubscriptionRecovery(address);
		throw error;
	}
	if (currentAddress !== address) {
		await Promise.all([ordersSub, fillsSub, twapsSub, clearinghouseSub, spotStateSub].map((subscription) => subscription.unsubscribe()));
		return;
	}
	for (const subscription of [ordersSub, fillsSub, twapsSub, clearinghouseSub, spotStateSub]) {
		subscription.failureSignal.addEventListener('abort', () => scheduleSubscriptionRecovery(address), { once: true });
	}
	subscriptions = [ordersSub, fillsSub, twapsSub, clearinghouseSub, spotStateSub];
	await setActiveAccountAsset(get(selectedMarket) ?? undefined);
	reconciliationTimer = setInterval(() => {
		if (currentAddress === address) {
			void refreshAccountSnapshot(address).catch(() => undefined);
		}
	}, 15_000);
	reconnectAttempt = 0;
}

/** Keep the selected market's account/asset stream aligned with the chart. */
export async function setActiveAccountAsset(market?: Pick<MarketDescriptor, 'apiCoin' | 'kind'>): Promise<void> {
	const generation = ++activeAssetGeneration;
	const isNonPerp = market?.kind === 'spot';
	activeAssetSyncStatus.set(isNonPerp ? 'idle' : market ? 'connecting' : 'idle');
	try {
		await activeAssetSubscription?.unsubscribe();
	} catch {
		/* best effort during market switches */
	}
	activeAssetSubscription = null;
	const address = currentAddress;
	// Hyperliquid activeAssetData is a perp account/asset stream. Spot and
	// prediction metadata are covered by public/catalog state and must never be
	// routed through this API.
	if (generation !== activeAssetGeneration || !address || !market || isNonPerp) return;
	try {
		const subscription = await getTradingSubscriptionClient().activeAssetData(
			{ user: address as `0x${string}`, coin: market.apiCoin },
			() => {
				if (generation === activeAssetGeneration && address === currentAddress) activeAssetSyncStatus.set('live');
				scheduleSnapshot(address);
			}
		);
		if (address !== currentAddress || generation !== activeAssetGeneration) {
			await subscription.unsubscribe();
			return;
		}
		subscription.failureSignal.addEventListener('abort', () => {
			if (generation === activeAssetGeneration) activeAssetSyncStatus.set('stale');
			// Recreate the complete private subscription set after a failed
			// restoration; refreshing a snapshot alone would leave active-asset
			// data permanently stale.
			scheduleSubscriptionRecovery(address);
		}, { once: true });
		activeAssetSubscription = subscription;
		// Subscription acknowledgement is not a data frame. Stay connecting
		// until the venue has delivered authoritative active-asset data.
		activeAssetSyncStatus.set('connecting');
	} catch (error) {
		if (generation === activeAssetGeneration && address === currentAddress) {
			activeAssetSyncStatus.set('error');
			console.warn('[hl] active account asset stream unavailable; account snapshot remains authoritative:', error);
		}
	}
}

export async function stopAccountSubscriptions(preserveRecoveryAttempt = false): Promise<void> {
	accountGeneration += 1;
	browserLifecycleUnbind?.();
	browserLifecycleUnbind = null;
	currentAddress = '';
	if (refreshTimer) clearTimeout(refreshTimer);
	refreshTimer = null;
	if (reconciliationTimer) clearInterval(reconciliationTimer);
	reconciliationTimer = null;
	if (reconnectTimer) clearTimeout(reconnectTimer);
	reconnectTimer = null;
	if (!preserveRecoveryAttempt) reconnectAttempt = 0;
	await Promise.all(
		subscriptions.map(async (subscription) => {
			try {
				await subscription.unsubscribe();
			} catch {
				// Connection teardown is best effort.
			}
		})
	);
	try {
		activeAssetGeneration += 1;
		await activeAssetSubscription?.unsubscribe();
	} catch {
		/* best effort */
	}
	activeAssetSubscription = null;
	activeAssetSyncStatus.set('idle');
	subscriptions = [];
	snapshotCoordinator.reset();
	openOrders.set([]);
	positions.set([]);
	fills.set([]);
	twapJobs.set([]);
	balances.set([]);
	activeSubaccount.update((account) => ({ ...account, equity: 0, marginUsed: 0, marginFree: 0 }));
	accountSyncStatus.set('idle');
}
