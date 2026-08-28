import { ExchangeClient, HttpTransport, InfoClient } from '@nktkas/hyperliquid';
import { get } from 'svelte/store';
import type { EIP1193Provider } from 'viem';
import type { MarketDescriptor, Order } from '$lib/types';
import type { ExecutionAck, NativeOrderIntent } from './client';
import { assertProviderAccount, unlockOrCreateAgent } from './agentVault';
import {
	ENABLEMENT_ENABLED_DETAIL,
	ENABLEMENT_STEP_DETAIL,
	noopEnablementReporter,
	type EnablementReporter
} from './enablement';
import { formatVenuePrice, formatVenueSize } from './venueFormat';
import { buildScaleLevels } from './scaleMath';
import { hyperliquidNetwork } from '$lib/hl/network';
import { recordDispatchLatency, recordExecutionAck } from './telemetry';
import { builderForOrderType, revenueAttributionReady, shouldRetryWithoutBuilder } from './revenueConfig';
import { deterministicCloid, reservePersistedSequence, sequenceStorageKey } from './commandIdentity';
import { withOneTransportRetry } from './retryPolicy';
import { parseVenueError } from './venueErrors';
import { venueError, venueIds } from './venueResponse';
import { marketMatches } from '$lib/chart/chartModel';
import { executionOwnerLease, executionOwnerScope } from './executionOwner';
import { assertTradingAllowed, assertFreshExecutionState } from './releaseSafety';
import { assertExecutionEntitled, getExecutionEntitlement, reserveAggregateCapacity, type ExecutionRisk } from './releasePolicy';
import { executionExpiresAfter } from './expiry';
import { accountSyncStatus, deadmanStatus, fatFingerLimits, isConnected, marketDataStatus, openOrders, positions, revenueSnapshot, revenueSyncStatus } from '$lib/stores';
import { validateFatFinger } from './fatFinger';
import { reconcileCloids } from './reconcileCloid';
import { assertNoUnresolvedExecutionCommands, beginExecutionCommand, finishExecutionCommand, unresolvedExecutionCommands } from './commandJournal';
import { monotonicNowUs } from './clock';
import { classifyVenueResponse } from './responseOutcome';
import { reconcileModifyPostState, type ModifyReconciliation } from './modifyReconcile';
import { venueIdsProveComplete } from './reconciliationCompleteness';
import { boundedReadMap } from '$lib/hl/boundedReads';
import { assertHyperliquidMarketInstrument } from '$lib/venue/hyperliquid';

const nowUs = monotonicNowUs;

type VenueOrder = {
	a: number;
	b: boolean;
	p: string;
	s: string;
	r: boolean;
	t: { limit: { tif: 'Alo' | 'Ioc' | 'Gtc' | 'FrontendMarket' } } | { trigger: { isMarket: boolean; triggerPx: string; tpsl: 'tp' | 'sl' } };
	c?: `0x${string}`;
};


class LocalExecutionClient {
	private exchange: ExchangeClient | null = null;
	private info: InfoClient | null = null;
	private provider: EIP1193Provider | null = null;
	private mainAddress: `0x${string}` | null = null;
	private builder: { b: `0x${string}`; f: number } | undefined;
	private sequence = 0;
	private actionStartedUs = new Map<string, number>();

	async initialize(
		provider: EIP1193Provider,
		mainAddress: string,
		options: { approveBuilder?: boolean; takeover?: boolean } = {},
		onPhase?: EnablementReporter
	): Promise<void> {
		const report = onPhase ?? noopEnablementReporter;
		assertTradingAllowed();
		const ownership = await executionOwnerLease.acquire(executionOwnerScope(hyperliquidNetwork.network, mainAddress), { takeover: options.takeover });
		if (!ownership.ok) throw new Error(ownership.reason);
		try {
			report({
				kind: 'step',
				step: 'connecting',
				detail: ENABLEMENT_STEP_DETAIL['connecting']
			});
			const session = await unlockOrCreateAgent(provider, mainAddress, options, report);
			report({
				kind: 'step',
				step: 'synchronizing-account',
				detail: ENABLEMENT_STEP_DETAIL['synchronizing-account']
			});
			this.provider = provider;
			this.builder = session.builder;
			this.mainAddress = session.mainAddress;
			this.sequence = typeof localStorage === 'undefined' ? 0 : Number(localStorage.getItem(sequenceStorageKey(hyperliquidNetwork.network, this.mainAddress)) ?? 0);
			const transport = new HttpTransport({ isTestnet: hyperliquidNetwork.isTestnet });
			this.exchange = new ExchangeClient({
				transport,
				wallet: session.agent,
				defaultExpiresAfter: () => executionExpiresAfter()
			});
			this.info = new InfoClient({ transport });
			await this.reconcilePersistedCommands();
			report({ kind: 'enabled', detail: ENABLEMENT_ENABLED_DETAIL });
		} catch (error) {
			await executionOwnerLease.release();
			throw error;
		}
	}
	lock(): void {
		this.exchange = null;
		this.info = null;
		this.provider = null;
		this.mainAddress = null;
		this.builder = undefined;
		this.actionStartedUs.clear();
		void executionOwnerLease.release();
		deadmanStatus.set('idle');
	}

	isReady(): boolean {
		return this.exchange !== null;
	}

