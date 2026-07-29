<script lang="ts">
	import { accountSyncStatus, clickPlacementMode, executionStatus, isConnected, marketDataStatus, marketRegistry, openOrders, orderBook, orderPrice, orderSize, positions, postOnly, selectedMarket, setOrderSizePercent } from '$lib/stores';
	import { formatPrice, formatSize } from '$lib/format';
	import { unavailableFeedMessage, healthLabel } from '$lib/productionTruth';
	import { bookDepth, bookSigFigs, setBookDepth, setBookSigFigs } from '$lib/bookGrouping';
	import { resubscribeOrderBook } from '$lib/hl/subscriptions';
	import { cancelOrder, modifyOrderPrice, placeOrder, fetchOpenOrders, fetchPositions } from '$lib/hl/orders';
	import { wouldCrossSpread } from '$lib/chart/tradingMath';
	import { buildPositionCloseIntent } from '$lib/execution/positionClose';
	import { buildPositionReversePlan, reverseCloseReconciliation } from '$lib/execution/positionReverse';
	import { get } from 'svelte/store';
	import { topOfBookImbalance } from '$lib/bookAnalytics';

	$: baseAsset = $selectedMarket?.baseToken ?? 'Asset';
	$: quoteAsset = $selectedMarket?.quoteToken ?? 'USD';
	$: hasBook = $orderBook.bids.length > 0 || $orderBook.asks.length > 0;
	$: bookImbalance = topOfBookImbalance($orderBook);
	$: visibleAsks = $orderBook.asks.slice(0, $bookDepth).reverse();
	$: visibleBids = $orderBook.bids.slice(0, $bookDepth);
	$: maxTotal = Math.max(visibleBids.at(-1)?.total ?? 0, visibleAsks[0]?.total ?? 0);
	$: privateStateLive = $isConnected && $executionStatus === 'live' && $accountSyncStatus === 'live' && $marketDataStatus === 'live';
	$: canCancelKnownOrders = $isConnected && $executionStatus === 'live';
	let placementError = '';
	let placingPrice: number | null = null;
	let cancellingOrderId = '';
	let draggingOrderId = '';
	let ignoreNextPlacement = false;
	let flattening = false;
	let reverseConfirm = false;
	let reversing = false;
	let followLastPrice = true;
	let suppressLadderScroll = false;
	let recenterFrame: number | null = null;
	let ladderCenter: HTMLDivElement | undefined;

	function getDepthPercent(total: number): number {
		return maxTotal > 0 ? Math.min(100, (total / maxTotal) * 100) : 0;
	}

	function changeGrouping(value: number) {
		setBookSigFigs(value);
		if ($selectedMarket) void resubscribeOrderBook($selectedMarket.apiCoin);
	}

	function changeDepth(value: number) {
		setBookDepth(value);
	}

	function scheduleLadderRecenter(): void {
		if (!followLastPrice || draggingOrderId || !ladderCenter || recenterFrame !== null || typeof requestAnimationFrame === 'undefined') return;
		recenterFrame = requestAnimationFrame(() => {
			recenterFrame = null;
			if (!followLastPrice || draggingOrderId || !ladderCenter) return;
			suppressLadderScroll = true;
			ladderCenter.scrollIntoView({ block: 'center' });
			requestAnimationFrame(() => { suppressLadderScroll = false; });
		});
	}

	function recenterLadder(): void {
		followLastPrice = true;
		scheduleLadderRecenter();
	}

	function onLadderScroll(): void {
		if (!suppressLadderScroll) followLastPrice = false;
	}

	function orderMatchesSelectedMarket(apiCoin?: string, marketKey?: string): boolean {
		return !!$selectedMarket && (apiCoin === $selectedMarket.apiCoin || marketKey === $selectedMarket.marketKey);
	}

	function ordersAtPrice(price: number) {
		const decimals = $selectedMarket?.priceDecimals ?? 2;
		const normalizedPrice = price.toFixed(decimals);
		return canCancelKnownOrders
			? $openOrders.filter((order) => orderMatchesSelectedMarket(order.apiCoin, order.marketKey) && (order.triggerPrice ?? order.price)?.toFixed(decimals) === normalizedPrice)
			: [];
	}

	function positionsAtPrice(price: number) {
		const decimals = $selectedMarket?.priceDecimals ?? 2;
		const normalizedPrice = price.toFixed(decimals);
		return privateStateLive
			? $positions.filter((position) => orderMatchesSelectedMarket(position.apiCoin, position.marketKey) && position.entryPrice.toFixed(decimals) === normalizedPrice)
			: [];
	}

	async function clickLadderPrice(side: 'buy' | 'sell', price: number, stop = false): Promise<void> {
		placementError = '';
		if (!$clickPlacementMode) {
			orderPrice.set(price);
			return;
		}
		if (!privateStateLive || !$selectedMarket) {
			placementError = 'DOM placement is armed but the account or selected market is not live';
			return;
		}
		if ($orderSize <= 0) {
			placementError = 'Set a positive order size before DOM placement';
			return;
		}
		if (stop && $postOnly) {
			placementError = 'Post-only cannot be used with a DOM stop order';
			return;
		}
		if ($postOnly && wouldCrossSpread(side, price, $orderBook.bids[0]?.price, $orderBook.asks[0]?.price)) {
			placementError = 'Post-only DOM order would cross the spread';
			return;
		}
		placingPrice = price;
		try {
			const result = await placeOrder({ marketKey: $selectedMarket.marketKey, side, type: stop ? 'stop' : 'limit', price, triggerPrice: stop ? price : undefined, size: $orderSize, reduceOnly: false, postOnly: stop ? false : $postOnly });
			if (!result.ok) placementError = result.error ?? 'DOM order was rejected';
			else await fetchOpenOrders();
		} finally {
			placingPrice = null;
		}
	}

	async function cancelLadderOrder(orderId: string, marketIdentity?: string): Promise<boolean> {
		placementError = '';
		if (!canCancelKnownOrders) {
			placementError = 'Enable secure trading before cancelling a known DOM order';
			return false;
		}
		if (!marketIdentity) {
			placementError = 'Order has no authoritative Hyperliquid identity; cancellation was not sent';
			return false;
		}
		cancellingOrderId = orderId;
		openOrders.update((orders) => orders.map((order) => order.id === orderId ? { ...order, pending: true, error: undefined } : order));
		try {
			const result = await cancelOrder(orderId, marketIdentity);
			if (!result.ok) {
				placementError = result.error ?? 'DOM cancel was rejected';
				openOrders.update((orders) => orders.map((order) => order.id === orderId ? { ...order, pending: false, error: result.error } : order));
				return false;
			}
			if (!await fetchOpenOrders()) {
				placementError = 'Cancel was accepted but authoritative order reconciliation is unavailable';
				return false;
			}
			return true;
		} finally {
			cancellingOrderId = '';
		}
	}

	async function cancelLadderSide(side: 'buy' | 'sell'): Promise<void> {
		placementError = '';
		if (!canCancelKnownOrders) {
			placementError = 'Enable secure trading before cancelling known DOM orders';
			return;
		}
		const orders = $openOrders.filter((order) => order.side === side && orderMatchesSelectedMarket(order.apiCoin, order.marketKey));
		if (orders.length === 0) {
			placementError = `No ${side} DOM orders are open for this market`;
			return;
		}
		let cancelled = 0;
		for (const order of orders) {
			if (await cancelLadderOrder(order.id, order.apiCoin ?? order.marketKey)) cancelled += 1;
			else break;
		}
		if (cancelled !== orders.length) {
			placementError = `Cancelled ${cancelled} of ${orders.length} ${side} orders; reconcile the remaining orders before trying again`;
		}
	}

	function startLadderOrderDrag(event: MouseEvent, orderId: string): void {
		event.preventDefault();
		draggingOrderId = orderId;
	}

	async function modifyLadderOrder(orderId: string, newPrice: number): Promise<void> {
		placementError = '';
		if (!privateStateLive) {
			placementError = 'Account state is stale; DOM order changes are paused until reconciliation completes';
			return;
		}
		const order = $openOrders.find((candidate) => candidate.id === orderId);
		const marketIdentity = order?.apiCoin ?? order?.marketKey;
		if (!order || !marketIdentity) {
			placementError = 'Order has no authoritative Hyperliquid identity; modification was not sent';
			return;
		}
		const decimals = $selectedMarket?.priceDecimals ?? 2;
		if ((order.triggerPrice ?? order.price)?.toFixed(decimals) === newPrice.toFixed(decimals)) return;
		openOrders.update((orders) => orders.map((candidate) => candidate.id === orderId ? { ...candidate, pending: true, error: undefined } : candidate));
		const result = await modifyOrderPrice(orderId, marketIdentity, newPrice);
		if (!result.ok) {
			placementError = result.error ?? 'DOM modify was rejected';
			openOrders.update((orders) => orders.map((candidate) => candidate.id === orderId ? { ...candidate, pending: false, error: result.error } : candidate));
			return;
		}
		await fetchOpenOrders();
	}

	function finishLadderOrderDrag(price: number): void {
		if (!draggingOrderId) return;
		const orderId = draggingOrderId;
		draggingOrderId = '';
		ignoreNextPlacement = true;
		void modifyLadderOrder(orderId, price);
	}

	function handleLadderRowClick(side: 'buy' | 'sell', price: number, event: MouseEvent): void {
		if (ignoreNextPlacement) {
			ignoreNextPlacement = false;
			return;
		}
		void clickLadderPrice(side, price, event.shiftKey);
	}

	$: if (hasBook && $selectedMarket?.lastPrice !== undefined && !draggingOrderId) scheduleLadderRecenter();

	async function flattenDomMarket(): Promise<void> {
		placementError = '';
		if (!privateStateLive) {
			placementError = 'Account state is stale; DOM flatten is paused until reconciliation completes';
			return;
		}
		const position = $positions.find((candidate) => orderMatchesSelectedMarket(candidate.apiCoin, candidate.marketKey));
		const close = buildPositionCloseIntent(position, $marketRegistry, $selectedMarket, $orderBook, 'market');
		if (!close.intent) {
			placementError = close.error ?? 'DOM flatten is unavailable';
			return;
		}
		flattening = true;
		try {
			const result = await placeOrder(close.intent);
			if (!result.ok) {
				placementError = result.error ?? 'DOM flatten was rejected';
				return;
			}
			if (!await Promise.all([fetchOpenOrders(), fetchPositions()]).then(([ordersRefreshed, positionsRefreshed]) => ordersRefreshed && positionsRefreshed)) {
				placementError = 'Flatten was accepted but authoritative reconciliation is unavailable';
			}
		} finally {
			flattening = false;
		}
	}

	async function reverseDomMarket(): Promise<void> {
		placementError = '';
		if (!privateStateLive) {
			placementError = 'Account state is stale; DOM reverse is paused until reconciliation completes';
			return;
		}
		const position = $positions.find((candidate) => orderMatchesSelectedMarket(candidate.apiCoin, candidate.marketKey));
		const planned = buildPositionReversePlan(position, $marketRegistry, $selectedMarket, $orderBook);
		if (!planned.plan) {
			placementError = planned.error ?? 'DOM reverse is unavailable';
			return;
		}
		reversing = true;
		try {
			const close = await placeOrder(planned.plan.close);
			if (!close.ok) {
				placementError = `Reverse close leg was rejected: ${close.error ?? 'unknown error'}`;
				return;
			}
			if (!await fetchPositions()) {
				placementError = 'Reverse paused: authoritative position reconciliation is unavailable after the close leg';
				return;
			}
			const closeState = reverseCloseReconciliation(get(positions), planned.plan);
			if (closeState === 'ambiguous') {
				placementError = 'Reverse paused: account identity is incomplete after the close leg; reconcile before retrying';
				return;
			}
			if (closeState !== 'flat') {
				placementError = 'Reverse paused: close leg is not yet flat in the authoritative account snapshot';
				return;
			}
			const open = await placeOrder(planned.plan.open);
			if (!open.ok) {
				placementError = `Reverse left the position flat: opposite-side open leg was rejected: ${open.error ?? 'unknown error'}`;
				return;
			}
			if (!await Promise.all([fetchOpenOrders(), fetchPositions()]).then(([ordersRefreshed, positionsRefreshed]) => ordersRefreshed && positionsRefreshed)) {
				placementError = 'Reverse open was accepted but authoritative reconciliation is unavailable';
			}
		} finally {
			reversing = false;
			reverseConfirm = false;
		}
	}

