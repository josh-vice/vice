import { get } from 'svelte/store';
import { accountSyncStatus, isConnected, marketDataStatus, selectedMarket, marketRegistry, openOrders, walletAddress, orderBook } from '$lib/stores';
import type { MarketDescriptor, OrderSide, OrderType } from '$lib/types';
import type { ExecutionAck } from '$lib/execution/client';
import { refreshAccountSnapshot } from './account';
import { marketCapabilities } from '$lib/marketCapabilities';
import { isAdvancedOrderCertified, unavailableOrderTypeMessage } from '$lib/execution/capabilities';
import { loadExecutionJournal } from '$lib/execution/commandJournal';
import { validateAutoTakeProfit, type AutoTakeProfitConfig } from '$lib/execution/autoTakeProfit';

export interface PlaceOrderParams {
	/** Exact registry identity selected by the caller; never a display symbol. */
	marketKey?: string;
	side: OrderSide;
	type: OrderType;
	price?: number;
	triggerPrice?: number;
	triggerKind?: 'stop' | 'takeProfit';
	size: number;
	reduceOnly?: boolean;
	postOnly?: boolean;
	ioc?: boolean;
	takeProfit?: number;
	stopLoss?: number;
	trailOffset?: number;
	autoTakeProfit?: AutoTakeProfitConfig;
	// Algo params
	algo?: {
		type: 'twap' | 'adaptive_twap' | 'vwap' | 'pov' | 'break_even' | 'maker' | 'conditional_ladder' | 'scale' | 'chase' | 'swarm' | 'iceberg' | 'ping_pong' | 'oco' | 'trailing_stop';
		config: Record<string, unknown>;
	};
}

export function validateOrderFlags(postOnly = false, ioc = false, type: OrderType = 'limit'): string | undefined {
	if (postOnly && ioc) return 'Post Only and IOC cannot be enabled together';
	if (postOnly && type !== 'limit') return 'Post Only is only valid for limit orders';
	return undefined;
}
export async function placeOrder(params: PlaceOrderParams): Promise<{ ok: boolean; error?: string; data?: ExecutionAck; executionAttempted?: boolean; autoTakeProfit?: { ok: boolean; jobId?: string; error?: string } }> {
	const market = get(selectedMarket);
	const descriptor = params.marketKey
		? resolveMarketIdentity(params.marketKey)
		: get(marketRegistry).find((candidate) => candidate.marketKey === market?.marketKey);
	if (!descriptor) return { ok: false, error: 'Selected market has no authoritative Hyperliquid identity' };
	const capabilities = marketCapabilities(descriptor);
	if (!capabilities.executable) return { ok: false, error: capabilities.readOnlyReason ?? 'This market is not executable' };
	if (!isAdvancedOrderCertified(params.type)) return { ok: false, error: unavailableOrderTypeMessage(params.type) };
	const supportsBracket = params.type === 'bracket' && capabilities.supportsAdvancedOrders;
	if (!capabilities.allowedOrderTypes.includes(params.type) && !supportsBracket) return { ok: false, error: `Order type ${params.type} is not supported for ${descriptor.kind}` };
	if (params.postOnly && !capabilities.supportsPostOnly) return { ok: false, error: 'Post Only is not supported for this market' };
	if (params.ioc && !capabilities.supportsIoc) return { ok: false, error: 'IOC is not supported for this market' };
	if (params.reduceOnly && !capabilities.supportsReduceOnly) return { ok: false, error: 'Reduce-only is not supported for this market' };
	if (params.triggerPrice !== undefined && !capabilities.supportsTriggers) return { ok: false, error: 'Triggers are not supported for this market' };
	if (params.autoTakeProfit?.enabled && !isAdvancedOrderCertified('scale')) return { ok: false, error: unavailableOrderTypeMessage('scale') };
	const flagError = validateOrderFlags(params.postOnly, params.ioc, params.type);
	if (flagError) return { ok: false, error: flagError };
	if (!market || market.marketKey !== descriptor.marketKey) {
		return { ok: false, error: 'Select the requested market so its live feed is authoritative before trading' };
	}

	// Hyperliquid market orders are bounded IOC-style limit orders. Never let a
	// stale ticket POST flag turn one into an invalid post-only (`Alo`) action.
	const tif = params.postOnly ? 'Alo' : params.ioc || params.type === 'market' ? 'Ioc' : 'Gtc';
	let ack: ExecutionAck | undefined;
	try {
		const { localExecution } = await import('$lib/execution/localExecution');
		const bookPrice = params.side === 'buy' ? get(orderBook).asks[0]?.price : get(orderBook).bids[0]?.price;
		const marketPrice = params.price ?? bookPrice ?? descriptor.lastPrice ?? 0;
		// Hyperliquid market orders are bounded IOC-style limits. Anchor the
		// bound to the authoritative live crossing quote, not the mark/oracle
		// (which can diverge materially on testnet), so a normal market order
		// neither rests as a far-away order nor violates the venue oracle band.
		const executionPrice = params.type === 'market'
			? marketPrice * (params.side === 'buy' ? 1.001 : 0.999)
			: marketPrice;
		const autoTakeProfitError = !params.reduceOnly && params.type !== 'stop' && params.type !== 'stop_limit'
			? validateAutoTakeProfit(params.side, executionPrice, params.autoTakeProfit)
			: undefined;
		if (autoTakeProfitError) return { ok: false, error: autoTakeProfitError };
		ack = await localExecution.placeOrder(descriptor, {
			coin: descriptor.apiCoin,
			isBuy: params.side === 'buy',
			size: params.size,
			limitPrice: executionPrice,
			reduceOnly: params.reduceOnly,
			tif,
			orderType: params.type,
			triggerPrice: params.triggerPrice,
			triggerKind: params.triggerKind,
			takeProfit: params.takeProfit,
			stopLoss: params.stopLoss
		});
		if (ack.uncertain) await fetchOpenOrders();
		if (!ack.accepted) return { ok: false, error: ack.error, data: ack, executionAttempted: true };
		if (params.autoTakeProfit?.enabled && !params.reduceOnly) {
			const { startScale } = await import('$lib/execution/scale');
			const protection = await startScale(descriptor, {
				side: params.side === 'buy' ? 'sell' : 'buy', size: params.size, reduceOnly: true, postOnly: false,
				startPrice: params.autoTakeProfit.startPrice, endPrice: params.autoTakeProfit.endPrice,
				levels: params.autoTakeProfit.levels, skew: params.autoTakeProfit.skew
			});
			return { ok: true, data: ack, autoTakeProfit: protection, executionAttempted: true };
		}
		return { ok: true, data: ack, executionAttempted: true };
	} catch (error) {
		const detail = error instanceof Error ? error.message : 'Order failed';
		if (ack) {
			return {
				ok: false,
				error: ack.accepted ? `Entry accepted, but follow-up protection or reconciliation failed: ${detail}` : detail,
				data: ack,
				executionAttempted: true
			};
		}
		return { ok: false, error: detail };
	}
}