	private builderFor(orderType: string): { b: `0x${string}`; f: number } | undefined {
		if (!revenueAttributionReady(get(revenueSyncStatus), get(revenueSnapshot))) return undefined;
		return builderForOrderType(this.builder, orderType);
	}
	private async assertRuntimePolicy(market: MarketDescriptor, actionId: string, orderFamily: string, notionalUsd: number, risk: ExecutionRisk): Promise<void> {
		if (hyperliquidNetwork.network !== 'mainnet') return;
		if (!this.mainAddress || !market.instrument || !Number.isFinite(notionalUsd) || notionalUsd < 0) throw new Error('Mainnet execution requires complete identity and finite notional');
		const entitlement = await getExecutionEntitlement({ wallet: this.mainAddress, actionId, venue: 'hyperliquid', instrument: market.instrument, notionalUsd: String(notionalUsd), risk });
		assertExecutionEntitled(entitlement, { wallet: this.mainAddress, actionId, venue: 'hyperliquid', instrument: market.instrument, orderFamily, notionalUsd: String(notionalUsd), aggregateNotionalUsd: String(notionalUsd + get(positions).reduce((total, position) => total + Math.abs(position.size) * (position.markPrice || market.lastPrice), 0) + get(openOrders).reduce((total, order) => total + Math.max(0, order.remaining) * (order.price || order.triggerPrice || market.lastPrice), 0)), expectedReleaseBuild: import.meta.env.VITE_RELEASE_BUILD, risk });
		await reserveAggregateCapacity({ wallet: this.mainAddress, releaseBuild: entitlement.releaseBuild, policyVersion: entitlement.policyVersion, notionalUsd: String(notionalUsd), risk });
	}

	async placeOrder(market: MarketDescriptor, intent: NativeOrderIntent): Promise<ExecutionAck> {
		assertHyperliquidMarketInstrument(market);
		const exchange = this.requireExchange();
		await this.assertCurrentAccount();
		assertTradingAllowed(undefined, intent.reduceOnly ? 'reduce' : 'increase');
		assertFreshExecutionState(get(isConnected), get(accountSyncStatus), get(marketDataStatus));
		assertNoUnresolvedExecutionCommands(this.mainAddress!);
		if (intent.coin !== market.apiCoin) {
			throw new Error('Execution identity mismatch: intent API coin does not match the selected market descriptor');
		}
		const size = formatVenueSize(intent.size, market);
		const price = formatVenuePrice(intent.limitPrice, market);
		await this.assertRuntimePolicy(market, 'order.submit', intent.orderType ?? 'limit', Number(size) * Number(price), intent.reduceOnly ? 'reduce' : 'increase');
		const possiblySamePosition = get(positions).find((position) => position.apiCoin === market.apiCoin || position.marketKey === market.marketKey);
		if (possiblySamePosition && !marketMatches(market, possiblySamePosition.apiCoin, possiblySamePosition.marketKey)) {
			throw new Error('Position identity is incomplete; reconcile account state before applying local risk limits');
		}
		const currentPosition = possiblySamePosition;
		const currentSignedSize = currentPosition
			? formatVenueSize(currentPosition.size, market)
			: '0';
		const fatFingerError = validateFatFinger(get(fatFingerLimits), {
			marketKey: market.marketKey,
			price,
			size,
			side: intent.isBuy ? 'buy' : 'sell',
			reduceOnly: intent.reduceOnly ?? false,
			currentSignedSize: currentPosition?.side === 'short' ? `-${currentSignedSize}` : String(currentSignedSize)
		});
		if (fatFingerError) throw new Error(fatFingerError);
		const commandId = intent.commandId ?? crypto.randomUUID();
		this.actionStartedUs.set(commandId, monotonicNowUs());
		const sequence = await reservePersistedSequence(hyperliquidNetwork.network, this.mainAddress!, this.sequence);
		this.sequence = sequence;
		const receiveUs = monotonicNowUs();
		const clientOrderId = deterministicCloid(sequence, 0);
		const isTrigger = intent.orderType === 'stop' || intent.orderType === 'stop_limit';
		const entry: VenueOrder = {
			a: market.assetId,
			b: intent.isBuy,
			p: price,
			s: size,
			r: intent.reduceOnly ?? false,
			t: isTrigger
				? {
						trigger: {
							isMarket: intent.orderType === 'stop',
							triggerPx: formatVenuePrice(intent.triggerPrice ?? intent.limitPrice, market),
							tpsl: intent.triggerKind === 'takeProfit' ? 'tp' : 'sl'
						}
					}
				: { limit: { tif: intent.orderType === 'market' ? 'FrontendMarket' : (intent.tif ?? 'Gtc') } },
			c: clientOrderId
		};
		const orders: VenueOrder[] = [entry];
		if (intent.orderType === 'bracket') {
			if (!intent.takeProfit || !intent.stopLoss) throw new Error('Bracket orders require take-profit and stop-loss prices');
			orders.push(
				{
					...entry,
					b: !entry.b,
					p: formatVenuePrice(intent.takeProfit, market),
					r: true,
					t: { trigger: { isMarket: true, triggerPx: formatVenuePrice(intent.takeProfit, market), tpsl: 'tp' } },
					c: deterministicCloid(sequence, 1)
				},
				{
					...entry,
					b: !entry.b,
					p: formatVenuePrice(intent.stopLoss, market),
					r: true,
					t: { trigger: { isMarket: true, triggerPx: formatVenuePrice(intent.stopLoss, market), tpsl: 'sl' } },
					c: deterministicCloid(sequence, 2)
				}
			);
		}

		const sendUs = monotonicNowUs();
		const expiresAfter = executionExpiresAfter();
		const cloids = orders.map((order) => order.c!).filter(Boolean);
		const builder = this.builderFor(intent.orderType ?? 'limit');
		beginExecutionCommand({ commandId, network: hyperliquidNetwork.network, account: this.mainAddress!, sequence, kind: 'place', cloids, venueOrderIds: [] });
		try {
			let response = await withOneTransportRetry(() => exchange.order({
				orders,
				// Venue-managed positionTpsl keeps exit size proportional to the
				// authoritative position through partial fills, reconnects, and
				// position changes. normalTpsl is fixed-size and can over-close a
				// partially filled entry.
				grouping: intent.orderType === 'bracket' ? 'positionTpsl' : 'na',
				builder
			}, { expiresAfter }));
			let error = venueError(response);
			let orderIds = venueIds(response);
			if (shouldRetryWithoutBuilder(Boolean(builder), error ? parseVenueError(error).code : undefined, orderIds)) {
				response = await withOneTransportRetry(() => exchange.order({
					orders,
					grouping: intent.orderType === 'bracket' ? 'positionTpsl' : 'na'
				}, { expiresAfter }));
				error = venueError(response);
				orderIds = venueIds(response);
			}
				const outcome = classifyVenueResponse(error, orderIds, orders.length);
				finishExecutionCommand(this.mainAddress!, commandId, { status: outcome.status, venueOrderIds: orderIds, error: outcome.error });
				return this.ack(commandId, sequence, receiveUs, sendUs, outcome.accepted, orderIds, outcome.error, outcome.uncertain);
		} catch (error) {
			const reconciled = await this.reconcileCloids(cloids);
			if (reconciled.complete) {
				finishExecutionCommand(this.mainAddress!, commandId, { status: 'reconciled', venueOrderIds: reconciled.orderIds });
				return this.ack(commandId, sequence, receiveUs, sendUs, reconciled.accepted, reconciled.orderIds, undefined, false, true);
			}
			if (reconciled.found) {
				const errorMessage = `Partial authoritative projection found (${reconciled.matchedCloids.length}/${cloids.length}); manual reconciliation required`;
				finishExecutionCommand(this.mainAddress!, commandId, { status: 'uncertain', venueOrderIds: reconciled.orderIds, error: errorMessage });
				return this.ack(commandId, sequence, receiveUs, sendUs, false, reconciled.orderIds, errorMessage, true);
			}
			finishExecutionCommand(this.mainAddress!, commandId, { status: 'uncertain', venueOrderIds: [], error: `Execution outcome uncertain: ${parseVenueError(error).message}` });
			return this.ack(
				commandId,
				sequence,
				receiveUs,
				sendUs,
				false,
				[],
				`Execution outcome uncertain: ${parseVenueError(error).message}`,
				true,
				false
			);
		}
	}

