<script lang="ts">
	import { positions, openOrders, fills, bottomPanelTab, marketRegistry, twapJobs, localAlgoJobs, deadmanStatus, isConnected, walletAddress, accountSyncStatus, orderBook, selectedMarket, selectMarket, selectMarketForExecution } from '$lib/stores';
	import { exportExecutionAudit } from '$lib/execution/commandJournal';
	import { automationTriggerTelemetry } from '$lib/execution/automationTelemetry';
	import { privacyMode } from '$lib/privacyMode';
	import { formatPrice, formatSize, formatTime } from '$lib/format';
	import { cancelOrder as cancelHlOrderApi, cancelTwap as cancelHlTwap, fetchOpenOrders, fetchPositions, placeOrder, startAlgoOrder } from '$lib/hl/orders';
	import { buildPositionCloseIntent, type PositionCloseMode } from '$lib/execution/positionClose';
	import { buildPositionReversePlan, reverseCloseReconciliation } from '$lib/execution/positionReverse';
	import { buildCancelAllPlan, reconcileCancelAllOutcomes, type CancelAllScope } from '$lib/execution/cancelAll';
	import { buildFlattenPlan, type FlattenScope } from '$lib/execution/flattenAll';
	import { get } from 'svelte/store';
	import { X, Edit2, TrendingUp, TrendingDown } from 'lucide-svelte';
	import { cancelChase, pauseChase, resumeChase } from '$lib/execution/chase';
	import { cancelOco, pauseOco, resumeOco } from '$lib/execution/oco';
	import { cancelTrailing, pauseTrailing, resumeTrailing } from '$lib/execution/trailing';
	import { cancelIceberg as cancelIcebergJob, pauseIceberg as pauseIcebergJob, resumeIceberg as resumeIcebergJob } from '$lib/execution/iceberg';
	import { cancelSwarm, pauseSwarm, resumeSwarm } from '$lib/execution/swarm';
	import { cancelPingPong, pausePingPong, resumePingPong } from '$lib/execution/pingPong';
	import { cancelAdaptiveExecution, pauseAdaptiveExecution, resumeAdaptiveExecution } from '$lib/execution/adaptiveTwap';
	import { cancelPov, pausePov, resumePov } from '$lib/execution/pov';
	import { cancelBreakEven, pauseBreakEven, resumeBreakEven } from '$lib/execution/breakEven';
	import { cancelConditionalLadder, pauseConditionalLadder, resumeConditionalLadder } from '$lib/execution/conditionalLadder';
	import { cancelScale, pauseScale, resumeScale } from '$lib/execution/scale';
	import type { LocalAlgoJob } from '$lib/execution/algoJobs';

	async function pauseAlgo(id: string, type: string) {
		if (type === 'iceberg') return pauseIcebergJob(id);
		if (type === 'swarm') return pauseSwarm(id);
		if (type === 'adaptive_twap' || type === 'vwap') return pauseAdaptiveExecution(id);
		if (type === 'pov') return pausePov(id);
		if (type === 'break_even') return pauseBreakEven(id);
		if (type === 'conditional_ladder') return pauseConditionalLadder(id);
		if (type === 'scale') return pauseScale(id);
		if (type === 'ping_pong') return pausePingPong(id);
		throw new Error(`Unsupported local algorithm type: ${type}`);
	}
	async function resumeAlgo(id: string, type: string) {
		if (type === 'iceberg') return resumeIcebergJob(id);
		if (type === 'swarm') return resumeSwarm(id);
		if (type === 'adaptive_twap' || type === 'vwap') return resumeAdaptiveExecution(id);
		if (type === 'pov') return resumePov(id);
		if (type === 'break_even') return resumeBreakEven(id);
		if (type === 'conditional_ladder') return resumeConditionalLadder(id);
		if (type === 'scale') return resumeScale(id);
		if (type === 'ping_pong') return resumePingPong(id);
		throw new Error(`Unsupported local algorithm type: ${type}`);
	}
	async function cancelAlgo(id: string, type: string, emergency = false) {
		if (type === 'iceberg') return cancelIcebergJob(id, emergency);
		if (type === 'swarm') return cancelSwarm(id, emergency);
		if (type === 'adaptive_twap' || type === 'vwap') return cancelAdaptiveExecution(id, emergency);
		if (type === 'pov') return cancelPov(id, emergency);
		if (type === 'break_even') return cancelBreakEven(id, emergency);
		if (type === 'conditional_ladder') return cancelConditionalLadder(id, emergency);
		if (type === 'scale') return cancelScale(id, emergency);
		if (type === 'ping_pong') return cancelPingPong(id, emergency);
		throw new Error(`Unsupported local algorithm type: ${type}`);
	}
	function canResumeAlgo(job: LocalAlgoJob): boolean {
		// A failed ladder may already have persisted a fired edge. Re-running it
		// would be a new execution attempt, not a safe resume.
		return !job.restartRecoveryRequired && (job.status === 'paused' || (job.status === 'failed' && job.type !== 'conditional_ladder'));
	}

	async function cancelOrder(orderId: string, market: string) {
		if (!privateStateLive) return;
		const result = await cancelHlOrderApi(orderId, market);
		if (result.ok) {
			openOrders.update((orders) => orders.filter((o) => o.id !== orderId));
		}
	}

	let positionActionError = '';
	let positionActionMessage = '';
	let positionActionBusy = '';
	let quickCloseMenu = '';
	let reverseConfirm = '';
	let scaleCloseConfirm = '';
	let scaleCloseStart = 0;
	let scaleCloseEnd = 0;
	let scaleCloseLevels = 5;
	let cancelAllConfirm: CancelAllScope | null = null;
	let cancelAllBusy = false;
	let cancelAllError = '';
	let cancelAllOutcomes: { market: string; orderId: string; ok: boolean; error?: string }[] = [];
	let flattenConfirm: FlattenScope | null = null;
	let flattenBusy = false;
	let flattenError = '';
	let flattenOutcomes: { market: string; positionId: string; ok: boolean; error?: string }[] = [];
	async function closePosition(positionId: string, mode: PositionCloseMode) {
		positionActionError = '';
		positionActionMessage = '';
		if (!privateStateLive) {
			positionActionError = 'Account state is stale; position controls are paused until reconciliation completes';
			return;
		}
		const position = $positions.find((candidate) => candidate.id === positionId);
		const result = buildPositionCloseIntent(position, $marketRegistry, $selectedMarket, $orderBook, mode);
		if (!result.intent) {
			positionActionError = result.error ?? 'Close is unavailable';
			return;
		}
		positionActionBusy = positionId;
		try {
			const submitted = await placeOrder(result.intent);
			if (!submitted.ok) {
				positionActionError = submitted.error ?? 'Close was rejected';
				return;
			}
			quickCloseMenu = '';
			positionActionMessage = `${mode === 'market' ? 'Market' : 'Limit-at-quote'} close submitted; awaiting authoritative position reconciliation.`;
			await Promise.all([fetchOpenOrders(), fetchPositions()]);
		} finally {
			positionActionBusy = '';
		}
	}
	async function closePositionTwap(positionId: string, minutes: number) {
		positionActionError = '';
		positionActionMessage = '';
		if (!privateStateLive) {
			positionActionError = 'Account state is stale; position controls are paused until reconciliation completes';
			return;
		}
		const position = $positions.find((candidate) => candidate.id === positionId);
		const close = buildPositionCloseIntent(position, $marketRegistry, $selectedMarket, $orderBook, 'market');
		if (!close.intent) { positionActionError = close.error ?? 'TWAP close is unavailable'; return; }
		positionActionBusy = positionId;
		try {
			const result = await startAlgoOrder({ ...close.intent, type: 'twap', algo: { type: 'twap', config: { twapDuration: minutes } } });
			if (!result.ok) positionActionError = result.error ?? 'TWAP close was rejected';
			else { quickCloseMenu = ''; positionActionMessage = `${minutes}-minute reduce-only TWAP close started; awaiting venue progress.`; }
		} finally {
			positionActionBusy = '';
		}
	}

	function openScaleClose(positionId: string) {
		positionActionError = '';
		const position = $positions.find((candidate) => candidate.id === positionId);
		if (!position || !Number.isFinite(position.markPrice) || position.markPrice <= 0) {
			positionActionError = 'Scale close needs an authoritative position mark price';
			return;
		}
		scaleCloseStart = position.markPrice;
		scaleCloseEnd = position.markPrice;
		scaleCloseLevels = 5;
		scaleCloseConfirm = positionId;
	}

	async function closePositionScale(positionId: string) {
		positionActionError = '';
		positionActionMessage = '';
		if (!privateStateLive) {
			positionActionError = 'Account state is stale; position controls are paused until reconciliation completes';
			return;
		}
		const position = $positions.find((candidate) => candidate.id === positionId);
		const close = buildPositionCloseIntent(position, $marketRegistry, $selectedMarket, $orderBook, 'market');
		if (!close.intent) { positionActionError = close.error ?? 'Scale close is unavailable'; return; }
		positionActionBusy = positionId;
		try {
			const result = await startAlgoOrder({
				...close.intent,
				type: 'scale',
				postOnly: false,
				algo: { type: 'scale', config: { scaleStartPrice: scaleCloseStart, scaleEndPrice: scaleCloseEnd, scaleLevels: scaleCloseLevels, scaleSkew: 1 } }
			});
			if (!result.ok) positionActionError = result.error ?? 'Scale close was rejected';
			else {
				scaleCloseConfirm = '';
				quickCloseMenu = '';
				positionActionMessage = 'Reduce-only Scale close started; awaiting child-order reconciliation.';
			}
		} finally {
			positionActionBusy = '';
		}
	}

	async function reversePosition(positionId: string) {
		positionActionError = '';
		positionActionMessage = '';
		if (!privateStateLive) {
			positionActionError = 'Account state is stale; reverse is paused until reconciliation completes';
			return;
		}
		const position = $positions.find((candidate) => candidate.id === positionId);
		const planned = buildPositionReversePlan(position, $marketRegistry, $selectedMarket, $orderBook);
		if (!planned.plan) {
			positionActionError = planned.error ?? 'Reverse is unavailable';
			return;
		}
		positionActionBusy = positionId;
		try {
			const close = await placeOrder(planned.plan.close);
			if (!close.ok) {
				positionActionError = `Reverse close leg was rejected: ${close.error ?? 'unknown error'}`;
				return;
			}
			await fetchPositions();
			const closeState = reverseCloseReconciliation(get(positions), planned.plan);
			if (closeState === 'ambiguous') {
				positionActionError = 'Reverse paused: account identity is incomplete after the close leg; reconcile before retrying';
				return;
			}
			if (closeState !== 'flat') {
				positionActionError = 'Reverse paused: close leg is not yet flat in the authoritative account snapshot';
				return;
			}
			const open = await placeOrder(planned.plan.open);
			if (!open.ok) {
				positionActionError = `Reverse left the position flat: opposite-side open leg was rejected: ${open.error ?? 'unknown error'}`;
				return;
			}
			reverseConfirm = '';
			quickCloseMenu = '';
			positionActionMessage = 'Reverse open submitted after a flat snapshot; awaiting authoritative reconciliation.';
			await Promise.all([fetchOpenOrders(), fetchPositions()]);
		} finally {
			positionActionBusy = '';
		}
	}

	async function cancelAllOrders(scope: CancelAllScope) {
		cancelAllError = '';
		cancelAllOutcomes = [];
		if (!privateStateLive) {
			cancelAllError = 'Account state is stale; cancel-all is paused until reconciliation completes';
			return;
		}
		const plan = buildCancelAllPlan(get(openOrders), get(marketRegistry), scope);
		if (plan.targets.length === 0) {
			cancelAllError = plan.skipped.length ? 'No orders have a complete registered market identity; reconcile account state before cancelling' : 'No matching open orders to cancel';
			return;
		}
		cancelAllBusy = true;
		try {
			const acknowledgements: { market: string; orderId: string; ok: boolean; error?: string }[] = [];
			for (const target of plan.targets) {
				const result = await cancelHlOrderApi(target.orderId, target.marketKey);
				acknowledgements.push({ market: target.market, orderId: target.orderId, ok: result.ok, error: result.error });
			}
			const refreshed = await fetchOpenOrders();
			const remaining = new Set(get(openOrders).map((order) => order.id));
			cancelAllOutcomes = reconcileCancelAllOutcomes(acknowledgements, plan.skipped, refreshed, remaining);
		} finally {
			cancelAllBusy = false;
			cancelAllConfirm = null;
		}
	}

	async function flattenPositions(scope: FlattenScope) {
		flattenError = '';
		flattenOutcomes = [];
		if (!privateStateLive) {
			flattenError = 'Account state is stale; close-all is paused until reconciliation completes';
			return;
		}
		const plan = buildFlattenPlan(get(positions), get(marketRegistry), scope);
		if (plan.targets.length === 0) {
			flattenError = plan.skipped.length ? 'No positions have a complete registered market identity; reconcile account state before closing' : 'No matching positions to close';
			return;
		}
		const originalMarket = get(selectedMarket);
		const outcomes: { market: string; positionId: string; ok: boolean; error?: string }[] = [];
		flattenBusy = true;
		try {
			for (const target of plan.targets) {
				const candidates = get(positions).filter((position) => position.apiCoin === target.apiCoin || position.marketKey === target.marketKey);
				if (candidates.some((position) => position.apiCoin !== target.apiCoin || position.marketKey !== target.marketKey)) {
					outcomes.push({ market: target.market.symbol, positionId: target.positionId, ok: false, error: 'position identity is incomplete; reconciliation required' });
					continue;
				}
				const position = candidates[0];
				if (!position) {
					outcomes.push({ market: target.market.symbol, positionId: target.positionId, ok: true, error: 'already flat in the latest account snapshot' });
					continue;
				}
				if (!(await selectMarketForExecution(target.market))) {
					outcomes.push({ market: target.market.symbol, positionId: target.positionId, ok: false, error: 'exact market feed did not become live before the close timeout' });
					continue;
				}
				const intent = buildPositionCloseIntent(position, get(marketRegistry), get(selectedMarket), get(orderBook), 'market');
				if (!intent.intent) {
					outcomes.push({ market: target.market.symbol, positionId: target.positionId, ok: false, error: intent.error ?? 'close is unavailable' });
					continue;
				}
				const close = await placeOrder(intent.intent);
				if (!close.ok) {
					outcomes.push({ market: target.market.symbol, positionId: target.positionId, ok: false, error: close.error ?? 'close was rejected' });
					continue;
				}
				await fetchPositions();
				const state = reverseCloseReconciliation(get(positions), target);
				if (state === 'flat') outcomes.push({ market: target.market.symbol, positionId: target.positionId, ok: true });
				else outcomes.push({ market: target.market.symbol, positionId: target.positionId, ok: false, error: state === 'ambiguous' ? 'close needs reconciliation: returned position identity is incomplete' : 'close acknowledged but position remains open in the refreshed account snapshot' });
			}
			for (const skipped of plan.skipped) outcomes.push({ market: 'Unknown market', positionId: skipped.positionId, ok: false, error: skipped.reason });
			flattenOutcomes = outcomes;
		} finally {
			if (originalMarket) selectMarket(originalMarket);
			flattenBusy = false;
			flattenConfirm = null;
		}
	}

	let twapError = '';
	let auditExportMessage = '';
	function downloadExecutionAudit(): void {
		if (!privateStateLive || !$walletAddress) return;
		const body = JSON.stringify(exportExecutionAudit($walletAddress), null, 2);
		const url = URL.createObjectURL(new Blob([body], { type: 'application/json' }));
		const link = document.createElement('a');
		link.href = url;
		link.download = `vice-execution-audit-${$walletAddress.slice(0, 8).toLowerCase()}-${Date.now()}.json`;
		link.click();
		URL.revokeObjectURL(url);
		auditExportMessage = 'Downloaded a local audit record. It includes your account and command IDs, but no private key, signature, request body, or venue error text.';
	}
	async function stopTwap(twapId: number, market: string) {
		if (!privateStateLive) {
			twapError = 'Account state is stale; TWAP cancellation is paused until reconciliation completes';
			return;
		}
		twapError = '';
		const result = await cancelHlTwap(twapId, market);
		if (!result.ok) twapError = result.error ?? 'TWAP cancel failed';
	}

	$: privateStateLive = $isConnected && $accountSyncStatus === 'live' && !$privacyMode;
	$: visiblePositions = privateStateLive ? $positions : [];
	$: visibleOrders = privateStateLive ? $openOrders : [];
	$: visibleFills = privateStateLive ? $fills : [];
	$: totalUnrealizedPnl = privateStateLive ? $positions.reduce((sum, p) => sum + p.unrealizedPnl, 0) : 0;
