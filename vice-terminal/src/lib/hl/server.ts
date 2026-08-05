import { HttpTransport, InfoClient } from '@nktkas/hyperliquid';
import type { Order as ViceOrder, Position as VicePosition } from '$lib/types';
import { normalizeTwapHistory } from '$lib/hl/twaps';
import { hyperliquidNetwork } from '$lib/hl/network';
import { boundedReadMap } from './boundedReads';

let infoClient: InfoClient | null = null;
export const READ_TIMEOUT_MS = 10_000;
export const READ_RETRY_DELAY_MS = 100;
const PERP_DEX_CACHE_MS = 5 * 60_000;
const EVIDENCE_CORE_ONLY =
	hyperliquidNetwork.isTestnet && (process.env as Record<string, string | undefined>).VICE_HL_EVIDENCE_CORE_ONLY === 'true';
let perpDexNamesCache: { names: string[]; expiresAt: number } | null = null;
let perpDexNamesPromise: Promise<string[]> | null = null;

/** Bound read-only venue calls so a stalled Info API becomes an explicit degraded state. */
export async function withReadTimeout<T>(label: string, operation: () => Promise<T>, timeoutMs = READ_TIMEOUT_MS): Promise<T> {
	let timer: ReturnType<typeof setTimeout> | undefined;
	try {
		return await Promise.race([
			operation(),
			new Promise<never>((_, reject) => {
				timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
			})
		]);
	} finally {
		if (timer) clearTimeout(timer);
	}
}

/** Retry only idempotent public reads; never use this boundary for mutations. */
export async function withReadRetry<T>(label: string, operation: () => Promise<T>, attempts = 2): Promise<T> {
	let lastError: unknown;
	for (let attempt = 0; attempt < attempts; attempt += 1) {
		try {
			return await withReadTimeout(label, operation);
		} catch (error) {
			lastError = error;
			if (attempt === attempts - 1) throw error;
			await new Promise((resolve) => setTimeout(resolve, READ_RETRY_DELAY_MS * 2 ** attempt));
		}
	}
	throw lastError instanceof Error ? lastError : new Error(`${label} failed`);
}

function getReadOnlyInfo(): InfoClient {
	if (!infoClient) {
		infoClient = new InfoClient({
			transport: new HttpTransport({ isTestnet: hyperliquidNetwork.isTestnet })
		});
	}
	return infoClient;
}

export type HlOrderStatus = 'open' | 'partial' | 'filled' | 'missing';

export interface HlOrderFillStatus {
	orderId: string;
	coin: string;
	filled: number;
	remaining: number;
	originalSize: number;
	status: HlOrderStatus;
}

type PerpAccountSlice = {
	dex: string;
	orders: Awaited<ReturnType<InfoClient['frontendOpenOrders']>>;
	state: Awaited<ReturnType<InfoClient['clearinghouseState']>>;
};

/**
 * Hyperliquid's account reads are DEX-scoped. The default empty dex only
 * covers the core perp DEX (and spot open orders); querying it alone silently
 * drops HIP-3 positions and orders. Keep the DEX list venue-authoritative and
 * require every slice to resolve before exposing a supposedly complete
 * account snapshot.
 */
async function fetchPerpAccountSlices(address: string): Promise<PerpAccountSlice[]> {
	const client = getReadOnlyInfo();
	const user = address as `0x${string}`;
	const names = EVIDENCE_CORE_ONLY ? [''] : await fetchPerpDexNames();
	return boundedReadMap(
		names,
		async (dex) => {
			const [orders, state] = await withReadRetry(`Hyperliquid ${dex || 'core'} account slice`, async () => Promise.all([
				client.frontendOpenOrders({ user, dex }),
				client.clearinghouseState({ user, dex })
			]));
			return { dex, orders, state };
		},
		1,
		250
	);
}

async function fetchPerpDexNames(): Promise<string[]> {
	const client = getReadOnlyInfo();
	const now = Date.now();
	if (!perpDexNamesCache || perpDexNamesCache.expiresAt <= now) {
		perpDexNamesPromise ??= client.perpDexs()
			.then((dexes) => ['', ...dexes.flatMap((dex) => (dex ? [dex.name] : []))])
			.then((names) => {
				perpDexNamesCache = { names, expiresAt: Date.now() + PERP_DEX_CACHE_MS };
				return names;
			})
			.finally(() => { perpDexNamesPromise = null; });
	}
	return perpDexNamesCache?.names ?? await perpDexNamesPromise!;
}