	async cancelOrder(market: MarketDescriptor, orderId: string): Promise<ExecutionAck> {
		assertHyperliquidMarketInstrument(market);
		const exchange = this.requireExchange();
		await this.assertCurrentAccount();
		const commandId = crypto.randomUUID();
		this.actionStartedUs.set(commandId, monotonicNowUs());
		const sequence = await reservePersistedSequence(hyperliquidNetwork.network, this.mainAddress!, this.sequence);
		this.sequence = sequence;
		const receiveUs = monotonicNowUs();
		const sendUs = monotonicNowUs();
		const expiresAfter = executionExpiresAfter();
		beginExecutionCommand({ commandId, network: hyperliquidNetwork.network, account: this.mainAddress!, sequence, kind: 'cancel', cloids: [], targetOrderId: orderId, venueOrderIds: [] });
		try {
			await exchange.cancel({ cancels: [{ a: market.assetId, o: Number(orderId) }] }, { expiresAfter });
			finishExecutionCommand(this.mainAddress!, commandId, { status: 'accepted', venueOrderIds: [orderId] });
			return this.ack(commandId, sequence, receiveUs, sendUs, true, [orderId]);
		} catch (error) {
			const status = await this.orderStatus(Number(orderId));
			if (status?.status === 'order' && status.order.status !== 'open' && status.order.status !== 'triggered') {
				finishExecutionCommand(this.mainAddress!, commandId, { status: 'reconciled', venueOrderIds: [orderId] });
				return this.ack(commandId, sequence, receiveUs, sendUs, true, [orderId], undefined, false, true);
			}
			if (status?.status === 'order') {
				finishExecutionCommand(this.mainAddress!, commandId, { status: 'rejected', venueOrderIds: [orderId], error: `Cancel was not applied; order remains ${status.order.status}` });
				return this.ack(commandId, sequence, receiveUs, sendUs, false, [orderId], `Cancel was not applied; order remains ${status.order.status}`, false, true);
			}
			finishExecutionCommand(this.mainAddress!, commandId, { status: 'uncertain', venueOrderIds: [], error: `Cancel outcome uncertain: ${error instanceof Error ? error.message : 'transport failure'}` });
			return this.ack(commandId, sequence, receiveUs, sendUs, false, [], `Cancel outcome uncertain: ${error instanceof Error ? error.message : 'transport failure'}`, true);
		}
	}

