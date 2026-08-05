/**
 * hermes-sidecar — execution.ts
 *
 * The certified execution boundary, mounted behind the loopback transport.
 * This module adds NO second execution path: every route handler delegates to
 * the same src/lib modules the SvelteKit app uses, via execution-bridge.ts:
 *
 *   - bridgePlaceOrder / bridgeCancelOrder  (certified dispatch + journal)
 *   - agentVault unlock via client.initialize (through the bridge)
 *   - cancelAll.buildCancelAllPlan             (position ergonomics)
 *   - flattenAll.buildFlattenPlan + positionClose.buildPositionCloseIntent
 *   - positionReverse.buildPositionReversePlan
 *
 * The sidecar only adds transport (HTTP + auth + device-local provider shim).
 * Tests inject a mock client via setExecutionClient — never a second path.
 */
import { get } from 'svelte/store';
import { isAddress } from 'viem';
import {
	marketRegistry,
	openOrders,
	positions,
	selectedMarket,
	walletAddress,
	accountSyncStatus,
	marketDataStatus,
	isConnected,
	fatFingerLimits,
	revenueSyncStatus,
	revenueSnapshot
} from '../stores';
import { buildCancelAllPlan, reconcileCancelAllOutcomes, type CancelAllScope } from '../execution/cancelAll';
import { buildFlattenPlan, type FlattenScope } from '../execution/flattenAll';
import { buildPositionCloseIntent, type PositionCloseIntent } from '../execution/positionClose';
import { buildPositionReversePlan } from '../execution/positionReverse';
import { emptyFatFingerLimits } from '../execution/fatFinger';
import { assertTradingAllowed } from '../execution/releaseSafety';
import { createLocalProvider, signAndVerifyChallenge } from './provider';
import {
	bridgeCancelOrder,
	bridgeLock,
	bridgeModifyOrder,
	bridgePlaceOrder,
	clearExecutionClient,
	getExecutionClient,
	isBridgeReady,
	setExecutionClient
} from './execution-bridge';
import { refreshState } from './state';
import { loadConfig, type SidecarConfig } from './config';
import type { MarketDescriptor, OrderBook } from '../types';
import type { NativeOrderIntent, ExecutionAck } from '../execution/client';

// Re-export the bridge setter contract so unlock (t_11eb1513) and tests share one import surface.
export { setExecutionClient, clearExecutionClient, getExecutionClient, isBridgeReady };
export interface UnlockResult {
	ok: boolean;
	mainAddress?: string;
	agentAddress?: string;
	error?: string;
}

export interface ExecutionRouteResult {
	ok: boolean;
	ack?: ExecutionAck;
	error?: string;
	detail?: unknown;
}

let config: SidecarConfig | null = null;

/**
 * Test hook: the config cache is boot-time sticky (first cfg() wins). Tests
 * that flip the env shim need a way to force a re-read. Never called from a
 * production path — same convention as state.ts setRefreshStateOverride.
 */
export function __resetConfigForTest(): void {
	config = null;
}

function cfg(): SidecarConfig {
	config ??= loadConfig();
	return config;
}

/**
 * Kill-switch gate that prefers the live env shim (same as the certified
 * boundary) and falls back to the sidecar config so tests that flip
 * `__viceEnv` without restarting the process still fail closed.
 */
function assertKillSwitchClear(): void {
	const flag =
		(globalThis as { __viceEnv?: Record<string, string | undefined> }).__viceEnv?.VITE_HL_TRADING_KILL_SWITCH ??
		(cfg().killSwitch ? 'true' : 'false');
	assertTradingAllowed(flag);
}

/** Fail-closed gates shared by every signed mutation route. */
function assertExecutionReady(): void {
	assertKillSwitchClear();
	if (!isBridgeReady()) {
		throw new Error('Secure trading is locked. Unlock the agent vault before submitting orders.');
	}
	if (!get(walletAddress)) {
		throw new Error('No account is configured; unlock the agent vault first.');
	}
}