export async function cancelOrder(orderId: string, marketIdentity: string): Promise<{ ok: boolean; error?: string }> {
	try {
		const { localExecution } = await import('$lib/execution/localExecution');
		const market = resolveMarketIdentity(marketIdentity);
		if (!market) return { ok: false, error: 'Order market identity is unavailable' };
		const knownOrder = get(openOrders).find((candidate) => candidate.id === orderId);
		if (knownOrder?.apiCoin && knownOrder.apiCoin !== market.apiCoin) {
			return { ok: false, error: 'Order identity does not match the requested Hyperliquid market' };
		}
		const ack = await localExecution.cancelOrder(market, orderId);
		return ack.accepted ? { ok: true } : { ok: false, error: ack.error };
	} catch (error) {
		return { ok: false, error: error instanceof Error ? error.message : 'Cancel failed' };
	}
}

export async function modifyOrderPrice(
	orderId: string,
	marketIdentity: string,
	newPrice: number
): Promise<{ ok: boolean; error?: string }> {
	try {
		const { localExecution } = await import('$lib/execution/localExecution');
		const market = resolveMarketIdentity(marketIdentity);
		const order = get(openOrders).find((candidate) => candidate.id === orderId);
		if (!market || !order) return { ok: false, error: 'Authoritative order state is unavailable' };
		if (order.apiCoin && order.apiCoin !== market.apiCoin) {
			return { ok: false, error: 'Order identity does not match the requested Hyperliquid market' };
		}
		const ack = await localExecution.modifyOrder(market, order, newPrice);
		return ack.accepted ? { ok: true } : { ok: false, error: ack.error };
	} catch (error) {
		return { ok: false, error: error instanceof Error ? error.message : 'Modify failed' };
	}
}

function resolveMarketIdentity(identity: string): MarketDescriptor | undefined {
	return get(marketRegistry).find((market) =>
		market.marketKey === identity || market.apiCoin === identity
	);
}

export async function fetchOpenOrders(): Promise<boolean> {
	const addr = get(walletAddress);
	if (!addr) return false;
	try {
		return await refreshAccountSnapshot(addr);
	} catch {
		return false;
	}
}