async function fetchPerpOpenOrders(address: string) {
	const client = getReadOnlyInfo();
	const user = address as `0x${string}`;
	const names = await fetchPerpDexNames();
	return (await boundedReadMap(
		names,
		(dex) => withReadRetry(`Hyperliquid ${dex || 'core'} open orders`, () => client.frontendOpenOrders({ user, dex })),
		2,
		50
	)).flat();
}

function mapPerpPositions(slices: PerpAccountSlice[]): VicePosition[] {
	return slices.flatMap(({ state }) => state.assetPositions
		.filter((p) => parseFloat(p.position.szi) !== 0)
			.map((p) => {
			const size = Math.abs(parseFloat(p.position.szi));
			const entry = parseFloat(p.position.entryPx ?? '0');
			const mark = parseFloat(p.position.positionValue) / size || entry;
			const side = parseFloat(p.position.szi) > 0 ? 'long' : 'short';
			return {
				id: `position:${p.position.coin}`,
				market: p.position.coin,
				apiCoin: p.position.coin,
				side: side as 'long' | 'short',
				size,
				entryPrice: entry,
				markPrice: mark,
				liquidationPrice: p.position.liquidationPx ? parseFloat(p.position.liquidationPx) : undefined,
				unrealizedPnl: parseFloat(p.position.unrealizedPnl),
				realizedPnl: 0,
				leverage: p.position.leverage?.value ? parseFloat(String(p.position.leverage.value)) : undefined
			};
		}));
}

function mapPerpOrders(slices: PerpAccountSlice[]): ViceOrder[] {
	return slices.flatMap(({ orders }) => orders.map((o) => ({
		id: String(o.oid),
		clientOrderId: o.cloid ?? undefined,
		market: o.coin,
		apiCoin: o.coin,
		side: o.side === 'B' ? 'buy' as const : 'sell' as const,
		type: o.isTrigger
			? o.orderType.startsWith('Take Profit') ? 'stop' as const : o.orderType === 'Stop Limit' ? 'stop_limit' as const : 'stop' as const
			: 'limit' as const,
		triggerKind: o.orderType.startsWith('Take Profit') ? 'takeProfit' as const : o.isTrigger ? 'stop' as const : undefined,
		price: parseFloat(o.limitPx),
		triggerPrice: o.triggerPx ? parseFloat(o.triggerPx) : undefined,
		size: parseFloat(o.origSz),
		filled: parseFloat(o.origSz) - parseFloat(o.sz),
		remaining: parseFloat(o.sz),
		status: 'open' as const,
		reduceOnly: o.reduceOnly,
		postOnly: false,
		timestamp: o.timestamp
	})));
}

export async function fetchHlBook(coin: string): Promise<{ coin: string; bestBid: number; bestAsk: number; spread: number; timestamp: number }> {
	return withReadRetry('Hyperliquid book', async () => {
		// Match the browser feed's bounded-depth request. This avoids asking the
		// Info API for an unnecessarily large book during startup and makes the
		// smoke/proxy read use the same venue shape as the live surface.
		const book = await getReadOnlyInfo().l2Book({ coin, nSigFigs: 5 });
			const bids = book?.levels?.[0] ?? [];
			const asks = book?.levels?.[1] ?? [];
		const bestBid = bids[0] ? Number(bids[0].px) : 0;
		const bestAsk = asks[0] ? Number(asks[0].px) : 0;
		return { coin, bestBid, bestAsk, spread: bestAsk - bestBid, timestamp: Date.now() };
	}, 3);
}

export async function fetchHlOrderStatus(address: string, coin: string, orderId: string): Promise<HlOrderFillStatus> {
	return withReadTimeout('Hyperliquid order status', async () => {
		const client = getReadOnlyInfo();
		const user = address as `0x${string}`;

		const hlCoin = coin;
		const openOrders = await fetchPerpOpenOrders(address);
		const open = openOrders.find((order) => String(order.oid) === orderId && order.coin === hlCoin);

		if (open) {
			const remaining = parseFloat(open.sz);
			const originalSize = parseFloat(open.origSz);
			const filled = originalSize - remaining;
			const status: HlOrderStatus =
				remaining <= 0 ? 'filled' : filled > 0 ? 'partial' : 'open';

			return {
				orderId,
				coin: hlCoin,
				filled,
				remaining,
				originalSize,
				status
			};
		}

		const userFills = await client.userFills({ user });
		const orderFills = userFills.filter(
			(fill) => String(fill.oid) === orderId && fill.coin === hlCoin
		);

		if (orderFills.length > 0) {
			const filled = orderFills.reduce((sum, fill) => sum + parseFloat(fill.sz), 0);
			return {
				orderId,
				coin: hlCoin,
				filled,
				remaining: 0,
				originalSize: filled,
				status: 'filled'
			};
		}

		return {
			orderId,
			coin: hlCoin,
			filled: 0,
			remaining: 0,
			originalSize: 0,
			status: 'missing'
		};
	});
}