	async placeTwap(
		market: MarketDescriptor,
		params: { isBuy: boolean; size: number; reduceOnly: boolean; minutes: number; randomize: boolean }
	): Promise<ExecutionAck> {
		assertHyperliquidMarketInstrument(market);
		const exchange = this.requireExchange();
		await this.assertCurrentAccount();
		assertTradingAllowed(undefined, params.reduceOnly ? 'reduce' : 'increase');
		assertFreshExecutionState(get(isConnected), get(accountSyncStatus), get(marketDataStatus));
		await this.assertRuntimePolicy(market, 'algo.twap.start', 'twap', params.size * market.lastPrice, params.reduceOnly ? 'reduce' : 'increase');
		assertNoUnresolvedExecutionCommands(this.mainAddress!);
		const commandId = crypto.randomUUID();
		this.actionStartedUs.set(commandId, nowUs());
		const sequence = await reservePersistedSequence(hyperliquidNetwork.network, this.mainAddress!, this.sequence);
		this.sequence = sequence;
		const receiveUs = nowUs();
		const sendUs = nowUs();
		const expiresAfter = executionExpiresAfter();
		beginExecutionCommand({ commandId, network: hyperliquidNetwork.network, account: this.mainAddress!, sequence, kind: 'twap', cloids: [], venueOrderIds: [] });
		try {
			const response = await exchange.twapOrder({
				twap: {
					a: market.assetId,
					b: params.isBuy,
					s: formatVenueSize(params.size, market),
					r: params.reduceOnly,
					m: Math.max(5, Math.min(1440, Math.round(params.minutes))),
					t: params.randomize
				}
			}, { expiresAfter });
				const status = response.response.data.status;
				if ('error' in status) {
					const errorMessage = parseVenueError(String(status.error)).message;
					finishExecutionCommand(this.mainAddress!, commandId, { status: 'rejected', venueOrderIds: [], error: errorMessage });
					return this.ack(commandId, sequence, receiveUs, sendUs, false, [], errorMessage);
			}
			const twapId = String(status.running.twapId);
			finishExecutionCommand(this.mainAddress!, commandId, { status: 'accepted', venueOrderIds: [twapId] });
			return this.ack(commandId, sequence, receiveUs, sendUs, true, [twapId]);
		} catch (error) {
			finishExecutionCommand(this.mainAddress!, commandId, { status: 'uncertain', venueOrderIds: [], error: error instanceof Error ? error.message : 'TWAP outcome uncertain' });
			return this.ack(commandId, sequence, receiveUs, sendUs, false, [], error instanceof Error ? error.message : 'TWAP failed', true);
		}
	}

	async cancelTwap(market: MarketDescriptor, twapId: number): Promise<ExecutionAck> {
		assertHyperliquidMarketInstrument(market);
		const exchange = this.requireExchange();
		await this.assertCurrentAccount();
		const commandId = crypto.randomUUID();
		this.actionStartedUs.set(commandId, nowUs());
		const sequence = await reservePersistedSequence(hyperliquidNetwork.network, this.mainAddress!, this.sequence);
		this.sequence = sequence;
		const receiveUs = nowUs();
		const sendUs = nowUs();
		const expiresAfter = executionExpiresAfter();
		beginExecutionCommand({ commandId, network: hyperliquidNetwork.network, account: this.mainAddress!, sequence, kind: 'twap', cloids: [], targetTwapId: twapId, venueOrderIds: [] });
		try {
			await exchange.twapCancel({ a: market.assetId, t: twapId }, { expiresAfter });
			finishExecutionCommand(this.mainAddress!, commandId, { status: 'accepted', venueOrderIds: [String(twapId)] });
			return this.ack(commandId, sequence, receiveUs, sendUs, true, [String(twapId)]);
		} catch (error) {
			const job = await this.findTwap(twapId);
			if (job && job.status.status !== 'activated') {
				finishExecutionCommand(this.mainAddress!, commandId, { status: 'reconciled', venueOrderIds: [String(twapId)] });
				return this.ack(commandId, sequence, receiveUs, sendUs, true, [String(twapId)], undefined, false, true);
			}
			if (job) {
				finishExecutionCommand(this.mainAddress!, commandId, { status: 'rejected', venueOrderIds: [String(twapId)], error: 'Cancel was not applied; TWAP remains active' });
				return this.ack(commandId, sequence, receiveUs, sendUs, false, [String(twapId)], 'Cancel was not applied; TWAP remains active', false, true);
			}
			finishExecutionCommand(this.mainAddress!, commandId, { status: 'uncertain', venueOrderIds: [], error: `TWAP cancel outcome uncertain: ${error instanceof Error ? error.message : 'transport failure'}` });
			return this.ack(commandId, sequence, receiveUs, sendUs, false, [], `TWAP cancel outcome uncertain: ${error instanceof Error ? error.message : 'transport failure'}`, true);
		}
	}