/** Resolve an authoritative market descriptor by apiCoin or marketKey. */
function resolveMarket(coin: string): MarketDescriptor {
	const registry = get(marketRegistry);
	const market = registry.find(
		(candidate) => candidate.apiCoin.toLowerCase() === coin.toLowerCase() || candidate.marketKey.toLowerCase() === coin.toLowerCase()
	);
	if (!market) {
		throw new Error(`Unregistered market identity: ${coin}. Refresh the market registry and retry.`);
	}
	if (market.tradingAvailability === 'metadataOnly') {
		throw new Error(market.tradingUnavailableReason ?? 'This market is metadata-only until the venue provides complete execution terms');
	}
	selectedMarket.set(market);
	return market;
}

const emptyBook: OrderBook = { bids: [], asks: [], spread: 0, spreadPercent: 0 };

/**
 * Unlock the agent vault. plugin_api mints a one-time challenge and passes it
 * here; this sidecar signs it with the device-local main key (EIP-1193 via
 * viem), verifies the recovered signer, then runs the certified
 * certified client.initialize(provider, address) flow (PBKDF2 210k vault,
 * agent creation/approval on first run). On success the client is already
 * the default bridge target (localExecution); unlock does not install a
 * second path. On failure the bridge stays locked.
 */
export async function unlockVault(challenge: string, address: string): Promise<UnlockResult> {
	try {
		return await unlockVaultInner(challenge, address);
	} catch (error) {
		// Fail closed: any provider/possession error surfaces as a 403, never
		// an unhandled 500. No credential material leaves this module.
		return { ok: false, error: error instanceof Error ? error.message : String(error) };
	}
}

async function unlockVaultInner(challenge: string, address: string): Promise<UnlockResult> {
	if (!isAddress(address)) return { ok: false, error: 'Unlock address is invalid.' };
	const { mainKey, mainAddress } = await signAndVerifyChallenge(challenge, address);
	// Certified initialize runs persisted-command reconciliation on boot.
	// A testnet rate limit (429) is transient; retry with backoff before
	// surfacing a failure. Venue-level rejections and unresolved-journal
	// assertions still fail closed exactly as certified.
	// HL testnet throttles hard (the 2260-market registry refresh alone can
	// burn the burst budget), so use a long window: 6 attempts, 5-30s apart.
	const client = getExecutionClient();
	if (typeof client.initialize !== 'function') {
		return { ok: false, error: 'Execution client does not support unlock initialize.' };
	}
	let lastError: unknown = null;
	for (let attempt = 0; attempt < 6; attempt += 1) {
		try {
			const provider = createLocalProvider(mainKey, mainAddress);
			// P5 builder-fee config flip: when the operator enables builder revenue
			// and configures an address, the one-time on-chain builder-fee approval
			// runs during unlock (certified agentVault path, 0.1 bp / f=1) and every
			// eligible order carries the builder tag. Default stays OFF so vanilla
			// ships unbranded and never touches monetization by surprise.
			const approveBuilder = cfg().builderEnabled && Boolean(cfg().builderAddress);
			await client.initialize(provider, mainAddress, { approveBuilder });
			// Ensure the bridge points at this client (no-op when default).
			setExecutionClient(client);
			lastError = null;
			break;
		} catch (error) {
			lastError = error;
			const text = error instanceof Error ? error.message : String(error);
			if (/rate limit|429|Too Many/i.test(text)) {
				await new Promise((resolve) => setTimeout(resolve, Math.min(5000 * (attempt + 1), 30_000)));
				continue;
			}
			break;
		}
	}
	if (lastError) {
		// Leave bridge locked / default — do not leave a half-initialized client.
		return { ok: false, error: lastError instanceof Error ? lastError.message : String(lastError) };
	}
	try {
		walletAddress.set(mainAddress);
		// Prime the certified read path ASYNC — matching the SvelteKit app,
		// which never blocks unlock on a full account snapshot. The refresh
		// fans out over hundreds of HIP-3 dex slices and, under testnet rate
		// limits, can take many minutes of certified backoff; awaiting it here
		// would make unlock a multi-minute synchronous request (and Bun's
		// idleTimeout caps at 255s). Trading stays fail-closed regardless:
		// the certified placeOrder gate (assertFreshExecutionState) requires
		// accountSyncStatus == 'live', which only the background refresh sets.
		void refreshAccountInBackground(mainAddress);
		// The sidecar IS connected after unlock (exchange client live); the
		// freshness stores still gate trading on real reads.
		isConnected.set(true);
		fatFingerLimits.set(emptyFatFingerLimits());
		revenueSyncStatus.set('idle');
		revenueSnapshot.set(null);
		return { ok: true, mainAddress };
	} catch (error) {
		return { ok: false, error: error instanceof Error ? error.message : String(error) };
	}
}