</script>

<div class="h-full flex flex-col bg-terminal-bg-secondary">
	{#if !privateStateLive}
		<div class="border-b border-terminal-yellow/30 bg-terminal-yellow/5 px-3 py-1.5 text-3xs text-terminal-yellow">
			{#if $privacyMode}Private account values are hidden by privacy mode.{:else}Private account rows are hidden until the authoritative account snapshot is live{#if $isConnected} ({$accountSyncStatus}){/if}.{/if}
		</div>
	{/if}
	<!-- Tab Header - FTX style -->
	<div class="h-8 flex items-center justify-between px-2 border-b border-terminal-border bg-terminal-bg">
		<div class="flex items-center">
			<button
				class="px-3 py-1.5 text-2xs font-medium border-b-2 {$bottomPanelTab === 'positions' ? 'border-terminal-cyan text-terminal-cyan' : 'border-transparent text-terminal-text-secondary hover:text-terminal-text'}"
				onclick={() => bottomPanelTab.set('positions')}
			>
				Positions ({privateStateLive ? $positions.length : 0})
			</button>
			<button
				class="px-3 py-1.5 text-2xs font-medium border-b-2 {$bottomPanelTab === 'algos' ? 'border-terminal-cyan text-terminal-cyan' : 'border-transparent text-terminal-text-secondary hover:text-terminal-text'}"
				onclick={() => bottomPanelTab.set('algos')}
			>
				Algorithms ({$privacyMode ? '—' : $localAlgoJobs.filter((job) => job.status === 'running').length})
			</button>
			<button
				class="px-3 py-1.5 text-2xs font-medium border-b-2 {$bottomPanelTab === 'orders' ? 'border-terminal-cyan text-terminal-cyan' : 'border-transparent text-terminal-text-secondary hover:text-terminal-text'}"
				onclick={() => bottomPanelTab.set('orders')}
			>
				Open Orders ({privateStateLive ? $openOrders.length : 0})
			</button>
			<button
				class="px-3 py-1.5 text-2xs font-medium border-b-2 {$bottomPanelTab === 'twaps' ? 'border-terminal-cyan text-terminal-cyan' : 'border-transparent text-terminal-text-secondary hover:text-terminal-text'}"
				onclick={() => bottomPanelTab.set('twaps')}
			>
				TWAP ({$privacyMode ? '—' : $twapJobs.filter((job) => job.status === 'active').length})
			</button>
			<button
				class="px-3 py-1.5 text-2xs font-medium border-b-2 {$bottomPanelTab === 'fills' ? 'border-terminal-cyan text-terminal-cyan' : 'border-transparent text-terminal-text-secondary hover:text-terminal-text'}"
				onclick={() => bottomPanelTab.set('fills')}
			>
				Trade History
			</button>
		</div>

		<span class="dither-rule mx-3 text-terminal-text-muted" aria-hidden="true"></span>

		<!-- P&L Summary - FTX style right side -->
		<div class="flex items-center gap-4 text-2xs">
			<span class="text-terminal-text-muted">Dead-man: <span class="font-mono {$deadmanStatus === 'armed' ? 'text-terminal-yellow' : $deadmanStatus === 'uncertain' ? 'text-terminal-red' : 'text-terminal-text-secondary'}">{$deadmanStatus.toUpperCase()}</span></span>
			<span class="text-terminal-text-muted">Net P&L: <span class="font-mono {totalUnrealizedPnl >= 0 ? 'text-terminal-green' : 'text-terminal-red'}">{totalUnrealizedPnl >= 0 ? '+' : ''}${totalUnrealizedPnl.toFixed(2)}</span></span>
			{#if privateStateLive}
				<button class="rounded border border-terminal-border px-1.5 py-0.5 text-3xs text-terminal-text-muted hover:text-terminal-cyan" onclick={downloadExecutionAudit}>Export audit</button>
			{/if}
		</div>
	</div>
	{#if auditExportMessage}<div class="border-b border-terminal-border px-3 py-1 text-3xs text-terminal-text-muted" role="status">{auditExportMessage}</div>{/if}

	<!-- Content -->
	<div class="flex-1 overflow-auto">
		{#if $bottomPanelTab === 'positions'}
			<div class="flex items-center justify-between gap-2 border-b border-terminal-border px-3 py-1.5">
				<span class="text-3xs text-terminal-text-muted">Close-all switches to each exact market and waits for its live feed. It stops only that market when a close cannot be reconciled.</span>
				{#if !flattenConfirm}
					<div class="flex gap-1">
						<button class="rounded border border-terminal-border px-1.5 py-0.5 text-3xs text-terminal-text-muted hover:text-terminal-text disabled:opacity-50" disabled={flattenBusy} onclick={() => (flattenConfirm = 'long')}>CLOSE LONGS</button>
						<button class="rounded border border-terminal-border px-1.5 py-0.5 text-3xs text-terminal-text-muted hover:text-terminal-text disabled:opacity-50" disabled={flattenBusy} onclick={() => (flattenConfirm = 'short')}>CLOSE SHORTS</button>
						<button class="rounded border border-terminal-red/60 px-1.5 py-0.5 text-3xs text-terminal-red hover:bg-terminal-red/10 disabled:opacity-50" disabled={flattenBusy} onclick={() => (flattenConfirm = 'both')}>FLATTEN ALL</button>
					</div>
				{:else}
					<div class="flex items-center gap-1 text-3xs text-terminal-yellow">
						<span>Close {flattenConfirm === 'both' ? 'all positions' : flattenConfirm === 'long' ? 'all longs' : 'all shorts'}?</span>
						<button class="rounded border border-terminal-border px-1.5 py-0.5" onclick={() => (flattenConfirm = null)}>No</button>
						<button class="rounded bg-terminal-red/20 px-1.5 py-0.5 text-terminal-red" onclick={() => flattenPositions(flattenConfirm!)}>Confirm</button>
					</div>
				{/if}
			</div>
			{#if flattenError}<div class="border-b border-terminal-border px-3 py-1.5 text-2xs text-terminal-red">{flattenError}</div>{/if}
			{#if flattenOutcomes.length}
				<div class="border-b border-terminal-border px-3 py-1.5 text-3xs text-terminal-text-muted">
					{#each flattenOutcomes as outcome (outcome.positionId)}
						<div class={outcome.ok ? 'text-terminal-green' : 'text-terminal-red'}>{outcome.market} · {outcome.ok ? (outcome.error ?? 'flat in refreshed account snapshot') : outcome.error ?? 'close failed'}</div>
					{/each}
				</div>
			{/if}
			{#if positionActionError}<div class="px-3 py-1.5 text-2xs text-terminal-red border-b border-terminal-border">{positionActionError}</div>{/if}
			{#if positionActionMessage}<div class="px-3 py-1.5 text-2xs text-terminal-yellow border-b border-terminal-border">{positionActionMessage}</div>{/if}
			<table class="w-full text-2xs">
				<thead class="sticky top-0 bg-terminal-bg-secondary">
					<tr class="text-terminal-text-muted">
						<th class="cell-md text-left font-normal">Market</th>
						<th class="cell-md text-left font-normal">Side</th>
						<th class="cell-md text-right font-normal">Position Size</th>
						<th class="cell-md text-right font-normal">Notional size</th>
						<th class="cell-md text-right font-normal">Est. liquidation price</th>
						<th class="cell-md text-right font-normal">Mark price</th>
						<th class="cell-md text-right font-normal">PnL</th>
						<th class="cell-md text-right font-normal">Avg open price</th>
						<th class="cell-md text-right font-normal">Break-even price</th>
						<th class="cell-md text-center font-normal"></th>
					</tr>
				</thead>
				<tbody>
					{#each visiblePositions as position (position.id)}
						<tr class="hover:bg-terminal-bg-hover transition-colors border-b border-terminal-border/30">
							<td class="cell-md font-medium text-terminal-cyan">{position.market}</td>
							<td class="cell-md">
								<span class="flex items-center gap-1 {position.side === 'long' ? 'text-terminal-green' : 'text-terminal-red'}">
									{#if position.side === 'long'}
										<TrendingUp class="w-3 h-3" />
									{:else}
										<TrendingDown class="w-3 h-3" />
									{/if}
									<span class="uppercase font-medium">{position.side}</span>
									{#if position.leverage}
										<span class="text-terminal-text-muted">{position.leverage}x</span>
									{/if}
								</span>
							</td>
							<td class="cell-md text-right font-mono">{formatSize(position.size)}</td>
							<td class="cell-md text-right font-mono">${(position.size * position.markPrice).toFixed(2)}</td>
							<td class="cell-md text-right font-mono text-terminal-orange">
								{position.liquidationPrice ? `$${formatPrice(position.liquidationPrice)}` : 'N/A'}
							</td>
							<td class="cell-md text-right font-mono">${formatPrice(position.markPrice)}</td>
							<td class="cell-md text-right font-mono {position.unrealizedPnl >= 0 ? 'text-terminal-green' : 'text-terminal-red'}">
								{position.unrealizedPnl >= 0 ? '+' : ''}${position.unrealizedPnl.toFixed(2)}
							</td>
							<td class="cell-md text-right font-mono">${formatPrice(position.entryPrice)}</td>
							<td class="cell-md text-right font-mono">${formatPrice(position.entryPrice)}</td>
							<td class="cell-md text-center">
								<div class="relative inline-flex gap-1">
									<button
										class="px-2 py-1 text-3xs font-medium rounded bg-terminal-red/20 text-terminal-red hover:bg-terminal-red/30 transition-colors disabled:opacity-50"
										disabled={positionActionBusy === position.id}
										onclick={() => closePosition(position.id, 'market')}
									>
										{positionActionBusy === position.id ? 'WORKING…' : 'MARKET CLOSE'}
									</button>
									<button aria-label={`More close options for ${position.market}`} class="px-1.5 py-1 text-3xs rounded border border-terminal-border text-terminal-text-muted hover:text-terminal-text" disabled={positionActionBusy === position.id} onclick={() => (quickCloseMenu = quickCloseMenu === position.id ? '' : position.id)}>⌄</button>
									{#if quickCloseMenu === position.id}
										<div class="absolute right-0 top-7 z-20 min-w-36 rounded border border-terminal-border bg-terminal-bg p-1 shadow-lg">
											<button class="w-full rounded px-2 py-1 text-left text-3xs text-terminal-text hover:bg-terminal-bg-hover" onclick={() => closePosition(position.id, 'quote')}>LIMIT @ QUOTE</button>
											<button class="w-full rounded px-2 py-1 text-left text-3xs text-terminal-text hover:bg-terminal-bg-hover" onclick={() => closePositionTwap(position.id, 5)}>TWAP CLOSE · 5M</button>
											<button class="w-full rounded px-2 py-1 text-left text-3xs text-terminal-text hover:bg-terminal-bg-hover" onclick={() => openScaleClose(position.id)}>SCALE CLOSE…</button>
											<button class="w-full rounded px-2 py-1 text-left text-3xs text-terminal-yellow hover:bg-terminal-bg-hover" onclick={() => (reverseConfirm = position.id)}>REVERSE…</button>
										</div>
									{/if}
									{#if scaleCloseConfirm === position.id}
										<div class="absolute right-0 top-7 z-30 w-56 rounded border border-terminal-yellow/50 bg-terminal-bg p-2 text-left shadow-lg">
											<p class="text-3xs text-terminal-text">Reduce-only Scale close. Set the venue price range; it stays certification-gated.</p>
											<div class="mt-2 grid grid-cols-2 gap-1 text-3xs">
												<label class="text-terminal-text-muted">Start <input aria-label="Scale close start price" class="mt-0.5 w-full terminal-input px-1 py-0.5 text-right" type="number" min="0" step="any" bind:value={scaleCloseStart} /></label>
												<label class="text-terminal-text-muted">End <input aria-label="Scale close end price" class="mt-0.5 w-full terminal-input px-1 py-0.5 text-right" type="number" min="0" step="any" bind:value={scaleCloseEnd} /></label>
												<label class="text-terminal-text-muted">Levels <input aria-label="Scale close levels" class="mt-0.5 w-full terminal-input px-1 py-0.5 text-right" type="number" min="2" max="100" step="1" bind:value={scaleCloseLevels} /></label>
											</div>
											<div class="mt-2 flex justify-end gap-1">
												<button class="rounded border border-terminal-border px-1.5 py-0.5 text-3xs" onclick={() => (scaleCloseConfirm = '')}>Cancel</button>
												<button class="rounded bg-terminal-yellow/20 px-1.5 py-0.5 text-3xs text-terminal-yellow" onclick={() => closePositionScale(position.id)}>Start Scale</button>
											</div>
										</div>
									{/if}
									{#if reverseConfirm === position.id}
										<div class="absolute right-0 top-7 z-30 w-52 rounded border border-terminal-yellow/50 bg-terminal-bg p-2 text-left shadow-lg">
											<p class="text-3xs text-terminal-text">Reverse closes this position first. It opens the opposite side only after a flat account snapshot.</p>
											<div class="mt-2 flex justify-end gap-1">
												<button class="rounded border border-terminal-border px-1.5 py-0.5 text-3xs" onclick={() => (reverseConfirm = '')}>Cancel</button>
												<button class="rounded bg-terminal-yellow/20 px-1.5 py-0.5 text-3xs text-terminal-yellow" onclick={() => reversePosition(position.id)}>Confirm reverse</button>
											</div>
										</div>
									{/if}
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{:else if $bottomPanelTab === 'orders'}
			<div class="flex items-center justify-between gap-2 border-b border-terminal-border px-3 py-1.5">
				<span class="text-3xs text-terminal-text-muted">Cancel known orders only. Every order must match a registered API coin and market key.</span>
				{#if !cancelAllConfirm}
					<div class="flex gap-1">
						<button class="rounded border border-terminal-border px-1.5 py-0.5 text-3xs text-terminal-text-muted hover:text-terminal-text disabled:opacity-50" disabled={cancelAllBusy} onclick={() => (cancelAllConfirm = 'buy')}>CANCEL BIDS</button>
						<button class="rounded border border-terminal-border px-1.5 py-0.5 text-3xs text-terminal-text-muted hover:text-terminal-text disabled:opacity-50" disabled={cancelAllBusy} onclick={() => (cancelAllConfirm = 'sell')}>CANCEL ASKS</button>
						<button class="rounded border border-terminal-red/60 px-1.5 py-0.5 text-3xs text-terminal-red hover:bg-terminal-red/10 disabled:opacity-50" disabled={cancelAllBusy} onclick={() => (cancelAllConfirm = 'both')}>CANCEL ALL</button>
					</div>
				{:else}
					<div class="flex items-center gap-1 text-3xs text-terminal-yellow">
						<span>Cancel {cancelAllConfirm === 'both' ? 'all' : cancelAllConfirm === 'buy' ? 'all bids' : 'all asks'}?</span>
						<button class="rounded border border-terminal-border px-1.5 py-0.5" onclick={() => (cancelAllConfirm = null)}>No</button>
						<button class="rounded bg-terminal-red/20 px-1.5 py-0.5 text-terminal-red" onclick={() => cancelAllOrders(cancelAllConfirm!)}>Confirm</button>
					</div>
				{/if}
			</div>
			{#if cancelAllError}<div class="border-b border-terminal-border px-3 py-1.5 text-2xs text-terminal-red">{cancelAllError}</div>{/if}
			{#if cancelAllOutcomes.length}
				<div class="border-b border-terminal-border px-3 py-1.5 text-3xs text-terminal-text-muted">
					{#each cancelAllOutcomes as outcome (outcome.orderId)}
						<div class={outcome.ok ? 'text-terminal-green' : 'text-terminal-red'}>{outcome.market} · {outcome.ok ? 'cancel confirmed absent from refreshed open orders' : outcome.error ?? 'cancel failed'}</div>
					{/each}
				</div>
			{/if}
			<table class="w-full text-2xs">
				<thead class="sticky top-0 bg-terminal-bg-secondary">
					<tr class="text-terminal-text-muted">
						<th class="cell-md text-left font-normal">Market</th>
						<th class="cell-md text-left font-normal">Side</th>
						<th class="cell-md text-right font-normal">Size</th>
						<th class="cell-md text-right font-normal">Price</th>
						<th class="cell-md text-right font-normal">Filled</th>
						<th class="cell-md text-right font-normal">Time</th>
						<th class="cell-md text-center font-normal"></th>
					</tr>
				</thead>
				<tbody>
					{#each visibleOrders as order (order.id)}
						<tr class="hover:bg-terminal-bg-hover transition-colors border-b border-terminal-border/30">
							<td class="cell-md font-medium">{order.market}</td>
							<td class="cell-md {order.side === 'buy' ? 'text-terminal-green' : 'text-terminal-red'} uppercase font-medium">{order.side}</td>
							<td class="cell-md text-right font-mono">{formatSize(order.size)}</td>
							<td class="cell-md text-right font-mono">{order.price ? `$${formatPrice(order.price)}` : 'Market'}</td>
							<td class="cell-md text-right font-mono">{formatSize(order.filled)}</td>
							<td class="cell-md text-right font-mono text-terminal-text-muted">{formatTime(order.timestamp)}</td>
							<td class="cell-md text-center">
								<button
									class="p-1 rounded hover:bg-terminal-red/20 text-terminal-text-muted hover:text-terminal-red transition-colors"
									disabled={!order.apiCoin && !order.marketKey}
									onclick={() => cancelOrder(order.id, order.apiCoin ?? order.marketKey ?? '')}
								>
									<X class="w-3 h-3" />
								</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{:else if $bottomPanelTab === 'twaps' && !$privacyMode}
			{#if twapError}<div class="px-3 py-1.5 text-2xs text-terminal-red border-b border-terminal-border">{twapError}</div>{/if}
			<table class="w-full text-2xs">
				<thead class="sticky top-0 bg-terminal-bg-secondary"><tr class="text-terminal-text-muted">
					<th class="cell-md text-left font-normal">Market</th><th class="cell-md text-left font-normal">Side</th>
					<th class="cell-md text-right font-normal">Progress</th><th class="cell-md text-right font-normal">Duration</th>
					<th class="cell-md text-left font-normal">Status</th><th class="cell-md"></th>
				</tr></thead>
				<tbody>{#each $twapJobs as job (job.id)}
					<tr class="border-b border-terminal-border/30 hover:bg-terminal-bg-hover">
						<td class="cell-md font-medium">{job.market}</td>
						<td class="cell-md uppercase {job.side === 'buy' ? 'text-terminal-green' : 'text-terminal-red'}">{job.side}</td>
						<td class="cell-md text-right">{formatSize(job.executedSize)} / {formatSize(job.size)}</td>
						<td class="cell-md text-right">{job.minutes}m</td>
						<td class="cell-md uppercase {job.status === 'error' ? 'text-terminal-red' : job.status === 'active' ? 'text-terminal-cyan' : 'text-terminal-text-muted'}" title={job.error}>{job.status}</td>
						<td class="cell-md text-center">{#if job.status === 'active' && job.twapId != null}<button class="px-2 py-1 rounded bg-terminal-red/20 text-terminal-red hover:bg-terminal-red/30" onclick={() => stopTwap(job.twapId!, job.market)}>CANCEL</button>{/if}</td>
					</tr>
				{/each}</tbody>
			</table>
		{:else if $bottomPanelTab === 'algos' && !$privacyMode}
			<div class="border-b border-terminal-border/30 px-3 py-1 text-3xs text-terminal-text-muted" aria-label="Device-local conditional trigger telemetry">
				Device-local triggers: {$automationTriggerTelemetry.counts.priceCross.fired + $automationTriggerTelemetry.counts.candleClose.fired + $automationTriggerTelemetry.counts.candleVolume.fired + $automationTriggerTelemetry.counts.time.fired + $automationTriggerTelemetry.counts.syntheticPair.fired} fired · {$automationTriggerTelemetry.counts.priceCross.paused + $automationTriggerTelemetry.counts.candleClose.paused + $automationTriggerTelemetry.counts.candleVolume.paused + $automationTriggerTelemetry.counts.time.paused + $automationTriggerTelemetry.counts.syntheticPair.paused} paused · {$automationTriggerTelemetry.counts.priceCross.missed + $automationTriggerTelemetry.counts.candleClose.missed + $automationTriggerTelemetry.counts.candleVolume.missed + $automationTriggerTelemetry.counts.time.missed + $automationTriggerTelemetry.counts.syntheticPair.missed} missed
			</div>
			<table class="w-full text-2xs">
				<thead class="sticky top-0 bg-terminal-bg-secondary"><tr class="text-terminal-text-muted">
					<th class="cell-md text-left font-normal">Strategy</th><th class="cell-md text-left font-normal">Market</th><th class="cell-md text-left font-normal">State</th><th class="cell-md text-right font-normal">Children</th><th class="cell-md text-right font-normal">Chases</th><th class="cell-md"></th>
				</tr></thead>
				<tbody>{#each $localAlgoJobs as job (job.id)}<tr class="border-b border-terminal-border/30">
					<td class="cell-md uppercase text-terminal-cyan">{job.type}</td><td class="cell-md">{job.apiCoin}</td><td class="cell-md uppercase {job.status === 'failed' || job.status === 'emergencyStopped' ? 'text-terminal-red' : job.status === 'running' ? 'text-terminal-green' : 'text-terminal-text-muted'}" title={job.error}>{job.status}</td><td class="cell-md text-right">{job.childOrderIds.length}</td><td class="cell-md text-right">{job.type === 'chase' ? `${job.chases} / ${job.maxChases}` : job.type === 'swarm' ? `${job.slicesPlaced} / ${job.slicesTotal}` : job.type === 'ping_pong' ? `${job.completedLegs} / ${job.cycles * 2}` : job.type === 'iceberg' ? `${job.filledSize} / ${job.totalSize}` : job.type === 'scale' ? `${job.filledSize} / ${job.totalSize}` : job.type === 'adaptive_twap' || job.type === 'vwap' || job.type === 'pov' ? `${job.executedSize} / ${job.totalSize}` : job.type === 'break_even' || job.type === 'conditional_ladder' ? (job.activated ? 'armed' : 'waiting') : 'OCO'}</td>
					<td class="cell-md text-right"><div class="flex justify-end gap-1">{#if job.type === 'chase'}{#if job.status === 'running'}<button class="px-1.5 py-0.5 rounded bg-terminal-yellow/15 text-terminal-yellow" onclick={() => pauseChase(job.id)}>PAUSE</button>{:else if !job.restartRecoveryRequired && (job.status === 'paused' || job.status === 'failed')}<button class="px-1.5 py-0.5 rounded bg-terminal-green/15 text-terminal-green" onclick={() => resumeChase(job.id)}>RESUME</button>{/if}{#if ['running', 'paused', 'failed'].includes(job.status)}<button class="px-1.5 py-0.5 rounded bg-terminal-red/15 text-terminal-red" onclick={() => cancelChase(job.id)}>CANCEL</button><button class="px-1.5 py-0.5 rounded bg-terminal-red/30 text-terminal-red" onclick={() => cancelChase(job.id, true)}>STOP</button>{/if}{:else if job.type === 'oco'}{#if job.status === 'running'}<button class="px-1.5 py-0.5 rounded bg-terminal-yellow/15 text-terminal-yellow" onclick={() => pauseOco(job.id)}>PAUSE</button>{:else if !job.restartRecoveryRequired && (job.status === 'paused' || job.status === 'failed')}<button class="px-1.5 py-0.5 rounded bg-terminal-green/15 text-terminal-green" onclick={() => resumeOco(job.id)}>RESUME</button>{/if}{#if ['running', 'paused', 'failed'].includes(job.status)}<button class="px-1.5 py-0.5 rounded bg-terminal-red/15 text-terminal-red" onclick={() => cancelOco(job.id)}>CANCEL</button><button class="px-1.5 py-0.5 rounded bg-terminal-red/30 text-terminal-red" onclick={() => cancelOco(job.id, true)}>STOP</button>{/if}{:else if job.type === 'trailing'}{#if job.status === 'running'}<button class="px-1.5 py-0.5 rounded bg-terminal-yellow/15 text-terminal-yellow" onclick={() => pauseTrailing(job.id)}>PAUSE</button>{:else if !job.restartRecoveryRequired && (job.status === 'paused' || job.status === 'failed')}<button class="px-1.5 py-0.5 rounded bg-terminal-green/15 text-terminal-green" onclick={() => resumeTrailing(job.id)}>RESUME</button>{/if}{#if ['running', 'paused', 'failed'].includes(job.status)}<button class="px-1.5 py-0.5 rounded bg-terminal-red/15 text-terminal-red" onclick={() => cancelTrailing(job.id)}>CANCEL</button><button class="px-1.5 py-0.5 rounded bg-terminal-red/30 text-terminal-red" onclick={() => cancelTrailing(job.id, true)}>STOP</button>{/if}{:else}{#if job.status === 'running'}<button class="px-1.5 py-0.5 rounded bg-terminal-yellow/15 text-terminal-yellow" onclick={() => pauseAlgo(job.id, job.type)}>PAUSE</button>{:else if canResumeAlgo(job)}<button class="px-1.5 py-0.5 rounded bg-terminal-green/15 text-terminal-green" onclick={() => resumeAlgo(job.id, job.type)}>RESUME</button>{/if}{#if ['running', 'paused', 'failed'].includes(job.status)}<button class="px-1.5 py-0.5 rounded bg-terminal-red/15 text-terminal-red" onclick={() => cancelAlgo(job.id, job.type)}>CANCEL</button><button class="px-1.5 py-0.5 rounded bg-terminal-red/30 text-terminal-red" onclick={() => cancelAlgo(job.id, job.type, true)}>STOP</button>{/if}{/if}</div></td>
				</tr>{/each}</tbody>
			</table>
		{:else if $bottomPanelTab === 'fills'}
			<table class="w-full text-2xs">
				<thead class="sticky top-0 bg-terminal-bg-secondary"><tr class="text-terminal-text-muted">
					<th class="cell-md text-left font-normal">Market</th><th class="cell-md text-left font-normal">Side</th><th class="cell-md text-right font-normal">Price</th><th class="cell-md text-right font-normal">Size</th><th class="cell-md text-right font-normal">Fee</th><th class="cell-md text-right font-normal">Time</th>
				</tr></thead>
				<tbody>{#each visibleFills as fill (fill.id)}<tr class="border-b border-terminal-border/30">
					<td class="cell-md">{fill.market}</td><td class="cell-md uppercase {fill.side === 'buy' ? 'text-terminal-green' : 'text-terminal-red'}">{fill.side}</td><td class="cell-md text-right">{formatPrice(fill.price)}</td><td class="cell-md text-right">{formatSize(fill.size)}</td><td class="cell-md text-right">{fill.fee}</td><td class="cell-md text-right text-terminal-text-muted">{formatTime(fill.timestamp)}</td>
				</tr>{/each}</tbody>
			</table>
		{:else}
			<div class="flex items-center justify-center h-full text-terminal-text-muted text-sm">
				No data
			</div>
		{/if}
	</div>
</div>