	async armDeadman(milliseconds: number): Promise<ExecutionAck> {
		const exchange = this.requireExchange();
		await this.assertCurrentAccount();
		const commandId = crypto.randomUUID();
		this.actionStartedUs.set(commandId, nowUs());
		const sequence = await reservePersistedSequence(hyperliquidNetwork.network, this.mainAddress!, this.sequence);
		this.sequence = sequence;
		const receiveUs = nowUs();
		const sendUs = nowUs();
		const expiresAfter = executionExpiresAfter();
		beginExecutionCommand({ commandId, network: hyperliquidNetwork.network, account: this.mainAddress!, sequence, kind: 'scheduleCancel', cloids: [], venueOrderIds: [] });
		deadmanStatus.set('arming');
		try {
			await exchange.scheduleCancel({ time: Date.now() + Math.max(5_000, Math.round(milliseconds)) }, { expiresAfter });
			finishExecutionCommand(this.mainAddress!, commandId, { status: 'accepted', venueOrderIds: [] });
			deadmanStatus.set('armed');
			return this.ack(commandId, sequence, receiveUs, sendUs, true, []);
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Dead-man switch outcome uncertain';
			finishExecutionCommand(this.mainAddress!, commandId, { status: 'uncertain', venueOrderIds: [], error: message });
			deadmanStatus.set('uncertain');
			return this.ack(commandId, sequence, receiveUs, sendUs, false, [], message, true);
		}
	}

	async clearDeadman(): Promise<ExecutionAck> {
		const exchange = this.requireExchange();
		await this.assertCurrentAccount();
		const commandId = crypto.randomUUID();
		this.actionStartedUs.set(commandId, nowUs());
		const sequence = await reservePersistedSequence(hyperliquidNetwork.network, this.mainAddress!, this.sequence);
		this.sequence = sequence;
		const receiveUs = nowUs();
		const sendUs = nowUs();
		const expiresAfter = executionExpiresAfter();
		beginExecutionCommand({ commandId, network: hyperliquidNetwork.network, account: this.mainAddress!, sequence, kind: 'scheduleCancel', cloids: [], venueOrderIds: [] });
		deadmanStatus.set('clearing');
		try {
			await exchange.scheduleCancel({ expiresAfter });
			finishExecutionCommand(this.mainAddress!, commandId, { status: 'accepted', venueOrderIds: [] });
			deadmanStatus.set('idle');
			return this.ack(commandId, sequence, receiveUs, sendUs, true, []);
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Dead-man switch clear outcome uncertain';
			finishExecutionCommand(this.mainAddress!, commandId, { status: 'uncertain', venueOrderIds: [], error: message });
			deadmanStatus.set('uncertain');
			return this.ack(commandId, sequence, receiveUs, sendUs, false, [], message, true);
		}
	}

	async placeScale(
		market: MarketDescriptor,
		params: { isBuy: boolean; size: number; reduceOnly: boolean; postOnly: boolean; startPrice: number; endPrice: number; levels: number; skew: number; commandId?: string }
	): Promise<ExecutionAck> {
		assertHyperliquidMarketInstrument(market);
		const exchange = this.requireExchange();
		await this.assertCurrentAccount();
		assertTradingAllowed(undefined, params.reduceOnly ? 'reduce' : 'increase');
		assertFreshExecutionState(get(isConnected), get(accountSyncStatus), get(marketDataStatus));
		await this.assertRuntimePolicy(market, 'algo.scale.start', 'scale', params.size * Math.max(params.startPrice, params.endPrice), params.reduceOnly ? 'reduce' : 'increase');
		assertNoUnresolvedExecutionCommands(this.mainAddress!);
		const commandId = params.commandId ?? crypto.randomUUID();
		this.actionStartedUs.set(commandId, nowUs());
		const sequence = await reservePersistedSequence(hyperliquidNetwork.network, this.mainAddress!, this.sequence);
		this.sequence = sequence;
		const receiveUs = nowUs();
		const levels = buildScaleLevels(params.startPrice, params.endPrice, params.size, params.levels, params.skew);
		const orders: VenueOrder[] = levels.map((level, index) => ({
			a: market.assetId,
			b: params.isBuy,
			p: formatVenuePrice(level.price, market),
			s: formatVenueSize(level.size, market),
			r: params.reduceOnly,
			t: { limit: { tif: params.postOnly ? 'Alo' : 'Gtc' } },
			c: deterministicCloid(sequence, index)
		}));
		const sendUs = nowUs();
		const expiresAfter = executionExpiresAfter();
		const cloids = orders.map((order) => order.c!).filter(Boolean);
		const builder = this.builderFor('scale');
		beginExecutionCommand({ commandId, network: hyperliquidNetwork.network, account: this.mainAddress!, sequence, kind: 'scale', cloids, venueOrderIds: [] });
		try {
			let response = await withOneTransportRetry(() => exchange.order({ orders, grouping: 'na', builder }, { expiresAfter }));
			let error = venueError(response);
			let orderIds = venueIds(response);
			if (shouldRetryWithoutBuilder(Boolean(builder), error ? parseVenueError(error).code : undefined, orderIds)) {
				response = await withOneTransportRetry(() => exchange.order({ orders, grouping: 'na' }, { expiresAfter }));
				error = venueError(response);
				orderIds = venueIds(response);
			}
				const outcome = classifyVenueResponse(error, orderIds, orders.length);
				finishExecutionCommand(this.mainAddress!, commandId, { status: outcome.status, venueOrderIds: orderIds, error: outcome.error });
				return this.ack(commandId, sequence, receiveUs, sendUs, outcome.accepted, orderIds, outcome.error, outcome.uncertain);
		} catch (error) {
			const reconciled = await this.reconcileCloids(cloids);
			if (reconciled.complete) {
				finishExecutionCommand(this.mainAddress!, commandId, { status: 'reconciled', venueOrderIds: reconciled.orderIds });
				return this.ack(commandId, sequence, receiveUs, sendUs, reconciled.accepted, reconciled.orderIds, undefined, false, true);
			}
			if (reconciled.found) {
				const errorMessage = `Partial authoritative projection found (${reconciled.matchedCloids.length}/${cloids.length}); manual reconciliation required`;
				finishExecutionCommand(this.mainAddress!, commandId, { status: 'uncertain', venueOrderIds: reconciled.orderIds, error: errorMessage });
				return this.ack(commandId, sequence, receiveUs, sendUs, false, reconciled.orderIds, errorMessage, true);
			}
			finishExecutionCommand(this.mainAddress!, commandId, { status: 'uncertain', venueOrderIds: [], error: `Scale outcome uncertain: ${parseVenueError(error).message}` });
			return this.ack(commandId, sequence, receiveUs, sendUs, false, [], `Scale outcome uncertain: ${parseVenueError(error).message}`, true);
		}
	}

