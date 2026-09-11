import { get } from 'svelte/store';
import {
  activeVenue,
  activeVenueAccount,
  accountSyncStatus,
  activeAssetSyncStatus,
  balances,
  chartCandles,
  chartHistoryStatus,
  candleDataStatus,
  executionStatus,
  fills,
  liveCandle,
  marketCatalogStatus,
  marketContextStatus,
  marketDataStatus,
  marketRegistry,
  openOrders,
  orderBook,
  perpMarketsList,
  positions,
  recentTrades,
  resetVenueSessionState,
  selectedMarket,
  spotMarketsList,
  subaccounts,
  activeSubaccount,
  twapJobs,
  venueEnvironment,
  venueSessionGeneration,
  venueSwitchError,
  venueSwitchStatus,
  type VenueSwitchStatus
} from '$lib/stores';
import type { AccountSnapshot, VenueAdapter, VenueEnvironment } from './adapter';
import { createSessionCoordinator, type SessionCoordinatorEffects, type SessionCoordinatorOptions, type SessionCoordinatorSnapshot, type SessionTransitionContext, type VenueSessionTarget, type VenueSessionCoordinator } from './sessionCoordinator';
import { registeredVenues, venueAdapter } from './registry';
import { createVenueAccountProjection } from './accountProjection';
import { registerBlofinVenue } from './bootstrap';
import { withUnlockedCredentials } from '$lib/credentials/vault';
import type { SavedVenueAccount } from '$lib/credentials/types';
import type { AccountRef, EventEnvelope, VenueId } from './identity';
import type { MarketDescriptor } from '$lib/types';

export type VenueSessionSwitchTarget = VenueSessionTarget;

const accountProjection = createVenueAccountProjection();
let coordinator: VenueSessionCoordinator | null = null;
let configuredOptions: SessionCoordinatorOptions | null = null;
let credentialAccountId: string | null = null;

function resetVisibleAccountState(): void {
  openOrders.set([]);
  positions.set([]);
  fills.set([]);
  balances.set([]);
  twapJobs.set([]);
  subaccounts.set([{ id: 'primary', name: 'Primary', avatar: '', equity: 0, marginUsed: 0, marginFree: 0, leverage: 1 }]);
  activeSubaccount.set({ id: 'primary', name: 'Primary', avatar: '', equity: 0, marginUsed: 0, marginFree: 0, leverage: 1 });
}

function applyAccountSnapshot(snapshot: AccountSnapshot): void {
  const committed = accountProjection.commit(snapshot);
  if (!committed && accountProjection.activeKey === snapshot.account.accountKey) return;
  accountProjection.setActive(snapshot.account.accountKey);
  const visible = accountProjection.visible();
  openOrders.set(visible.orders);
  positions.set(visible.positions);
  fills.set(visible.fills);
  balances.set(visible.balances);
  const stable = visible.balances.find((balance) => ['USDT', 'USDC'].includes(balance.asset.toUpperCase()));
  const marginUsed = visible.balances.reduce((total, balance) => total + balance.inOrders, 0);
  activeSubaccount.set({
    id: snapshot.account.accountKey,
    name: snapshot.account.accountMode,
    avatar: '',
    equity: stable?.equity ?? 0,
    marginUsed,
    marginFree: stable?.available ?? 0,
    leverage: 1
  });
  activeVenueAccount.set(snapshot.account);
  accountSyncStatus.set('live');
}

function applyMarkets(markets: readonly MarketDescriptor[]): void {
  const next = [...markets];
  marketRegistry.set(next);
  perpMarketsList.set(next.filter((market) => market.kind === 'corePerp' || market.kind === 'hip3Perp' || market.instrument?.product === 'linearPerp'));
  spotMarketsList.set(next.filter((market) => market.kind === 'spot' || market.instrument?.product === 'spot'));
}

function clearState(): void {
  accountProjection.clear();
  resetVenueSessionState();
  resetVisibleAccountState();
}

export function safeVenueError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? 'Venue session failed');
  return raw.replace(/(api[-_ ]?key|secret|passphrase|access[-_ ]?(?:key|sign|timestamp|nonce|passphrase))\s*[:=]\s*[^,; ]+/gi, '$1=[REDACTED]');
}

function statusForStore(status: SessionCoordinatorSnapshot['status']): VenueSwitchStatus {
  if (status === 'switching') return 'switching';
  if (status === 'live') return 'live';
  if (status === 'error') return 'error';
  return 'idle';
}

function createEffects(): SessionCoordinatorEffects {
  return {
    clearState: () => clearState(),
    onMarketSelected: (market, context) => {
      const snapshot = coordinator?.snapshot();
      if (snapshot) applyMarkets(snapshot.markets);
      selectedMarket.set(market);
      orderBook.set({ bids: [], asks: [], spread: 0, spreadPercent: 0 });
      recentTrades.set([]);
      chartCandles.set([]);
      liveCandle.set(null);
      chartHistoryStatus.set('loading');
      marketDataStatus.set('connecting');
      marketCatalogStatus.set('live');
      venueSessionGeneration.set(context.generation);
    },
    onPublicEvent: (_event: EventEnvelope<unknown>, context) => {
      if (!context.isCurrent()) return;
      marketDataStatus.set('live');
      candleDataStatus.set('live');
      marketContextStatus.set('live');
    },
    onAccountSnapshot: (snapshot, context) => {
      if (!context.isCurrent()) return;
      applyAccountSnapshot(snapshot);
    },
    onStatusChange: (snapshot) => {
      const status = statusForStore(snapshot.status);
      venueSwitchStatus.set(status);
      venueSwitchError.set(snapshot.error ? safeVenueError(snapshot.error) : '');
      venueSessionGeneration.set(snapshot.generation);
      if (snapshot.status === 'switching') {
        marketDataStatus.set('idle');
        marketCatalogStatus.set('idle');
        accountSyncStatus.set('idle');
        activeAssetSyncStatus.set('idle');
        executionStatus.set('idle');
      }
      if (snapshot.status === 'error') {
        marketDataStatus.set('error');
        marketCatalogStatus.set('error');
        accountSyncStatus.set('error');
      }
    }
  };
}