let backgroundRefresh: Promise<void> | null = null;

/** Persistent background sync: keep trying the certified refresh until the
 * freshness gate opens. The registry is fetched once (see refreshState); each
 * attempt is light (~6 calls) and rides out testnet 429s with backoff. This
 * mirrors the certified app, which keeps the read path alive until it lands —
 * a terminal must converge, not give up after 8 attempts. */
function refreshAccountInBackground(address: string): Promise<void> {
	if (backgroundRefresh) return backgroundRefresh;
	backgroundRefresh = (async () => {
		let attempt = 0;
		for (;;) {
			try {
				await refreshState();
				console.error('[hermes-sidecar] background account sync LIVE');
				return;
			} catch (error) {
				attempt += 1;
				console.error(`[hermes-sidecar] background account refresh degraded (attempt ${attempt}):`, error);
				// Keep a floor so a hot limiter never gets hammered in a tight
				// loop: 60s between attempts, growing slowly under sustained
				// failure (cap 5 min) — and recover fast on a quiet window.
				await new Promise((resolve) => setTimeout(resolve, Math.min(60_000 * Math.ceil(attempt / 4), 300_000)));
			}
		}
	})().finally(() => {
		backgroundRefresh = null;
	});
	return backgroundRefresh;
}

export function lockVault(): { ok: boolean } {
	bridgeLock();
	// Drop any test/production override so the next unlock starts clean.
	clearExecutionClient();
	return { ok: true };
}

export function isUnlocked(): boolean {
	return isBridgeReady();
}

/** POST /api/execute — market/limit/stop/bracket via the certified boundary. */
export async function executeOrder(input: {
	coin: string;
	isBuy: boolean;
	size: number;
	limitPrice: number;
	reduceOnly?: boolean;
	postOnly?: boolean;
	ioc?: boolean;
	orderType?: string;
	triggerPrice?: number;
	triggerKind?: 'stop' | 'takeProfit';
	takeProfit?: number;
	stopLoss?: number;
	commandId?: string;
}): Promise<ExecutionRouteResult> {
	try {
		assertExecutionReady();
		const market = resolveMarket(input.coin);
		if (!Number.isFinite(input.size) || input.size <= 0) throw new Error('Size must be a positive number');
		if (!Number.isFinite(input.limitPrice) || input.limitPrice <= 0) throw new Error('Price must be a positive number');
		if (input.postOnly && input.ioc) throw new Error('Post Only and IOC cannot be enabled together');
		if (input.postOnly && input.orderType && input.orderType !== 'limit' && input.orderType !== 'bracket') {
			throw new Error('Post Only is only valid for limit orders');
		}
		// Mirror the certified hl/orders.placeOrder market-price buffer: a
		// market order is a bounded IOC-style limit at ±3%, never a raw last.
		const executionPrice = input.orderType === 'market'
			? input.limitPrice * (input.isBuy ? 1.03 : 0.97)
			: input.limitPrice;
		const intent: NativeOrderIntent = {
			coin: market.apiCoin,
			isBuy: input.isBuy,
			size: input.size,
			limitPrice: executionPrice,
			reduceOnly: input.reduceOnly ?? false,
			tif: input.postOnly ? 'Alo' : input.ioc || input.orderType === 'market' ? 'Ioc' : 'Gtc',
			orderType: input.orderType ?? (input.takeProfit || input.stopLoss ? 'bracket' : 'limit'),
			triggerPrice: input.triggerPrice,
			triggerKind: input.triggerKind,
			takeProfit: input.takeProfit,
			stopLoss: input.stopLoss,
			commandId: input.commandId
		};
		const ack = await bridgePlaceOrder(market, intent);
		await refreshState().catch(() => undefined);
		return { ok: ack.accepted, ack, ...(ack.error ? { error: ack.error } : {}) };
	} catch (error) {
		return { ok: false, error: error instanceof Error ? error.message : String(error) };
	}
}

