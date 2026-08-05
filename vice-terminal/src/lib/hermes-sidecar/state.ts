/**
 * hermes-sidecar — state.ts
 *
 * Mounts the CERTIFIED read path unmodified: market registry refresh, account
 * snapshot, positions, and open orders all run through the same src/lib
 * modules the SvelteKit app uses. Under Bun there is no SvelteKit route layer,
 * so this mounts `$lib/hl/server.ts` DIRECTLY — the exact certified functions
 * the SvelteKit /api/hl/* routes delegate to (fetchHlAccountSnapshot,
 * fetchHlOpenOrders, fetchHlPositions). One boundary, one behavior; the
 * sidecar only changes the transport.
 */
import { get } from 'svelte/store';
import {
	walletAddress,
	marketRegistry,
	selectedMarket,
	positions,
	openOrders,
	fills,
	twapJobs,
	balances,
	revenueSnapshot,
	revenueSyncStatus,
	activeSubaccount,
	accountSyncStatus,
	marketDataStatus,
	marketCatalogStatus,
	perpMarketsList,
	spotMarketsList,
	isConnected
} from '../stores';
import { refreshMarketRegistry, waitForMarketCatalogBaseline } from '../hl/markets';
import { hyperliquidNetwork } from '../hl/network';
import type { MarketDescriptor } from '../types';
import { fetchHlAccountSnapshotUnbounded, fetchHlOpenOrders, fetchHlPositions, withReadTimeout } from '../hl/server';
import { hydrateMarketIdentity } from '../hl/accountIdentity';

export interface SidecarSnapshot {
	initialized: boolean;
	account: string | null;
	markets: unknown[];
	selectedMarket: unknown;
	positions: unknown[];
	openOrders: unknown[];
	balances: unknown[];
	revenue: unknown;
	revenueSync: unknown;
	sync: {
		account: unknown;
		marketData: unknown;
	};
	serverTimeMs: number;
}

let initialized = false;
// Generation guard: a stale in-flight refresh (e.g. the boot-time prime still
// running when an unlock refresh completes) must never clobber newer state.
let refreshGeneration = 0;

/** Test-only: replace the certified refresh with a no-network stub. */
let refreshOverride: (() => Promise<void>) | null = null;

export function setRefreshStateOverride(fn: (() => Promise<void>) | null): void {
	refreshOverride = fn;
}

export async function initializeState(account: string | null): Promise<void> {
	if (account) walletAddress.set(account);
	await refreshState();
	initialized = true;
}

/**
 * Boot-only read-path initialization. The sidecar must have a canonical market
 * registry before it can hydrate account identities, but it must not start an
 * account refresh before unlock: unlock starts the persistent certified
 * account-sync loop, and two concurrent snapshot loops exhaust Hyperliquid's
 * shared testnet limiter. Account freshness remains a separate fail-closed
 * gate in refreshState/assertFreshExecutionState.
 *
 * Warm boot is cache-only BY DESIGN: a warm catalog (vault localStorage cache)
 * becomes usable immediately and the sidecar does NOT fire the authoritative
 * ~2260-market Info refresh in the background. The certified app refreshes
 * opportunistically because its snapshot is not a safety-critical gate; here
 * the account freshness gate is fail-closed for trading, and a background
 * catalog burn would starve the snapshot on Hyperliquid's shared testnet
 * limiter. Catalog freshness is opportunistic — it refreshes on cold boot and
 * explicit /api/refresh. Cold boot mirrors the certified path: the BTC
 * bootstrap identity publishes once the first Info call settles, so
 * unlock/snapshot can start immediately while the catalog completes.
 */
const MARKET_CATALOG_CACHE_KEY = 'vice.hl.market-catalog.v1';

export async function initializeMarketRegistry(): Promise<void> {
	if (get(marketRegistry).length === 0) {
		const cached = readWarmCatalog();
		if (cached.length > 0) {
			// Mirror the certified cache-load path (hl/markets.ts
			// refreshMarketRegistry, warm-catalog branch) so store consumers
			// see exactly the same state a browser warm boot would produce.
			marketRegistry.set(cached);
			perpMarketsList.set(cached.filter((market) => market.kind !== 'spot'));
			spotMarketsList.set(cached.filter((market) => market.kind === 'spot'));
			marketCatalogStatus.set('stale');
			const current = get(selectedMarket);
			const replacement = current
				? cached.find((market) => market.marketKey === current.marketKey)
				: cached.find((market) => market.marketKey === 'perp:BTC') ?? cached[0];
			if (replacement) selectedMarket.set(replacement);
		} else {
			void refreshMarketRegistry().catch(() => undefined);
			await waitForMarketCatalogBaseline();
		}
	}
	initialized = true;
}

/** Read the sidecar's warm catalog straight from the vault cache. The cached
 * rows already carry their derived instrument identities (they were written
 * by the certified writer after a full fetch), so no re-derivation is needed.
 * Returns [] on any miss/corruption so the caller falls back to the certified
 * refresh path. */
function readWarmCatalog(): MarketDescriptor[] {
	try {
		const raw = globalThis.localStorage?.getItem(MARKET_CATALOG_CACHE_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw) as { network?: string; markets?: MarketDescriptor[] } | null;
		if (!parsed || parsed.network !== hyperliquidNetwork.network || !Array.isArray(parsed.markets) || parsed.markets.length === 0) {
			return [];
		}
		return parsed.markets;
	} catch {
		return [];
	}
}