export async function fetchPositions(): Promise<boolean> {
	const addr = get(walletAddress);
	if (!addr) return false;
	try {
		return await refreshAccountSnapshot(addr);
	} catch {
		return false;
	}
}

export async function fetchTwapJobs(): Promise<boolean> {
	const addr = get(walletAddress);
	if (!addr) return false;
	try {
		return await refreshAccountSnapshot(addr);
	} catch {
		return false;
	}
}

export async function cancelTwap(twapId: number, marketIdentity: string): Promise<{ ok: boolean; error?: string }> {
	try {
		const market = resolveMarketIdentity(marketIdentity);
		if (!market) return { ok: false, error: 'TWAP market identity is unavailable' };
		const { localExecution } = await import('$lib/execution/localExecution');
		const ack = await localExecution.cancelTwap(market, twapId);
		const refreshed = await fetchTwapJobs();
		if (ack.accepted && !refreshed) return { ok: false, error: 'TWAP cancel accepted but account reconciliation is unresolved' };
		return ack.accepted ? { ok: true } : { ok: false, error: ack.error };
	} catch (error) {
		return { ok: false, error: error instanceof Error ? error.message : 'TWAP cancel failed' };
	}
}

export async function startAlgoOrder(params: PlaceOrderParams): Promise<{ ok: boolean; error?: string; jobId?: string; executionAttempted?: boolean }> {
	const selected = get(selectedMarket);
	const market = params.marketKey ? resolveMarketIdentity(params.marketKey) : get(marketRegistry).find((candidate) => candidate.marketKey === selected?.marketKey);
	if (!market) return { ok: false, error: 'Selected market has no authoritative Hyperliquid identity' };
	const capabilities = marketCapabilities(market);
	if (!capabilities.executable) return { ok: false, error: capabilities.readOnlyReason ?? 'This market is not executable' };
	if (!isAdvancedOrderCertified(params.type)) return { ok: false, error: unavailableOrderTypeMessage(params.type) };
	if (!capabilities.supportsPostOnly && params.postOnly) return { ok: false, error: 'Post Only is not supported for this market' };
	if (!capabilities.supportsIoc && params.ioc) return { ok: false, error: 'IOC is not supported for this market' };
	if (!capabilities.supportsAdvancedOrders) return { ok: false, error: `Advanced orders are not supported for ${market.kind}` };
	if (!selected || selected.marketKey !== market.marketKey) {
		return { ok: false, error: 'Select the requested market so its live feed is authoritative before trading' };
	}
	try {
		const { assertFreshExecutionState } = await import('$lib/execution/releaseSafety');
		assertFreshExecutionState(get(isConnected), get(accountSyncStatus), get(marketDataStatus));
	} catch (error) {
		return { ok: false, error: error instanceof Error ? error.message : 'Trading is paused until authoritative state is live' };
	}
	if (params.type !== 'twap' && params.type !== 'adaptive_twap' && params.type !== 'vwap' && params.type !== 'pov' && params.type !== 'break_even' && params.type !== 'maker' && params.type !== 'conditional_ladder' && params.type !== 'scale' && params.type !== 'chase' && params.type !== 'oco' && params.type !== 'trailing_stop' && params.type !== 'iceberg' && params.type !== 'swarm' && params.type !== 'ping_pong') {
		return { ok: false, error: 'This algorithm is unavailable until signed child-intent orchestration is complete.' };
	}
	const account = get(walletAddress);
	const initialCommandIds = new Set(typeof account === 'string' ? loadExecutionJournal(account).map((entry) => entry.commandId) : []);
	const executionAttempted = () => typeof account === 'string' && loadExecutionJournal(account).some((entry) => !initialCommandIds.has(entry.commandId));
	const withAttempt = async <T extends { ok: boolean }>(operation: Promise<T>): Promise<T & { executionAttempted: boolean }> => ({
		...(await operation),
		executionAttempted: executionAttempted()
	});
	try {
		const { localExecution } = await import('$lib/execution/localExecution');
		if (params.type === 'oco') {
			const { startOco } = await import('$lib/execution/oco');
			return withAttempt(startOco(market, {
				side: params.side,
				size: params.size,
				takeProfit: Number(params.algo?.config.takeProfit ?? params.takeProfit ?? 0),
				stopLoss: Number(params.algo?.config.stopLoss ?? params.stopLoss ?? 0),
				deadmanMs: params.algo?.config.deadmanEnabled ? Number(params.algo?.config.deadmanMs ?? 30_000) : undefined
			}));
		}
		if (params.type === 'trailing_stop') {
			const { startTrailing } = await import('$lib/execution/trailing');
			return withAttempt(startTrailing(market, {
				side: params.side,
				size: params.size,
				offset: Number(params.algo?.config.trailOffset ?? params.trailOffset ?? 0),
				deadmanMs: params.algo?.config.deadmanEnabled ? Number(params.algo?.config.deadmanMs ?? 30_000) : undefined
			}));
		}
		if (params.type === 'chase') {
			const { startChase } = await import('$lib/execution/chase');
			return withAttempt(startChase(market, {
				side: params.side,
				size: params.size,
				offsetTicks: Number(params.algo?.config.chaseOffset ?? 1),
				maxChases: Number(params.algo?.config.chaseMaxChases ?? 20),
				deadmanMs: params.algo?.config.deadmanEnabled ? Number(params.algo?.config.deadmanMs ?? 30_000) : undefined
			}));
		}
		if (params.type === 'iceberg') {
			const { startIceberg } = await import('$lib/execution/iceberg');
			return withAttempt(startIceberg(market, {
				side: params.side,
				totalSize: params.size,
				displaySize: Number(params.algo?.config.icebergDisplaySize ?? params.size / 10),
				price: Number(params.price ?? params.algo?.config.icebergPrice ?? 0),
				deadmanMs: params.algo?.config.deadmanEnabled ? Number(params.algo?.config.deadmanMs ?? 30_000) : undefined
			}));
		}
		if (params.type === 'swarm') {
			const { startSwarm } = await import('$lib/execution/swarm');
			return withAttempt(startSwarm(market, {
				side: params.side,
				size: params.size,
				orders: Number(params.algo?.config.swarmOrders ?? 8),
				spreadPct: Number(params.algo?.config.swarmSpread ?? 0.5),
				centerPrice: Number(params.price ?? 0) || undefined,
				deadmanMs: params.algo?.config.deadmanEnabled ? Number(params.algo?.config.deadmanMs ?? 30_000) : undefined
			}));
		}
		if (params.type === 'ping_pong') {
			const { startPingPong } = await import('$lib/execution/pingPong');
			return withAttempt(startPingPong(market, {
				size: params.size,
				cycles: Number(params.algo?.config.pingPongCycles ?? 5),
				rangePct: Number(params.algo?.config.pingPongRange ?? 1),
				pauseMs: Number(params.algo?.config.pingPongPauseMs ?? 2_000),
				centerPrice: Number(params.price ?? 0) || undefined,
				deadmanMs: params.algo?.config.deadmanEnabled ? Number(params.algo?.config.deadmanMs ?? 30_000) : undefined
			}));
		}
		if (params.type === 'twap') {
			const ack = await localExecution.placeTwap(market, {
				isBuy: params.side === 'buy',
				size: params.size,
				reduceOnly: params.reduceOnly ?? false,
				minutes: Number(params.algo?.config.twapDuration ?? 30),
				randomize: Boolean(params.algo?.config.twapRandomize ?? true)
			});
			const refreshed = await fetchTwapJobs();
			const attempted = executionAttempted();
			if (ack.accepted && !refreshed) return { ok: false, error: 'TWAP accepted but account reconciliation is unresolved', executionAttempted: attempted };
			return ack.accepted ? { ok: true, jobId: ack.venueOrderIds[0], executionAttempted: attempted } : { ok: false, error: ack.error, executionAttempted: attempted };
		}
		if (params.type === 'adaptive_twap' || params.type === 'vwap') {
			const { startAdaptiveExecution } = await import('$lib/execution/adaptiveTwap');
			return withAttempt(startAdaptiveExecution(market, params.type, {
				side: params.side,
				size: params.size,
				durationMinutes: Number(params.algo?.config.adaptiveDuration ?? 30),
				intervals: Number(params.algo?.config.adaptiveIntervals ?? 10),
				participation: Number(params.algo?.config.adaptiveParticipation ?? 0.1),
				offsetTicks: Number(params.algo?.config.adaptiveOffsetTicks ?? 1),
				deadmanMs: params.algo?.config.deadmanEnabled ? Number(params.algo?.config.deadmanMs ?? 30_000) : undefined
			}));
		}
		if (params.type === 'pov') {
			const { startPov } = await import('$lib/execution/pov');
			return withAttempt(startPov(market, {
				side: params.side,
				size: params.size,
				durationMinutes: Number(params.algo?.config.adaptiveDuration ?? 30),
				participation: Number(params.algo?.config.povParticipation ?? 0.1),
				windowTrades: Number(params.algo?.config.povWindowTrades ?? 20),
				offsetTicks: Number(params.algo?.config.adaptiveOffsetTicks ?? 1),
				deadmanMs: params.algo?.config.deadmanEnabled ? Number(params.algo?.config.deadmanMs ?? 30_000) : undefined
			}));
		}
		if (params.type === 'break_even') {
			const { startBreakEven } = await import('$lib/execution/breakEven');
			return withAttempt(startBreakEven(market, {
				side: params.side,
				size: params.size,
				entryPrice: Number(params.algo?.config.breakEvenEntryPrice ?? params.algo?.config.entryPrice ?? params.price ?? market.lastPrice),
				triggerDistance: Number(params.algo?.config.breakEvenTrigger ?? 0),
				offset: Number(params.algo?.config.breakEvenOffset ?? 0),
				deadmanMs: params.algo?.config.deadmanEnabled ? Number(params.algo?.config.deadmanMs ?? 30_000) : undefined
			}));
		}
		if (params.type === 'maker') {
			const { startMakerRoute } = await import('$lib/execution/makerRouting');
			return withAttempt(startMakerRoute(market, {
				side: params.side,
				size: params.size,
				offsetTicks: Number(params.algo?.config.makerOffsetTicks ?? 0),
				reduceOnly: params.reduceOnly
			}));
		}
		if (params.type === 'conditional_ladder') {
			const { startConditionalLadder } = await import('$lib/execution/conditionalLadder');
			return withAttempt(startConditionalLadder(market, {
				side: params.side,
				size: params.size,
				triggerPrice: Number(params.algo?.config.conditionalTriggerPrice ?? params.triggerPrice ?? 0),
				startPrice: Number(params.algo?.config.scaleStartPrice ?? 0),
				endPrice: Number(params.algo?.config.scaleEndPrice ?? 0),
				levels: Number(params.algo?.config.scaleLevels ?? 5),
				skew: Number(params.algo?.config.scaleSkew ?? 1),
				triggerKind: (params.algo?.config.conditionalTriggerKind === 'takeProfit' ? 'takeProfit' : 'stop'),
				triggerSource: (params.algo?.config.conditionalTriggerSource === 'candleClose' || params.algo?.config.conditionalTriggerSource === 'candleVolume' || params.algo?.config.conditionalTriggerSource === 'time' || params.algo?.config.conditionalTriggerSource === 'syntheticPair' ? params.algo.config.conditionalTriggerSource : 'priceCross'),
				triggerInterval: typeof params.algo?.config.conditionalTriggerInterval === 'string' ? params.algo.config.conditionalTriggerInterval : undefined,
				triggerThreshold: Number(params.algo?.config.conditionalTriggerPrice ?? params.triggerPrice ?? 0),
				triggerAtMs: Number(params.algo?.config.conditionalTriggerAtMs ?? 0),
				pairMarketKey: typeof params.algo?.config.conditionalPairMarketKey === 'string' ? params.algo.config.conditionalPairMarketKey : undefined,
				pairOperation: params.algo?.config.conditionalPairOperation === 'spread' ? 'spread' : params.algo?.config.conditionalPairOperation === 'ratio' ? 'ratio' : undefined,
				deadmanMs: params.algo?.config.deadmanEnabled ? Number(params.algo?.config.deadmanMs ?? 30_000) : undefined
			}));
		}

		if (params.type !== 'scale') {
			return { ok: false, error: `Advanced order type ${params.type} has no execution handler` };
		}
		const startPrice = Number(params.algo?.config.scaleStartPrice ?? 0);
		const endPrice = Number(params.algo?.config.scaleEndPrice ?? 0);
		if (params.postOnly) {
			const book = get(orderBook);
			const crosses = params.side === 'buy'
				? Math.max(startPrice, endPrice) >= (book.asks[0]?.price ?? Infinity)
				: Math.min(startPrice, endPrice) <= (book.bids[0]?.price ?? -Infinity);
			if (crosses) return { ok: false, error: 'Post-only scale range would cross the current spread' };
		}
		const { startScale } = await import('$lib/execution/scale');
		return withAttempt(startScale(market, {
			side: params.side,
			size: params.size,
			reduceOnly: params.reduceOnly ?? false,
			postOnly: params.postOnly ?? true,
			startPrice,
			endPrice,
			levels: Number(params.algo?.config.scaleLevels ?? 5),
			skew: Number(params.algo?.config.scaleSkew ?? 1),
			deadmanMs: params.algo?.config.deadmanEnabled ? Number(params.algo?.config.deadmanMs ?? 30_000) : undefined
		}));
	} catch (error) {
		return { ok: false, error: error instanceof Error ? error.message : 'Advanced order failed', executionAttempted: executionAttempted() };
	}
}