/** POST /api/cancel — cancel a single open order. */
export async function cancelOrder(coin: string, orderId: string): Promise<ExecutionRouteResult> {
	try {
		const market = resolveMarket(coin);
		const ack = await bridgeCancelOrder(market, orderId);
		await refreshState().catch(() => undefined);
		return { ok: ack.accepted, ack, ...(ack.error ? { error: ack.error } : {}) };
	} catch (error) {
		return { ok: false, error: error instanceof Error ? error.message : String(error) };
	}
}

/**
 * POST /api/modify — reprice a resting open order via the certified boundary.
 * Identity is checked against the authoritative open-order store before any
 * signed call, mirroring the certified hl/orders.modifyOrderPrice flow.
 */
export async function modifyOrder(
	coin: string,
	orderId: string,
	newPrice: number
): Promise<ExecutionRouteResult> {
	try {
		assertExecutionReady();
		const market = resolveMarket(coin);
		if (!Number.isFinite(newPrice) || newPrice <= 0) {
			throw new Error('New price must be a positive number');
		}
		const order = get(openOrders).find((candidate) => candidate.id === orderId);
		if (!order) {
			throw new Error('Authoritative order state is unavailable; reconcile open orders and retry');
		}
		if (order.apiCoin && order.apiCoin !== market.apiCoin) {
			throw new Error('Order identity does not match the requested Hyperliquid market');
		}
		const ack = await bridgeModifyOrder(market, order, newPrice);
		await refreshState().catch(() => undefined);
		return { ok: ack.accepted, ack, ...(ack.error ? { error: ack.error } : {}) };
	} catch (error) {
		return { ok: false, error: error instanceof Error ? error.message : String(error) };
	}
}

/** POST /api/cancel-all — certified cancel-all plan over the open-order set. */
export async function cancelAll(scope: CancelAllScope = 'both'): Promise<ExecutionRouteResult> {
	try {
		if (!isBridgeReady()) throw new Error('Secure trading is locked. Unlock the agent vault first.');
		const plan = buildCancelAllPlan(get(openOrders), get(marketRegistry), scope);
		const acknowledgements: { market: string; orderId: string; ok: boolean; error?: string }[] = [];
		for (const target of plan.targets) {
			const market = get(marketRegistry).find(
				(candidate) => candidate.apiCoin === target.apiCoin && candidate.marketKey === target.marketKey
			);
			if (!market) {
				acknowledgements.push({ market: target.market, orderId: target.orderId, ok: false, error: 'unregistered market identity' });
				continue;
			}
			const ack = await bridgeCancelOrder(market, target.orderId);
			acknowledgements.push({ market: target.market, orderId: target.orderId, ok: ack.accepted, error: ack.error });
		}
		await refreshState().catch(() => undefined);
		const remaining = new Set(get(openOrders).map((order) => order.id));
		const reconciled = reconcileCancelAllOutcomes(acknowledgements, plan.skipped, true, remaining);
		return { ok: reconciled.every((outcome) => outcome.ok), detail: { targets: plan.targets.length, outcomes: reconciled } };
	} catch (error) {
		return { ok: false, error: error instanceof Error ? error.message : String(error) };
	}
}

function closeIntentForPosition(positionId: string): PositionCloseIntent | undefined {
	const position = get(positions).find((candidate) => candidate.id === positionId);
	const result = buildPositionCloseIntent(position, get(marketRegistry), get(selectedMarket), emptyBook, 'market');
	return result.intent;
}

/** Mirrors the certified hl/orders.placeOrder market-price buffer (±3%). */
function marketBufferPrice(intent: Pick<PositionCloseIntent, 'side' | 'price'>): number {
	return intent.side === 'buy' ? intent.price * 1.03 : intent.price * 0.97;
}