	async modifyOrder(market: MarketDescriptor, order: Order, newPrice: number): Promise<ExecutionAck> {
		assertHyperliquidMarketInstrument(market);
		const exchange = this.requireExchange();
		await this.assertCurrentAccount();
		assertTradingAllowed();
		assertFreshExecutionState(get(isConnected), get(accountSyncStatus), get(marketDataStatus));
		await this.assertRuntimePolicy(market, 'order.modify', order.type, order.size * newPrice, 'reduce');
		assertNoUnresolvedExecutionCommands(this.mainAddress!);
		const commandId = crypto.randomUUID();
		this.actionStartedUs.set(commandId, nowUs());
		const sequence = await reservePersistedSequence(hyperliquidNetwork.network, this.mainAddress!, this.sequence);
		this.sequence = sequence;
		const receiveUs = nowUs();
		const sendUs = nowUs();
		const expiresAfter = executionExpiresAfter();
		const isTrigger = order.type === 'stop' || order.type === 'stop_limit' || order.triggerPrice != null;
		const targetPrice = formatVenuePrice(newPrice, market);
		// Hyperliquid modify REPLACES the order with a new oid and returns
		// `{type:"default"}` with no statuses. Carry a deterministic cloid so the
		// replacement order can be reconciled by identity against the
		// authoritative frontend projection, and record that cloid in the journal
		// so a browser restart can reconcile this command by cloid as well.
		const modifyCloid = deterministicCloid(sequence, 0);
		beginExecutionCommand({ commandId, network: hyperliquidNetwork.network, account: this.mainAddress!, sequence, kind: 'modify', cloids: [modifyCloid], targetOrderId: order.id, targetPrice, targetField: isTrigger ? 'triggerPx' : 'limitPx', venueOrderIds: [] });
		try {
			await exchange.modify({
				oid: Number(order.id),
				order: {
					a: market.assetId,
					b: order.side === 'buy',
					p: formatVenuePrice(isTrigger && order.type === 'stop_limit' ? (order.price ?? newPrice) : newPrice, market),
					s: formatVenueSize(order.remaining, market),
					r: order.reduceOnly,
					c: modifyCloid,
					t: isTrigger
						? {
								trigger: {
									isMarket: order.type === 'stop',
									triggerPx: formatVenuePrice(newPrice, market),
									tpsl: order.triggerKind === 'takeProfit' ? 'tp' : 'sl'
								}
							}
						: { limit: { tif: order.postOnly ? 'Alo' : 'Gtc' } }
				}
			}, { expiresAfter });
			// Transport ack is NOT venue confirmation. Reconcile the authoritative
			// post-state (frontend projection) by the modify cloid to find the NEW
			// oid and prove the target price was applied.
			const outcome = await this.reconcileModifyPostState(modifyCloid, order.id, targetPrice, isTrigger);
			if (outcome.status === 'applied') {
				finishExecutionCommand(this.mainAddress!, commandId, { status: 'reconciled', venueOrderIds: [outcome.orderId!] });
				return this.ack(commandId, sequence, receiveUs, sendUs, true, [outcome.orderId!], undefined, false, true);
			}
			if (outcome.status === 'rejected') {
				finishExecutionCommand(this.mainAddress!, commandId, { status: 'rejected', venueOrderIds: [outcome.orderId ?? order.id], error: outcome.reason ?? 'Modify was not applied by the venue' });
				return this.ack(commandId, sequence, receiveUs, sendUs, false, [outcome.orderId ?? order.id], outcome.reason ?? 'Modify was not applied by the venue', false, true);
			}
			finishExecutionCommand(this.mainAddress!, commandId, { status: 'uncertain', venueOrderIds: [], error: outcome.reason ?? 'Modify post-state could not be proven; manual reconciliation required' });
			return this.ack(commandId, sequence, receiveUs, sendUs, false, [], outcome.reason ?? 'Modify post-state could not be proven; manual reconciliation required', true);
		} catch (error) {
			const outcome = await this.reconcileModifyPostState(modifyCloid, order.id, targetPrice, isTrigger);
			if (outcome.status === 'applied') {
				finishExecutionCommand(this.mainAddress!, commandId, { status: 'reconciled', venueOrderIds: [outcome.orderId!] });
				return this.ack(commandId, sequence, receiveUs, sendUs, true, [outcome.orderId!], undefined, false, true);
			}
			if (outcome.status === 'rejected') {
				finishExecutionCommand(this.mainAddress!, commandId, { status: 'rejected', venueOrderIds: [outcome.orderId ?? order.id], error: outcome.reason ?? 'Modify was not applied by the venue' });
				return this.ack(commandId, sequence, receiveUs, sendUs, false, [outcome.orderId ?? order.id], outcome.reason ?? 'Modify was not applied by the venue', false, true);
			}
			finishExecutionCommand(this.mainAddress!, commandId, { status: 'uncertain', venueOrderIds: [], error: `Modify outcome uncertain: ${error instanceof Error ? error.message : 'transport failure'}` });
			return this.ack(commandId, sequence, receiveUs, sendUs, false, [], `Modify outcome uncertain: ${error instanceof Error ? error.message : 'transport failure'}`, true);
		}
	}