export async function fetchHlOpenOrders(address: string): Promise<ViceOrder[]> {
	return withReadTimeout('Hyperliquid open orders', async () => {
		return mapPerpOrders(await fetchPerpAccountSlices(address));
	});
}

export async function fetchHlPositions(address: string): Promise<VicePosition[]> {
	return withReadTimeout('Hyperliquid positions', async () => {
		return mapPerpPositions(await fetchPerpAccountSlices(address));
	});
}

export async function fetchHlAccountSnapshotUnbounded(address: string) {
	const client = getReadOnlyInfo();
	const user = address as `0x${string}`;
	const [perpSlices, spotState, userFills, twapHistory, referralResult, feesResult] = await Promise.all([
		fetchPerpAccountSlices(address),
		client.spotClearinghouseState({ user }),
		client.userFills({ user }),
		client.twapHistory({ user }),
		client.referral({ user }).then((value) => ({ status: 'fulfilled' as const, value })).catch((reason) => ({ status: 'rejected' as const, reason })),
		client.userFees({ user }).then((value) => ({ status: 'fulfilled' as const, value })).catch((reason) => ({ status: 'rejected' as const, reason }))
	]);
	const orders = mapPerpOrders(perpSlices);
	const positions = mapPerpPositions(perpSlices);
	const accountValue = perpSlices.reduce((total, slice) => total + parseFloat(slice.state.marginSummary.accountValue), 0);
	const marginUsed = perpSlices.reduce((total, slice) => total + parseFloat(slice.state.marginSummary.totalMarginUsed), 0);
	const withdrawable = perpSlices.reduce((total, slice) => total + parseFloat(slice.state.withdrawable), 0);
	const balances = [
		{
			asset: 'USDC',
			total: accountValue,
			available: withdrawable,
			inOrders: Math.max(0, accountValue - withdrawable - marginUsed),
			unrealizedPnl: positions.reduce((total, position) => total + position.unrealizedPnl, 0),
			equity: accountValue
		},
		...spotState.balances
			.filter((balance) => parseFloat(balance.total) !== 0)
			.map((balance) => ({
				asset: balance.coin,
				total: parseFloat(balance.total),
				available: parseFloat(balance.total) - parseFloat(balance.hold),
				inOrders: parseFloat(balance.hold),
				unrealizedPnl: 0,
				equity: parseFloat(balance.total)
			}))
	];
	const fills = userFills.map((fill) => ({
		id: String(fill.tid ?? `${fill.oid}-${fill.time}`),
		orderId: String(fill.oid),
		market: fill.coin,
		apiCoin: fill.coin,
		side: fill.side === 'B' ? ('buy' as const) : ('sell' as const),
		price: parseFloat(fill.px),
		size: parseFloat(fill.sz),
		fee: parseFloat(fill.fee ?? '0'),
		timestamp: fill.time
	}));
	const revenue = referralResult.status === 'fulfilled' && feesResult.status === 'fulfilled'
		? {
			status: 'live' as const,
			referral: {
				assigned: referralResult.value.referredBy !== null,
				code: referralResult.value.referredBy?.code,
				cumVolume: parseFloat(referralResult.value.cumVlm),
				unclaimedRewards: parseFloat(referralResult.value.unclaimedRewards),
				claimedRewards: parseFloat(referralResult.value.claimedRewards),
				builderRewards: parseFloat(referralResult.value.builderRewards)
			},
			fees: {
				activeReferralDiscount: parseFloat(feesResult.value.activeReferralDiscount),
				userCrossRate: parseFloat(feesResult.value.userCrossRate),
				userAddRate: parseFloat(feesResult.value.userAddRate)
			}
		}
		: {
			status: 'degraded' as const,
			referral: { assigned: false, cumVolume: 0, unclaimedRewards: 0, claimedRewards: 0, builderRewards: 0 },
			fees: { activeReferralDiscount: 0, userCrossRate: 0, userAddRate: 0 },
			error: 'Hyperliquid revenue attribution is temporarily unavailable; no local estimate is shown.'
		};
	return {
		orders,
		positions,
		balances,
		fills,
		twaps: normalizeTwapHistory(twapHistory),
		revenue,
		account: {
			equity: accountValue,
			marginUsed,
			marginFree: withdrawable
		}
	};
}

export async function fetchHlAccountSnapshot(address: string) {
	return withReadTimeout('Hyperliquid account snapshot', () => fetchHlAccountSnapshotUnbounded(address));
}
