<script lang="ts">
	import { accountSyncStatus, executionStatus, isConnected, marketDataStatus, marketRegistry, orderBook, positions, selectedMarket } from '$lib/stores';
	import { privacyMode } from '$lib/privacyMode';
	import { placeOrder, fetchOpenOrders, fetchPositions } from '$lib/hl/orders';
	import { buildPositionCloseIntent } from '$lib/execution/positionClose';
	import { buildPositionReversePlan, reverseCloseReconciliation } from '$lib/execution/positionReverse';
	import { get } from 'svelte/store';
	import { marketCapabilities } from '$lib/marketCapabilities';
	import { marketMatches } from '$lib/chart/chartModel';

	$: marketProfile = marketCapabilities($selectedMarket);
	$: privateStateLive = $isConnected && $executionStatus === 'live' && $accountSyncStatus === 'live' && $marketDataStatus === 'live' && !$privacyMode;
	$: selectedPosition = privateStateLive ? $positions.find((position) => marketMatches($selectedMarket, position.apiCoin, position.marketKey)) : undefined;

	let actionError = '';
	let flattening = false;
	let reverseConfirm = false;
	let reversing = false;

	async function flattenSelectedMarket(): Promise<void> {
		actionError = '';
		if (!marketProfile.supportsPositionLifecycle) {
			actionError = marketProfile.readOnlyReason ?? 'Position lifecycle is not applicable for this market';
			return;
		}
		if (!privateStateLive) {
			actionError = 'Account state is stale; flatten is paused until reconciliation completes';
			return;
		}
		if (!selectedPosition || !$selectedMarket) {
			actionError = 'No open position exists for the selected market';
			return;
		}
		const close = buildPositionCloseIntent(selectedPosition, $marketRegistry, $selectedMarket, $orderBook, 'market');
		if (!close.intent) {
			actionError = close.error ?? 'Flatten is unavailable';
			return;
		}
		flattening = true;
		try {
			const result = await placeOrder(close.intent);
			if (!result.ok) {
				actionError = result.error ?? 'Flatten was rejected';
				return;
			}
			if (!await Promise.all([fetchOpenOrders(), fetchPositions()]).then(([ordersRefreshed, positionsRefreshed]) => ordersRefreshed && positionsRefreshed)) {
				actionError = 'Flatten was accepted but authoritative reconciliation is unavailable';
			}
		} finally {
			flattening = false;
		}
	}

	async function reverseSelectedMarket(): Promise<void> {
		actionError = '';
		if (!marketProfile.supportsPositionLifecycle) {
			actionError = marketProfile.readOnlyReason ?? 'Position lifecycle is not applicable for this market';
			return;
		}
		if (!privateStateLive) {
			actionError = 'Account state is stale; reverse is paused until reconciliation completes';
			return;
		}
		if (!selectedPosition || !$selectedMarket) {
			actionError = 'No open position exists for the selected market';
			return;
		}
		const planned = buildPositionReversePlan(selectedPosition, $marketRegistry, $selectedMarket, $orderBook);
		if (!planned.plan) {
			actionError = planned.error ?? 'Reverse is unavailable';
			return;
		}
		reversing = true;
		try {
			const close = await placeOrder(planned.plan.close);
			if (!close.ok) {
				actionError = `Reverse close leg was rejected: ${close.error ?? 'unknown error'}`;
				return;
			}
			if (!await fetchPositions()) {
				actionError = 'Reverse paused: authoritative position reconciliation is unavailable after the close leg';
				return;
			}
			const closeState = reverseCloseReconciliation(get(positions), planned.plan);
			if (closeState === 'ambiguous') {
				actionError = 'Reverse paused: account identity is incomplete after the close leg; reconcile before retrying';
				return;
			}
			if (closeState !== 'flat') {
				actionError = 'Reverse paused: close leg is not yet flat in the authoritative account snapshot';
				return;
			}
			const open = await placeOrder(planned.plan.open);
			if (!open.ok) {
				actionError = `Reverse left the position flat: opposite-side open leg was rejected: ${open.error ?? 'unknown error'}`;
				return;
			}
			if (!await Promise.all([fetchOpenOrders(), fetchPositions()]).then(([ordersRefreshed, positionsRefreshed]) => ordersRefreshed && positionsRefreshed)) {
				actionError = 'Reverse open was accepted but authoritative reconciliation is unavailable';
			}
		} finally {
			reversing = false;
			reverseConfirm = false;
		}
	}
</script>

{#if marketProfile.supportsPositionLifecycle}
	<section data-testid="position-market-actions" class="rounded border border-terminal-border/60 bg-terminal-bg p-2 space-y-1.5">
		<div class="flex items-baseline justify-between gap-2">
			<div>
				<h3 class="text-3xs uppercase tracking-wide text-terminal-text-muted">Position management</h3>
				<p class="text-3xs text-terminal-text-muted">Selected market · close or reverse the current position</p>
			</div>
			{#if privateStateLive && selectedPosition}
				<span class="text-3xs font-mono {selectedPosition.side === 'long' ? 'text-terminal-green' : 'text-terminal-red'}">{selectedPosition.side.toUpperCase()} {selectedPosition.size}</span>
			{:else if privateStateLive}
				<span class="text-3xs text-terminal-text-muted">FLAT</span>
			{:else}
				<span class="text-3xs text-terminal-text-muted">—</span>
			{/if}
		</div>
		<div class="grid grid-cols-2 gap-1">
			<button data-action-id="ui.src.lib.components.positionmarketactions.button.flatten" aria-label="Flatten selected market position" disabled={flattening || !privateStateLive || !selectedPosition} onclick={() => void flattenSelectedMarket()} class="rounded border border-terminal-red/60 px-2 py-1.5 text-3xs text-terminal-red hover:bg-terminal-red/10 disabled:opacity-40">{flattening ? 'Reconciling flatten…' : 'Flatten market'}</button>
			{#if reverseConfirm}
				<button data-action-id="ui.src.lib.components.positionmarketactions.button.confirm-reverse" disabled={reversing || !privateStateLive} onclick={() => void reverseSelectedMarket()} class="rounded bg-terminal-yellow/20 px-2 py-1.5 text-3xs text-terminal-yellow disabled:opacity-40">{reversing ? 'Reconciling…' : 'Confirm reverse'}</button>
			{:else}
				<button data-action-id="ui.src.lib.components.positionmarketactions.button.reverse" aria-label="Reverse selected market position" disabled={reversing || !privateStateLive || !selectedPosition} onclick={() => (reverseConfirm = true)} class="rounded border border-terminal-yellow/60 px-2 py-1.5 text-3xs text-terminal-yellow hover:bg-terminal-yellow/10 disabled:opacity-40">Reverse market</button>
			{/if}
		</div>
		{#if reverseConfirm}
			<div class="rounded border border-terminal-yellow/40 bg-terminal-yellow/5 p-1.5 text-3xs text-terminal-text">
				Reverse closes the current position first, then opens the opposite side only after a flat account snapshot.
				<button data-action-id="ui.src.lib.components.positionmarketactions.button.cancel-reverse" class="ml-1 text-terminal-text-muted underline" onclick={() => (reverseConfirm = false)}>Cancel</button>
			</div>
		{/if}
		{#if actionError}<div role="alert" class="text-3xs text-terminal-red">{actionError}</div>{/if}
	</section>
{/if}