function defaultCoordinator(): VenueSessionCoordinator {
  if (coordinator) return coordinator;
  const options: SessionCoordinatorOptions = configuredOptions ?? {
    resolveAdapter: (venue: VenueId): VenueAdapter => venueAdapter(venue),
    effects: createEffects()
  };
  coordinator = createSessionCoordinator(options);
  return coordinator;
}

/** Configure an injectable coordinator for tests or an embedding shell. */
export function configureVenueSession(options: SessionCoordinatorOptions): void {
  if (coordinator) throw new Error('Cannot reconfigure an active venue session coordinator');
  configuredOptions = { ...options, effects: options.effects ?? createEffects() };
}

export function venueSessionCoordinator(): VenueSessionCoordinator {
  return defaultCoordinator();
}

export function venueSessionSnapshot(): SessionCoordinatorSnapshot {
  return defaultCoordinator().snapshot();
}

/**
 * Atomically switch the active venue/account. The coordinator performs teardown
 * and generation fencing before this facade exposes the new projection.
 */
export async function switchVenueSession(target: VenueSessionSwitchTarget): Promise<SessionCoordinatorSnapshot> {
  const session = defaultCoordinator();
  venueSwitchStatus.set('switching');
  venueSwitchError.set('');
  try {
    const snapshot = await session.switchTo(target);
    activeVenue.set(target.venue);
    activeVenueAccount.set(target.account ?? null);
    venueEnvironment.set(target.environment);
    venueSessionGeneration.set(snapshot.generation);
    venueSwitchStatus.set('live');
    return snapshot;
  } catch (error) {
    venueSwitchStatus.set('error');
    venueSwitchError.set(safeVenueError(error));
    throw error;
  }
}

export async function stopVenueSession(): Promise<void> {
  if (!coordinator) {
    clearState();
    venueSwitchStatus.set('idle');
    return;
  }
  await coordinator.stop();
  activeVenueAccount.set(null);
  venueSwitchStatus.set('idle');
  venueSwitchError.set('');
}

/** Select the exact active-session market and wait for its public event. */
export async function selectVenueMarketForExecution(market: MarketDescriptor, timeoutMs = 12_000): Promise<boolean> {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return false;
  const current = get(selectedMarket);
  const active = get(activeVenue);
  const instrumentVenue = market.instrument?.venue;
  if (instrumentVenue && instrumentVenue !== active) return false;
  if (current?.marketKey !== market.marketKey || current.apiCoin !== market.apiCoin) {
    const target = venueSessionSnapshot().session;
    if (!target || target.venue !== active) return false;
    const next = await switchVenueSession({
      venue: target.venue,
      environment: target.environment,
      account: target.account,
      marketKey: market.marketKey,
      market
    });
    return next.market?.marketKey === market.marketKey;
  }
  if (get(marketDataStatus) === 'live') return true;
  return new Promise((resolve) => {
    let finished = false;
    let unsubscribe: (() => void) | undefined;
    const finish = (value: boolean) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      unsubscribe?.();
      resolve(value);
    };
    const check = () => {
      const selected = get(selectedMarket);
      if (selected?.marketKey === market.marketKey && selected.apiCoin === market.apiCoin && get(marketDataStatus) === 'live') finish(true);
    };
    const timer = setTimeout(() => finish(false), timeoutMs);
    unsubscribe = marketDataStatus.subscribe(check);
    check();
  });
}

export function activeAccountRef(): AccountRef | null {
  return get(activeVenueAccount);
}

export function activeEnvironment(): VenueEnvironment {
  return get(venueEnvironment);
}

export function registeredVenueAdapters(): ReadonlyMap<VenueId, VenueAdapter> {
  return registeredVenues();
}

function activeCredentialProvider<T>(callback: (credentials: { apiKey: string; secret: string; passphrase: string }) => T | PromiseLike<T>): Promise<T> {
  const id = credentialAccountId ?? get(activeVenueAccount)?.credentialRef;
  if (!id) throw new Error("BloFin credential reference is not selected");
  return withUnlockedCredentials(id, callback);
}

/** Activate a saved account without copying its decrypted credentials into session state. */
export async function switchToSavedVenueAccount(account: SavedVenueAccount): Promise<SessionCoordinatorSnapshot> {
  if (account.venue !== "blofin") throw new Error("Unsupported saved venue account");
  credentialAccountId = account.id;
  registerBlofinVenue({ credentials: activeCredentialProvider });
  return switchVenueSession({
    venue: "blofin",
    environment: account.environment,
    account: {
      accountKey: `blofin:${account.environment}:${account.id}`,
      venue: "blofin",
      credentialRef: account.id,
      accountMode: `futures:${account.environment}`
    }
  });
}