</script>

	<div data-testid="order-book" data-feed-status={$marketDataStatus} data-row-count={$orderBook.bids.length + $orderBook.asks.length} class="h-full flex flex-col bg-terminal-bg-panel" class:dither-stale={hasBook && ($marketDataStatus === 'stale' || $marketDataStatus === 'degraded' || $marketDataStatus === 'error')}>
	<div class="h-8 px-2 border-b border-terminal-border flex items-center justify-between text-2xs">
		<span class="text-terminal-text-secondary">Order book</span>
		{#if $clickPlacementMode}<span class="text-3xs text-terminal-green">DOM ARMED</span>{/if}
		<button aria-label="Recenter DOM ladder" onclick={recenterLadder} class="ml-1 text-3xs text-terminal-cyan hover:underline">Center</button>
		<span data-testid="dom-follow-status" class="text-3xs {followLastPrice ? 'text-terminal-text-muted' : 'text-terminal-yellow'}">{followLastPrice ? 'AUTO' : 'MANUAL'}</span>
		<span data-testid="book-imbalance" title="Displayed size imbalance across the top 12 validated book levels" class="text-3xs {bookImbalance.label === 'bid' ? 'text-terminal-green' : bookImbalance.label === 'ask' ? 'text-terminal-red' : 'text-terminal-text-muted'}">{bookImbalance.label === 'unavailable' ? 'IMB —' : `IMB ${bookImbalance.imbalance >= 0 ? '+' : ''}${(bookImbalance.imbalance * 100).toFixed(0)}% ${bookImbalance.label === 'balanced' ? 'BAL' : bookImbalance.label.toUpperCase()}`}</span>
		<button aria-label="Cancel buy DOM orders" disabled={!canCancelKnownOrders || cancellingOrderId !== ''} onclick={() => void cancelLadderSide('buy')} class="ml-1 text-3xs text-terminal-green hover:underline disabled:opacity-40">Cancel buys</button>
		<button aria-label="Cancel sell DOM orders" disabled={!canCancelKnownOrders || cancellingOrderId !== ''} onclick={() => void cancelLadderSide('sell')} class="ml-1 text-3xs text-terminal-red hover:underline disabled:opacity-40">Cancel sells</button>
		<span class="dither-rule mx-2 text-terminal-text-muted" aria-hidden="true"></span>
		<select aria-label="Order book precision grouping" bind:value={$bookSigFigs} onchange={(event) => changeGrouping(Number(event.currentTarget.value))} class="ml-auto bg-terminal-bg-secondary text-3xs text-terminal-text-secondary outline-none">
			<option value={2}>2 sig</option><option value={3}>3 sig</option><option value={4}>4 sig</option><option value={5}>5 sig</option>
		</select>
		<select aria-label="Order book displayed depth" bind:value={$bookDepth} onchange={(event) => changeDepth(Number(event.currentTarget.value))} class="bg-terminal-bg-secondary text-3xs text-terminal-text-secondary outline-none">
			<option value={12}>12 lvl</option><option value={24}>24 lvl</option><option value={50}>50 lvl</option>
		</select>
		<span class="text-3xs {$marketDataStatus === 'live' ? 'text-terminal-text-muted' : 'text-terminal-yellow'}">{baseAsset}/{quoteAsset}{#if $marketDataStatus !== 'live'} · {healthLabel($marketDataStatus)}{/if}</span>
	</div>

	<div class="grid grid-cols-3 px-2 py-1 text-3xs text-terminal-text-muted border-b border-terminal-border">
		<div>Price ({quoteAsset})</div>
		<div class="text-right">Size ({baseAsset})</div>
		<div class="text-right">Total</div>
	</div>

	{#if hasBook}
		<div data-testid="order-book-live" class="contents">
		<div data-testid="dom-ladder-viewport" class="flex-1 min-h-0 overflow-y-auto scrollbar-none" onscroll={onLadderScroll}>
			<div class="flex-1 min-h-0 overflow-hidden flex flex-col justify-end">
				{#each visibleAsks as ask (ask.price)}
					<div class="relative">
					<button aria-label={`Sell at ${ask.price}`} disabled={placingPrice !== null} class="w-full relative grid grid-cols-3 px-2 py-0.5 text-2xs tabular-nums text-left hover:bg-terminal-red-bg/70 disabled:opacity-50" onmouseup={() => finishLadderOrderDrag(ask.price)} onclick={(event) => handleLadderRowClick('sell', ask.price, event)}>
						<span class="absolute right-0 inset-y-0 bg-terminal-red/30 dither-fade-l pointer-events-none" style="width:{getDepthPercent(ask.total)}%"></span>
						<span class="relative text-terminal-red">{formatPrice(ask.price)}</span>
						<span class="relative text-right text-terminal-text-secondary">{formatSize(ask.size)}</span>
						<span class="relative text-right text-terminal-text-muted">{formatSize(ask.total)}</span>
					</button>
					{#each ordersAtPrice(ask.price) as order (order.id)}
						<button aria-label={`Cancel ${order.side} order at ${ask.price}`} disabled={cancellingOrderId === order.id} class="absolute left-1 top-0.5 z-10 max-w-[70%] truncate rounded bg-terminal-red px-1 text-3xs text-white disabled:opacity-50" onmousedown={(event) => startLadderOrderDrag(event, order.id)} onclick={() => { draggingOrderId = ''; void cancelLadderOrder(order.id, order.apiCoin ?? order.marketKey); }}>{order.pending ? 'PENDING' : `× ${formatSize(order.remaining)}`}</button>
					{/each}
					{#each positionsAtPrice(ask.price) as position (position.id)}
						<span data-testid={`dom-position-${position.id}`} class="absolute right-1 top-0.5 z-10 rounded bg-terminal-bg/90 px-1 text-3xs {position.side === 'long' ? 'text-terminal-green' : 'text-terminal-red'}">{position.side.toUpperCase()} {formatSize(position.size)}</span>
					{/each}
					</div>
				{/each}
			</div>

			<div bind:this={ladderCenter} class="h-7 px-2 border-y border-terminal-border flex items-center justify-between text-2xs tabular-nums flex-shrink-0">
				<span class="{$selectedMarket && $selectedMarket.changePercent24h >= 0 ? 'text-terminal-green' : 'text-terminal-red'}">
					{$selectedMarket ? formatPrice($selectedMarket.lastPrice) : '—'}
				</span>
				<span class="text-terminal-text-muted">Spread {$orderBook.spread > 0 ? formatPrice($orderBook.spread) : '—'}</span>
			</div>

			<div class="flex-1 min-h-0 overflow-hidden">
				{#each visibleBids as bid (bid.price)}
					<div class="relative">
					<button aria-label={`Buy at ${bid.price}`} disabled={placingPrice !== null} class="w-full relative grid grid-cols-3 px-2 py-0.5 text-2xs tabular-nums text-left hover:bg-terminal-green-bg/70 disabled:opacity-50" onmouseup={() => finishLadderOrderDrag(bid.price)} onclick={(event) => handleLadderRowClick('buy', bid.price, event)}>
						<span class="absolute right-0 inset-y-0 bg-terminal-green/30 dither-fade-l pointer-events-none" style="width:{getDepthPercent(bid.total)}%"></span>
						<span class="relative text-terminal-green">{formatPrice(bid.price)}</span>
						<span class="relative text-right text-terminal-text-secondary">{formatSize(bid.size)}</span>
						<span class="relative text-right text-terminal-text-muted">{formatSize(bid.total)}</span>
					</button>
					{#each ordersAtPrice(bid.price) as order (order.id)}
						<button aria-label={`Cancel ${order.side} order at ${bid.price}`} disabled={cancellingOrderId === order.id} class="absolute left-1 top-0.5 z-10 max-w-[70%] truncate rounded bg-terminal-green px-1 text-3xs text-terminal-bg disabled:opacity-50" onmousedown={(event) => startLadderOrderDrag(event, order.id)} onclick={() => { draggingOrderId = ''; void cancelLadderOrder(order.id, order.apiCoin ?? order.marketKey); }}>{order.pending ? 'PENDING' : `× ${formatSize(order.remaining)}`}</button>
					{/each}
					{#each positionsAtPrice(bid.price) as position (position.id)}
						<span data-testid={`dom-position-${position.id}`} class="absolute right-1 top-0.5 z-10 rounded bg-terminal-bg/90 px-1 text-3xs {position.side === 'long' ? 'text-terminal-green' : 'text-terminal-red'}">{position.side.toUpperCase()} {formatSize(position.size)}</span>
					{/each}
					</div>
				{/each}
			</div>
		</div>
		{#if placementError}<div role="alert" class="px-2 py-1 text-3xs text-terminal-red">{placementError}</div>{/if}
		<div data-testid="dom-quick-size" class="border-t border-terminal-border px-2 py-1.5">
			<div class="flex items-center gap-1">
				<label for="dom-quick-size-input" class="text-3xs text-terminal-text-muted">Size</label>
				<input id="dom-quick-size-input" aria-label="DOM quick order size" type="number" min="0" step="any" bind:value={$orderSize} class="min-w-0 flex-1 terminal-input px-1.5 py-0.5 text-right font-mono text-2xs" />
				{#each [25, 50, 75, 100] as percent}
					<button aria-label={`Set DOM size to ${percent} percent`} onclick={() => setOrderSizePercent(percent)} class="rounded bg-terminal-bg-secondary px-1 py-0.5 text-3xs text-terminal-text-secondary hover:bg-terminal-bg-hover">{percent === 100 ? 'MAX' : `${percent}%`}</button>
				{/each}
			</div>
			<button aria-label="Flatten selected market position" disabled={flattening || !privateStateLive} onclick={() => void flattenDomMarket()} class="mt-1 w-full rounded border border-terminal-red/60 px-1 py-0.5 text-3xs text-terminal-red hover:bg-terminal-red-bg disabled:opacity-40">{flattening ? 'Reconciling flatten…' : 'Flatten market'}</button>
			{#if reverseConfirm}
				<div class="mt-1 rounded border border-terminal-yellow/50 bg-terminal-yellow/5 p-1 text-3xs text-terminal-text">
					<p>Reverse closes first. It opens the other side only after a flat account snapshot.</p>
					<div class="mt-1 flex justify-end gap-1"><button onclick={() => (reverseConfirm = false)} class="rounded border border-terminal-border px-1 py-0.5">Cancel</button><button disabled={reversing} onclick={() => void reverseDomMarket()} class="rounded bg-terminal-yellow/20 px-1 py-0.5 text-terminal-yellow disabled:opacity-40">{reversing ? 'Reconciling…' : 'Confirm reverse'}</button></div>
				</div>
			{:else}
				<button aria-label="Reverse selected market position" disabled={reversing || !privateStateLive} onclick={() => (reverseConfirm = true)} class="mt-1 w-full rounded border border-terminal-yellow/60 px-1 py-0.5 text-3xs text-terminal-yellow hover:bg-terminal-yellow/10 disabled:opacity-40">Reverse market</button>
			{/if}
		</div>
		</div>
	{:else}
		<div class="flex-1 flex items-center justify-center px-4 text-center text-2xs {$marketDataStatus === 'error' ? 'text-terminal-red' : 'text-terminal-text-muted'}">
			{unavailableFeedMessage('order book', $marketDataStatus)}
		</div>
	{/if}
</div>