	/**
	 * Read the authoritative frontend open-order projection (the only shape that
	 * carries isTrigger/triggerPx/orderType/cloid) and classify the modify.
	 */
	private async reconcileModifyPostState(
		modifyCloid: `0x${string}`,
		oldOrderId: string,
		targetPrice: string,
		isTrigger: boolean
	): Promise<ModifyReconciliation> {
		if (!this.info || !this.mainAddress) {
			return { status: 'uncertain', reason: 'Info client unavailable; modify post-state cannot be proven' };
		}
		try {
			const orders = await this.allDexOpenOrders();
			return reconcileModifyPostState({
				modifyCloid,
				targetField: isTrigger ? 'triggerPx' : 'limitPx',
				targetPrice,
				oldOrderId,
				orders
			});
		} catch {
			return { status: 'uncertain', reason: 'Failed to read the authoritative projection; modify post-state cannot be proven' };
		}
	}

	private async orderStatus(oid: number) {
		if (!this.info || !this.mainAddress) return null;
		try {
			return await this.info.orderStatus({ user: this.mainAddress, oid });
		} catch {
			return null;
		}
	}

	/** Query the complete venue order projection for lost-ack recovery. */
	private async allDexOpenOrders() {
		if (!this.info || !this.mainAddress) return [];
		const dexes = await this.info.perpDexs();
		const names = ['', ...dexes.flatMap((dex) => (dex ? [dex.name] : []))];
		const responses = await boundedReadMap(
			names,
			(dex) => this.info!.frontendOpenOrders({ user: this.mainAddress!, dex }),
			2,
			50
		);
		return responses.flat();
	}

	private async findTwap(twapId: number) {
		if (!this.info || !this.mainAddress) return null;
		try {
			const history = await this.info.twapHistory({ user: this.mainAddress });
			return history.find((job) => job.twapId === twapId) ?? null;
		} catch {
			return null;
		}
	}
	private requireExchange(): ExchangeClient {
		if (!this.exchange || !this.mainAddress) throw new Error('Enable secure trading before submitting orders');
		executionOwnerLease.assertOwner(executionOwnerScope(hyperliquidNetwork.network, this.mainAddress));
		return this.exchange;
	}

	/**
	 * Provider account events are advisory. Re-read the authoritative wallet
	 * account at the last safe point before signing so an account switch cannot
	 * leave the displayed account and the executing local agent out of sync.
	 */
	private async assertCurrentAccount(): Promise<void> {
		if (!this.provider || !this.mainAddress) throw new Error('Secure trading account is unavailable');
		await assertProviderAccount(this.provider, this.mainAddress);
	}

	private async reconcileCloids(cloids: `0x${string}`[]): Promise<{ found: boolean; complete: boolean; accepted: boolean; orderIds: string[]; matchedCloids: string[] }> {
		if (!this.info || !this.mainAddress) return { found: false, complete: false, accepted: false, orderIds: [], matchedCloids: [] };
		try {
			const [openOrders, fills] = await Promise.all([
				this.allDexOpenOrders(),
				this.info.userFills({ user: this.mainAddress })
			]);
			return reconcileCloids(cloids, openOrders, fills);
		} catch {
			return { found: false, complete: false, accepted: false, orderIds: [], matchedCloids: [] };
		}
	}

