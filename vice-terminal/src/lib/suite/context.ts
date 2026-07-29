import { derived, type Readable } from 'svelte/store';
import {
	activeSubaccount,
	accountSyncStatus,
	isConnected,
	marketCatalogStatus,
	marketDataStatus,
	selectedDex,
	selectedMarket,
	type Dex,
	type HealthStatus
} from '$lib/stores';
import type { MarketDescriptor } from '$lib/types';

export const SUITE_CONTEXT = Symbol('vice-suite-context');

export interface SuiteMarketContext {
	venue: Dex;
	market: MarketDescriptor | null;
	dataStatus: HealthStatus;
	catalogStatus: HealthStatus;
}

export interface SuiteAccountContext {
	/** A local label only. Wallet addresses, credentials, and signing handles never enter suite context. */
	accountId: string | null;
	accountLabel: string | null;
	connected: boolean;
	syncStatus: HealthStatus;
}

export interface SuiteContext {
	market: SuiteMarketContext;
	account: SuiteAccountContext;
}

/**
 * The one client-side context that every suite surface may observe. Trading
 * remains owned by the terminal execution boundary; widgets receive identity
 * and health state, never a signer, credential, or mutable order handle.
 */
export const suiteContext: Readable<SuiteContext> = derived(
	[selectedDex, selectedMarket, marketDataStatus, marketCatalogStatus, activeSubaccount, isConnected, accountSyncStatus],
	([$selectedDex, $selectedMarket, $marketDataStatus, $marketCatalogStatus, $activeSubaccount, $isConnected, $accountSyncStatus]) => ({
		market: {
			venue: $selectedDex,
			market: $selectedMarket,
			dataStatus: $marketDataStatus,
			catalogStatus: $marketCatalogStatus
		},
		account: {
			accountId: $isConnected ? $activeSubaccount.id : null,
			accountLabel: $isConnected ? $activeSubaccount.name : null,
			connected: $isConnected,
			syncStatus: $accountSyncStatus
		}
	})
);