export async function refreshState(): Promise<void> {
	if (refreshOverride) {
		await refreshOverride();
		initialized = true;
		return;
	}
	const generation = ++refreshGeneration;
	// Market registry refresh first: the snapshot hydration needs descriptor
	// identities (marketKey/apiCoin) to be present. BUT the registry is a
	// ~2260-market catalog that takes hundreds of HL calls — re-fetching it on
	// every attempt burns the whole testnet rate-limit budget and starves the
	// account snapshot (the actual freshness gate). Fetch once, then reuse the
	// cached catalog for subsequent attempts within the same sidecar boot.
	const registry = get(marketRegistry);
	if (registry.length === 0) {
		// Wait only for the canonical core/spot baseline. HIP-3 catalog
		// enrichment may still be running in refreshMarketRegistry(); waiting
		// for the full 245-DEX fan-out here starves the account freshness gate.
		void refreshMarketRegistry().catch(() => undefined);
		await waitForMarketCatalogBaseline();
	}

	const address = get(walletAddress);
	if (address) {
		// The account snapshot is the freshness gate for trading; failures
		// propagate so callers can decide retry policy (unlock retries with
		// backoff; /api/refresh surfaces 502). `initialized` still flips so the
		// renderer does not re-prime forever — the stores carry degraded health.
		await refreshAccountSnapshotDirect(address, generation);
	}
	initialized = true;
}

/** Certified account snapshot via $lib/hl/server (Bun-safe, no SvelteKit route). */
async function refreshAccountSnapshotDirect(address: string, generation = refreshGeneration): Promise<void> {
	accountSyncStatus.set('connecting');
	try {
		// The app caps the whole snapshot at 10s (READ_TIMEOUT_MS) to keep
		// browser requests snappy. The sidecar serves a desktop terminal:
		// give the fan-out a 60s budget so a rate-limited testnet snapshot can
		// actually complete. Same certified function, same data — the app's
		// 10s contract is untouched (transport-level policy, plan §4 P2 note).
		//
		// HL testnet's limiter 429s the whole snapshot when the shared IP
		// budget is hot. Ride it out HERE (transport glue only — certified
		// function, same response shape) so the freshness gate eventually
		// opens. Timeouts get the same treatment: a stalled snapshot should
		// retry, not flip the gate to error on one bad window.
		const snapshot = await withLimiterRetry(() =>
			withReadTimeout('Hyperliquid account snapshot', () => fetchHlAccountSnapshotUnbounded(address), 60_000)
		);
		if (generation !== refreshGeneration) return; // stale refresh; newer one owns the stores
		const registry = get(marketRegistry);
		openOrders.set((snapshot.orders ?? []).map((order) => hydrateMarketIdentity(order, registry)));
		positions.set((snapshot.positions ?? []).map((position) => hydrateMarketIdentity(position, registry)));
		fills.set((snapshot.fills ?? []).map((fill) => hydrateMarketIdentity(fill, registry)));
		twapJobs.set(snapshot.twaps ?? []);
		balances.set(snapshot.balances ?? []);
		revenueSnapshot.set(snapshot.revenue ?? null);
		revenueSyncStatus.set(snapshot.revenue?.status === 'live' ? 'live' : 'stale');
		activeSubaccount.update((account) => ({ ...account, ...(snapshot.account ?? {}) }));
		accountSyncStatus.set('live');
		isConnected.set(true);
		marketDataStatus.set('live');
	} catch (error) {
		if (generation === refreshGeneration) {
			accountSyncStatus.set('error');
			console.error('[hermes-sidecar] account snapshot refresh failed:', error);
		}
		throw error;
	}
}

/** Retry a certified read against the venue limiter. Transport-only: the
 * wrapped function is unchanged; only the retry policy is added here. */
export async function withLimiterRetry<T>(operation: () => Promise<T>, attempts = 8): Promise<T> {
	let lastError: unknown = null;
	for (let attempt = 0; attempt < attempts; attempt += 1) {
		try {
			return await operation();
		} catch (error) {
			lastError = error;
			const text = error instanceof Error ? error.message : String(error);
			if (!/rate limit|429|Too Many|timed out/i.test(text)) throw error;
			const delay = Math.min(10_000 * (attempt + 1), 60_000);
			console.error(`[hermes-sidecar] limiter hit (${text}); retry ${attempt + 1}/${attempts} in ${delay}ms`);
			await new Promise((resolve) => setTimeout(resolve, delay));
		}
	}
	throw lastError;
}

export async function refreshOrdersDirect(): Promise<void> {
	const address = get(walletAddress);
	if (!address) return;
	const orders = await fetchHlOpenOrders(address);
	openOrders.set(orders.map((order) => hydrateMarketIdentity(order, get(marketRegistry))));
}

export async function refreshPositionsDirect(): Promise<void> {
	const address = get(walletAddress);
	if (!address) return;
	const fetched = await fetchHlPositions(address);
	positions.set(fetched.map((position) => hydrateMarketIdentity(position, get(marketRegistry))));
}

export function snapshot(): SidecarSnapshot {
	return {
		initialized,
		account: get(walletAddress) ?? null,
		markets: get(marketRegistry),
		selectedMarket: get(selectedMarket) ?? null,
		positions: get(positions),
		openOrders: get(openOrders),
		balances: get(balances),
		revenue: get(revenueSnapshot),
		revenueSync: get(revenueSyncStatus),
		sync: {
			account: get(accountSyncStatus),
			marketData: get(marketDataStatus)
		},
		serverTimeMs: Date.now()
	};
}