	private async reconcilePersistedCommands(): Promise<void> {
		const unresolved = unresolvedExecutionCommands(this.mainAddress!);
		if (unresolved.length === 0) return;
		const projections = await Promise.all([
			this.allDexOpenOrders(),
			this.info!.userFills({ user: this.mainAddress! })
		]);
		for (const command of unresolved) {
			if (command.kind === 'place' || command.kind === 'scale') {
				const result = reconcileCloids(command.cloids, projections[0], projections[1]);
				const knownVenueIdsProven = venueIdsProveComplete(command.venueOrderIds, command.cloids, result.orderIds);
				finishExecutionCommand(this.mainAddress!, command.commandId, (knownVenueIdsProven || result.complete)
					? { status: 'reconciled', venueOrderIds: result.orderIds }
					: { status: 'uncertain', venueOrderIds: [], error: 'No authoritative projection found after restart; manual reconciliation required' });
				continue;
			}
			if (command.kind === 'twap') {
				if (command.targetTwapId == null) {
					finishExecutionCommand(this.mainAddress!, command.commandId, {
						status: 'uncertain',
						venueOrderIds: [],
						error: 'TWAP creation outcome cannot be proven after restart; manual reconciliation required'
					});
					continue;
				}
				const job = await this.findTwap(command.targetTwapId);
				if (job && job.status.status !== 'activated') {
					finishExecutionCommand(this.mainAddress!, command.commandId, {
						status: 'reconciled',
						venueOrderIds: [String(command.targetTwapId)]
					});
				} else if (job) {
					finishExecutionCommand(this.mainAddress!, command.commandId, {
						status: 'rejected',
						venueOrderIds: [String(command.targetTwapId)],
						error: 'TWAP cancellation was not applied; TWAP remains active'
					});
				} else {
					finishExecutionCommand(this.mainAddress!, command.commandId, {
						status: 'uncertain',
						venueOrderIds: [],
						error: 'TWAP cancellation outcome cannot be proven after restart; manual reconciliation required'
					});
				}
				continue;
			}
			if (command.kind === 'scheduleCancel') {
				finishExecutionCommand(this.mainAddress!, command.commandId, {
					status: 'uncertain',
					venueOrderIds: [],
					error: 'Dead-man switch outcome has no authoritative read endpoint after restart; manual reconciliation required'
				});
				continue;
			}
			const target = projections[0].find((order) => String(order.oid) === command.targetOrderId);
			if (command.kind === 'cancel') {
				finishExecutionCommand(this.mainAddress!, command.commandId, target
					? { status: 'rejected', venueOrderIds: [command.targetOrderId!], error: 'Cancel was not applied; order remains open after restart' }
					: { status: 'reconciled', venueOrderIds: [command.targetOrderId!] });
				continue;
			}
			if (command.kind === 'modify') {
				// Reconcile by the deterministic modify cloid recorded in the
				// journal, not the stale original oid: Hyperliquid modify REPLACES
				// the order with a new oid, so the original oid is gone after an
				// applied modify. Use normalized price comparison because the venue
				// canonicalizes prices (e.g. "53847.0") differently from the local
				// format ("53847").
				const modifyCloid = command.cloids[0];
				const outcome = reconcileModifyPostState({
					modifyCloid,
					targetField: command.targetField ?? 'limitPx',
					targetPrice: command.targetPrice ?? '',
					oldOrderId: command.targetOrderId ?? '',
					orders: projections[0]
				});
				if (outcome.status === 'applied') {
					finishExecutionCommand(this.mainAddress!, command.commandId, { status: 'reconciled', venueOrderIds: [outcome.orderId!] });
				} else if (outcome.status === 'rejected') {
					finishExecutionCommand(this.mainAddress!, command.commandId, { status: 'rejected', venueOrderIds: [outcome.orderId ?? command.targetOrderId!], error: outcome.reason ?? 'Modify was not applied' });
				} else {
					finishExecutionCommand(this.mainAddress!, command.commandId, { status: 'uncertain', venueOrderIds: [], error: 'Modified order is absent after restart; manual reconciliation required' });
				}
			}
		}
		if (unresolvedExecutionCommands(this.mainAddress!).length > 0) {
			throw new Error('Unresolved execution outcomes require authoritative reconciliation before new trading');
		}
	}

	private ack(commandId: string, sequence: number, receiveUs: number, sendUs: number, accepted: boolean, venueOrderIds: string[], error?: string, uncertain = false, reconciled = false): ExecutionAck {
		const actionStartedUs = this.actionStartedUs.get(commandId) ?? receiveUs;
		this.actionStartedUs.delete(commandId);
		recordDispatchLatency(actionStartedUs, receiveUs, sendUs, commandId);
		const ack = {
			commandId,
			sessionId: 'local-agent',
			sessionSequence: sequence,
			idempotencyKey: commandId,
			accepted,
			uncertain,
			reconciled,
			error,
			venueOrderIds,
			gatewayReceiveUs: receiveUs,
			venueSendUs: sendUs,
			completedUs: nowUs()
		};
		recordExecutionAck(ack);
		// Reconcile account, fills, referral, fee, and reward state after every
		// mutation acknowledgement without extending the signing/venue latency
		// measured by this command. WebSocket updates remain the fast path; this
		// snapshot is the authoritative convergence path for attribution.
		void import('$lib/hl/account')
				.then(({ refreshAccountSnapshot }) => refreshAccountSnapshot())
				.catch(() => undefined);
		if (uncertain) void this.reconcileUncertainCommand(commandId).catch(() => undefined);
		return ack;
	}

	private async reconcileUncertainCommand(commandId: string): Promise<void> {
		if (!this.info || !this.mainAddress) return;
		const command = unresolvedExecutionCommands(this.mainAddress).find((entry) => entry.commandId === commandId);
		if (!command || (command.kind !== 'place' && command.kind !== 'scale')) return;
		const [openOrders, fills] = await Promise.all([
			this.allDexOpenOrders(),
			this.info.userFills({ user: this.mainAddress })
		]);
		const result = reconcileCloids(command.cloids, openOrders, fills);
		const knownVenueIdsProven = venueIdsProveComplete(command.venueOrderIds, command.cloids, result.orderIds);
		if (knownVenueIdsProven || result.complete) {
			finishExecutionCommand(this.mainAddress, commandId, { status: 'reconciled', venueOrderIds: result.orderIds });
		}
	}
}

export const localExecution = new LocalExecutionClient();