function placeCloseIntent(intent: PositionCloseIntent): Promise<ExecutionAck> {
	const market = get(marketRegistry).find((candidate) => candidate.marketKey === intent.marketKey);
	if (!market) throw new Error('Position market is unavailable; reconcile account state before closing');
	selectedMarket.set(market);
	return bridgePlaceOrder(market, {
		coin: market.apiCoin,
		isBuy: intent.side === 'buy',
		size: intent.size,
		limitPrice: intent.type === 'market' ? marketBufferPrice(intent) : intent.price,
		reduceOnly: true,
		tif: intent.type === 'market' ? 'Ioc' : 'Gtc',
		orderType: intent.type
	});
}

/** POST /api/flatten — market-close every position in scope via certified plan + close intents. */
export async function flatten(scope: FlattenScope = 'both'): Promise<ExecutionRouteResult> {
	try {
		assertExecutionReady();
		const plan = buildFlattenPlan(get(positions), get(marketRegistry), scope);
		const outcomes: { market: string; positionId: string; ok: boolean; error?: string }[] = [];
		for (const target of plan.targets) {
			const intent = closeIntentForPosition(target.positionId);
			if (!intent) {
				outcomes.push({ market: target.apiCoin, positionId: target.positionId, ok: false, error: 'close intent unavailable' });
				continue;
			}
			try {
				const ack = await placeCloseIntent(intent);
				outcomes.push({ market: target.apiCoin, positionId: target.positionId, ok: ack.accepted, error: ack.error });
			} catch (error) {
				outcomes.push({ market: target.apiCoin, positionId: target.positionId, ok: false, error: error instanceof Error ? error.message : String(error) });
			}
		}
		await refreshState().catch(() => undefined);
		return { ok: outcomes.every((outcome) => outcome.ok), detail: { targets: plan.targets.length, outcomes } };
	} catch (error) {
		return { ok: false, error: error instanceof Error ? error.message : String(error) };
	}
}

/** POST /api/close — market-close ONE position (blotter per-row action). */
export async function closePosition(positionId: string): Promise<ExecutionRouteResult> {
	try {
		assertExecutionReady();
		const intent = closeIntentForPosition(positionId);
		if (!intent) return { ok: false, error: 'Position close intent is unavailable; reconcile account state before closing' };
		const ack = await placeCloseIntent(intent);
		await refreshState().catch(() => undefined);
		return { ok: ack.accepted, ack, ...(ack.error ? { error: ack.error } : {}) };
	} catch (error) {
		return { ok: false, error: error instanceof Error ? error.message : String(error) };
	}
}

/** POST /api/reverse — close then reopen (certified two-leg plan). */
export async function reverse(positionId: string): Promise<ExecutionRouteResult> {
	try {
		assertExecutionReady();
		const position = get(positions).find((candidate) => candidate.id === positionId);
		const planned = buildPositionReversePlan(position, get(marketRegistry), get(selectedMarket), emptyBook);
		if (!planned.plan) return { ok: false, error: planned.error ?? 'Reverse is unavailable' };
		const plan = planned.plan;
		const closeAck = await placeCloseIntent(plan.close);
		if (!closeAck.accepted) {
			return { ok: false, error: `Reverse close leg was rejected: ${closeAck.error ?? 'unknown error'}`, detail: closeAck };
		}
		await refreshState().catch(() => undefined);
		// Open leg mirrors the close at the same market price, non-reduce-only.
		const openMarket = get(marketRegistry).find((candidate) => candidate.marketKey === plan.marketKey);
		if (!openMarket) throw new Error('Reverse open market is unavailable');
		selectedMarket.set(openMarket);
		const openAck = await bridgePlaceOrder(openMarket, {
			coin: openMarket.apiCoin,
			isBuy: plan.open.side === 'buy',
			size: plan.open.size,
			limitPrice: plan.open.price,
			reduceOnly: false,
			tif: 'Ioc',
			orderType: plan.open.type
		});
		await refreshState().catch(() => undefined);
		return { ok: openAck.accepted, ack: openAck, ...(openAck.error ? { error: `Reverse open leg: ${openAck.error}` } : {}) };
	} catch (error) {
		return { ok: false, error: error instanceof Error ? error.message : String(error) };
	}
}
