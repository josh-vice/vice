<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import {
		selectedMarket,
		chartCandles,
		liveCandle,
		chartHistoryStatus,
		chartTimeframe,
		openOrders,
		positions,
		designerMode,
		clickPlacementMode,
		clickPlacementSide,
		chartDraft,
		chartActiveField,
		orderSide,
		orderSize,
		orderType,
		postOnly,
		isConnected,
		accountSyncStatus,
		marketDataStatus,
		executionStatus,
		orderBook,
		setChartTimeframe
	} from '$lib/stores';
	import { privacyMode } from '$lib/privacyMode';
	import { syncOrderPriceLines, setPreviewLine, priceFromClick } from '$lib/chart/overlays';
	import { handleChartClick, warnCrossSpread } from '$lib/chart/clickTrading';
	import { cancelOrder, modifyOrderPrice, placeOrder, fetchOpenOrders } from '$lib/hl/orders';
	import { chartPreviewPrice } from '$lib/stores';
	import type { IChartApi, ISeriesApi, IPriceLine, MouseEventParams, Time, AutoscaleInfo } from 'lightweight-charts';
	import type { PriceLineEntry } from '$lib/chart/overlays';
import type { Order } from '$lib/types';
	import { resolveClickPlacementSide, wouldCrossSpread } from '$lib/chart/tradingMath';
	import { priceFormatForMarket } from '$lib/chart/priceFormat';
import { chartPriceMinMove, normalizeChartPrice, formatChartPrice } from '$lib/chart/priceNormalization';
import { chartDraftPrice, designerDraftPresentation } from '$lib/chart/designerDraft';
import { liveOrderPrice, liveOrderStatusLabel } from '$lib/chart/liveOrder';
	import { markUiFrameReady } from '$lib/native/performance';
	import { unavailableFeedMessage } from '$lib/productionTruth';
	import { formatSize } from '$lib/format';
	import { marketCapabilities } from '$lib/marketCapabilities';
	import { chartDatasetKey, chartIdentity, marketMatches } from '$lib/chart/chartModel';
	import { chartWheelZoomScale, zoomLogicalRange } from '$lib/chart/zoom';

	/** Research surfaces can reuse the live chart without exposing private overlays or chart trading. */
	export let readOnly = false;
	$: marketProfile = marketCapabilities($selectedMarket);
	$: chartActionsEnabled = !readOnly && marketProfile.executable && (marketProfile.supportsPositionLifecycle || marketProfile.allowedOrderTypes.length > 0);

	/** Bars visible by default when a chart first paints, before any user zoom. */
	const DEFAULT_VISIBLE_BARS = 140;
	/** Empty bars of breathing room kept to the right of the live candle. */
	const DEFAULT_RIGHT_OFFSET = 8;
	const DEFAULT_BAR_SPACING = 8;

	let chartContainer: HTMLDivElement;
	let chart: IChartApi | null = null;
	let candlestickSeries: ISeriesApi<'Candlestick'> | null = null;
	let volumeSeries: ISeriesApi<'Histogram'> | null = null;
	let disposed = false;
	let handleResize: (() => void) | null = null;
	let resizeObserver: ResizeObserver | null = null;
	let orderLines = new Map<string, PriceLineEntry>();
	let previewLine: IPriceLine | null = null;
	let crossSpreadWarning = '';
	let draggingOrderId: string | null = null;
	let draggingPrice = 0;
	let draggingDesigner = false;
	let pendingOrderPrices = new Map<string, number>();
	let overlayCoordinates = new Map<string, number>();
	let draftCoordinate: number | null = null;
	let supplementalLines = new Map<string, IPriceLine>();
	let coordinateFrame: number | null = null;
	let interactionError = '';
	let appliedFirstTime: number | null = null;
	let appliedLastTime: number | null = null;
	let appliedLength = 0;
	let appliedDatasetKey = '';
	let appliedPrecisionKey = '';
	let legend: { time: Time; open: number; high: number; low: number; close: number; volume: number } | null = null;
	let hoveringChart = false;
	$: privateStateLive = chartActionsEnabled && $isConnected && $accountSyncStatus === 'live' && !$privacyMode;
	let interactionMarketKey = '';
	$: {
		const identity = chartIdentity($selectedMarket);
		if (interactionMarketKey && identity !== interactionMarketKey) {
			designerMode.set(false);
			clickPlacementMode.set(false);
			clickPlacementSide.set('auto');
			chartPreviewPrice.set(null);
			chartDraft.set({});
			draggingOrderId = null;
			interactionError = '';
		}
		interactionMarketKey = identity;
	}

	function priceAtEvent(e: MouseEvent): number | null {
		if (!candlestickSeries || !chartContainer) return null;
		const rect = chartContainer.getBoundingClientRect();
		const rawPrice = candlestickSeries.coordinateToPrice(e.clientY - rect.top);
		return normalizeChartPrice(rawPrice ?? null, $selectedMarket);
	}

	let designerPrice: number | null = null;
	let designerDraftView: ReturnType<typeof designerDraftPresentation> | null = null;
	let clickPlacementPreviewSide: 'buy' | 'sell' = 'buy';
	let clickPlacementSideText = 'AUTO';
	$: designerPrice = !readOnly && chartActionsEnabled && $designerMode && $chartPreviewPrice !== null
		? chartDraftPrice($chartActiveField, $chartDraft, $chartPreviewPrice)
		: null;
	$: designerDraftView = designerPrice !== null && $selectedMarket
		? designerDraftPresentation({
			field: $chartActiveField,
			orderType: $orderType,
			side: $orderSide,
			size: $orderSize,
			baseAsset: $selectedMarket.baseToken,
			priceText: formatChartPrice(designerPrice, $selectedMarket)
		})
		: null;
	$: clickPlacementPreviewSide = $selectedMarket && $chartPreviewPrice !== null && $selectedMarket.lastPrice > 0
		? resolveClickPlacementSide($clickPlacementSide, $chartPreviewPrice, $selectedMarket.lastPrice)
		: $orderSide;
	$: clickPlacementSideText = $clickPlacementSide.toUpperCase();

	function toggleDesignerMode() {
		const next = !$designerMode;
		designerMode.set(next);
		draggingDesigner = false;
		if (next) {
			clickPlacementMode.set(false);
			crossSpreadWarning = '';
			interactionError = '';
		}
		chartPreviewPrice.set(null);
	}

	function toggleClickPlacementMode() {
		const next = !$clickPlacementMode;
		clickPlacementMode.set(next);
		if (next) {
			designerMode.set(false);
			draggingDesigner = false;
			crossSpreadWarning = '';
			interactionError = '';
		}
		chartPreviewPrice.set(null);
	}

	function updateDesignerPrice(price: number) {
		const normalized = normalizeChartPrice(price, $selectedMarket);
		if (normalized === null) return;
		handleChartClick(normalized);
	}

	function startDesignerDrag(event: PointerEvent) {
		if (readOnly || !chartActionsEnabled || !$designerMode || designerPrice === null) return;
		event.preventDefault();
		event.stopPropagation();
		draggingDesigner = true;
		(event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
	}

	function onDesignerPointerMove(event: PointerEvent) {
		if (!draggingDesigner) return;
		const price = priceAtEvent(event);
		if (price !== null) updateDesignerPrice(price);
	}

	function onDesignerPointerUp() {
		if (!draggingDesigner) return;
		draggingDesigner = false;
		scheduleOverlayCoordinates();
	}

	function nudgeDesignerPrice(direction: -1 | 1) {
		if (designerPrice === null) return;
		const step = chartPriceMinMove($selectedMarket, designerPrice);
		const next = normalizeChartPrice(designerPrice + direction * step, $selectedMarket);
		if (next !== null) updateDesignerPrice(next);
	}

	function onDesignerKeydown(event: KeyboardEvent) {
		if (event.key === 'ArrowUp' || event.key === 'ArrowRight') {
			event.preventDefault();
			nudgeDesignerPrice(1);
		} else if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') {
			event.preventDefault();
			nudgeDesignerPrice(-1);
		} else if (event.key === 'Escape') {
			event.preventDefault();
			draggingDesigner = false;
			chartPreviewPrice.set(null);
		}
	}

	function startOrderDrag(event: MouseEvent, orderId: string, price: number) {
		if (readOnly) return;
		if (!chartActionsEnabled || !privateStateLive || price <= 0) return;
		event.preventDefault();
		event.stopPropagation();
		draggingOrderId = orderId;
		draggingPrice = price;
	}

	function liveOrderSpreadWarning(order: Order, price: number): string | null {
		if (!wouldCrossSpread(order.side, price, $orderBook.bids[0]?.price, $orderBook.asks[0]?.price)) return null;
		return order.postOnly
			? 'Post-only order cannot be moved across the spread'
			: `${order.side === 'buy' ? 'Buy' : 'Sell'} moved across the spread — modification may execute immediately`;
	}

	async function commitOrderPrice(order: Order, newPrice: number) {
		if (!candlestickSeries || !$selectedMarket) return;
		if (!privateStateLive) {
			interactionError = 'Account state is stale; chart order changes are paused until reconciliation completes';
			return;
		}
		const previousPrice = liveOrderPrice(order);
		if (previousPrice === null) {
			interactionError = 'Order has no authoritative price; modification was not sent';
			return;
		}
		const tick = chartPriceMinMove($selectedMarket, previousPrice);
		if (Math.abs(newPrice - previousPrice) < tick / 2) {
			scheduleOverlayCoordinates();
			return;
		}

		const spreadWarning = liveOrderSpreadWarning(order, newPrice);
		crossSpreadWarning = spreadWarning ?? '';
		if (order.postOnly && spreadWarning) {
			interactionError = spreadWarning;
			openOrders.update((orders) =>
				orders.map((candidate) => candidate.id === order.id ? { ...candidate, pending: false, error: spreadWarning } : candidate)
			);
			scheduleOverlayCoordinates();
			return;
		}

		pendingOrderPrices.set(order.id, newPrice);
		openOrders.update((orders) =>
			orders.map((candidate) => candidate.id === order.id ? { ...candidate, pending: true, error: undefined } : candidate)
		);
		scheduleOverlayCoordinates();

		const marketIdentity = order.apiCoin ?? order.marketKey;
		if (!marketIdentity) {
			const error = 'Order has no authoritative Hyperliquid identity; modification was not sent';
			pendingOrderPrices.delete(order.id);
			interactionError = error;
			openOrders.update((orders) =>
				orders.map((candidate) => candidate.id === order.id ? { ...candidate, pending: false, error } : candidate)
			);
			scheduleOverlayCoordinates();
			return;
		}

		const result = await modifyOrderPrice(order.id, marketIdentity, newPrice);
		pendingOrderPrices.delete(order.id);
		if (!result.ok) {
			interactionError = result.error ?? 'Modify rejected';
		} else {
			const refreshed = await fetchOpenOrders();
			if (!refreshed) interactionError = 'Modify accepted but account reconciliation is unresolved';
		}
		openOrders.update((orders) =>
			orders.map((candidate) =>
				candidate.id === order.id
					? { ...candidate, pending: false, error: result.ok ? undefined : result.error }
					: candidate
			)
		);
		// The authoritative order snapshot owns the final coordinate. A rejected
		// or unresolved modify therefore returns to the last known resting price.
		scheduleOverlayCoordinates();
	}

	function onLiveOrderKeydown(event: KeyboardEvent, order: Order) {
		if (event.key !== 'ArrowUp' && event.key !== 'ArrowRight' && event.key !== 'ArrowDown' && event.key !== 'ArrowLeft') return;
		event.preventDefault();
		event.stopPropagation();
		if (order.pending) return;
		const currentPrice = liveOrderPrice(order);
		if (currentPrice === null) return;
		const direction = event.key === 'ArrowUp' || event.key === 'ArrowRight' ? 1 : -1;
		const step = chartPriceMinMove($selectedMarket, currentPrice);
		const nextPrice = normalizeChartPrice(currentPrice + direction * step, $selectedMarket);
		if (nextPrice !== null) void commitOrderPrice(order, nextPrice);
	}

	function onChartMouseMove(e: MouseEvent) {
		if (readOnly) return;
		if (!chartActionsEnabled) return;
		if ($clickPlacementMode && !draggingOrderId) {
			const hoverPrice = priceAtEvent(e);
			if (hoverPrice != null) chartPreviewPrice.set(hoverPrice);
		}
		if (!draggingOrderId) return;
		const price = priceAtEvent(e);
		if (price != null) {
			draggingPrice = price;
			scheduleOverlayCoordinates();
		}
	}

	async function onChartMouseUp(e: MouseEvent) {
		if (readOnly) return;
		if (!chartActionsEnabled) return;
		if (!draggingOrderId || !candlestickSeries || !chartContainer || !$selectedMarket) {
			draggingOrderId = null;
			return;
		}
		const orderId = draggingOrderId;
		const newPrice = priceAtEvent(e) ?? draggingPrice;
		const order = $openOrders.find((candidate) => candidate.id === orderId);
		draggingOrderId = null;
		if (!order) {
			interactionError = 'Order disappeared before chart modification completed';
			scheduleOverlayCoordinates();
			return;
		}
		if (newPrice != null) await commitOrderPrice(order, newPrice);
		requestAnimationFrame(markUiFrameReady);
	}

	async function cancelChartOrder(event: MouseEvent, orderId: string, market: string) {
		if (readOnly) return;
		if (!chartActionsEnabled) return;
		event.preventDefault();
		event.stopPropagation();
		const current = $openOrders.find((order) => order.id === orderId);
		if (!current || current.pending) return;
		if (!privateStateLive) {
			interactionError = 'Account state is stale; cancellation is paused until reconciliation completes';
			return;
		}
		openOrders.update((orders) =>
			orders.map((order) => (order.id === orderId ? { ...order, pending: true, error: undefined } : order))
		);
		const result = await cancelOrder(orderId, market);
		if (result.ok) {
			const refreshed = await fetchOpenOrders();
			if (!refreshed) {
				const error = 'Cancel accepted but account reconciliation is unresolved';
				interactionError = error;
				openOrders.update((orders) =>
					orders.map((order) => order.id === orderId ? { ...order, pending: false, error } : order)
				);
			} else {
				// A successful refresh owns removal. If the venue still reports the
				// order, clear pending and keep the authoritative row visible.
				openOrders.update((orders) =>
					orders.map((order) => order.id === orderId ? { ...order, pending: false, error: undefined } : order)
				);
			}
		} else {
			interactionError = result.error ?? 'Cancel rejected';
			openOrders.update((orders) =>
				orders.map((order) =>
					order.id === orderId ? { ...order, pending: false, error: result.error } : order
				)
			);
		}
		scheduleOverlayCoordinates();
	}

	async function onChartContextMenu(event: MouseEvent) {
		if (readOnly || !$clickPlacementMode || !$selectedMarket) return;
		if (!chartActionsEnabled) return;
		event.preventDefault();
		if (!$isConnected || $executionStatus !== 'live' || $accountSyncStatus !== 'live' || $marketDataStatus !== 'live') {
			interactionError = $isConnected
				? $accountSyncStatus !== 'live'
					? 'Account state is not reconciled; Click Placement is paused until it is live'
					: $marketDataStatus !== 'live'
						? 'Selected market feed is not live; Click Placement is paused'
						: 'Enable secure trading before using Click Placement'
				: 'Connect an account before using Click Placement';
			return;
		}
		const price = priceAtEvent(event);
		if (price == null || $orderSize <= 0) {
			interactionError = 'Set a positive order size before arming Click Placement';
			return;
		}
		const side = resolveClickPlacementSide(
			$clickPlacementSide,
			price,
			$selectedMarket.lastPrice
		);
		const warning = warnCrossSpread(side, price);
		crossSpreadWarning = warning ?? '';
		if (
			$postOnly &&
			wouldCrossSpread(side, price, $orderBook.bids[0]?.price, $orderBook.asks[0]?.price)
		) {
			interactionError = 'Post-only order would cross the spread';
			return;
		}
		const result = await placeOrder({
			marketKey: $selectedMarket.marketKey,
			side,
			type: 'limit',
			price,
			size: $orderSize,
			postOnly: $postOnly
		});
		if (!result.ok) interactionError = result.error ?? 'Order rejected';
		else {
			const refreshed = await fetchOpenOrders();
			interactionError = refreshed ? '' : 'Order accepted but account reconciliation is unresolved';
		}
	}

	function updateOverlayCoordinates() {
		if (!candlestickSeries) return;
		const next = new Map<string, number>();
		draftCoordinate = null;

		if (!readOnly && chartActionsEnabled && $designerMode && designerPrice !== null) {
			const coordinate = candlestickSeries.priceToCoordinate(designerPrice);
			if (coordinate != null) draftCoordinate = coordinate;
		}

		if (!privateStateLive) {
			overlayCoordinates = next;
			return;
		}
		for (const order of $openOrders.filter((candidate) => marketMatches($selectedMarket, candidate.apiCoin, candidate.marketKey))) {
			const price = draggingOrderId === order.id ? draggingPrice : pendingOrderPrices.get(order.id) ?? liveOrderPrice(order);
			if (!price) continue;
			const coordinate = candlestickSeries.priceToCoordinate(price);
			if (coordinate != null) next.set(`order:${order.id}`, coordinate);
		}
		for (const position of $positions.filter((candidate) => marketMatches($selectedMarket, candidate.apiCoin, candidate.marketKey))) {
			const coordinate = candlestickSeries.priceToCoordinate(position.entryPrice);
			if (coordinate != null) next.set(`position:${position.id}`, coordinate);
			if (position.liquidationPrice) {
				const liquidationCoordinate = candlestickSeries.priceToCoordinate(position.liquidationPrice);
				if (liquidationCoordinate != null) next.set(`liquidation:${position.id}`, liquidationCoordinate);
			}
		}
		overlayCoordinates = next;
	}

	/**
	 * Keep DOM overlays in the same frame as chart coordinate changes. A fixed
	 * timer made drag/zoom labels visibly lag and continued waking the page when
	 * nothing was moving. Multiple feed/UI changes are coalesced into one frame.
	 */
	function scheduleOverlayCoordinates() {
		if (coordinateFrame !== null || typeof requestAnimationFrame === 'undefined') return;
		coordinateFrame = requestAnimationFrame(() => {
			coordinateFrame = null;
			updateOverlayCoordinates();
		});
	}

	function syncSupplementalLines() {
		if (!candlestickSeries) return;
		for (const line of supplementalLines.values()) candlestickSeries.removePriceLine(line);
		const next = new Map<string, IPriceLine>();
		for (const position of (privateStateLive ? $positions : []).filter((candidate) => marketMatches($selectedMarket, candidate.apiCoin, candidate.marketKey))) {
			next.set(
				`position:${position.id}`,
				candlestickSeries.createPriceLine({
					price: position.entryPrice,
					color: position.side === 'long' ? '#2ee6c2' : '#ff3d9a',
					lineWidth: 1,
					lineStyle: 2,
					axisLabelVisible: true,
					title: ''
				})
			);
			if (position.liquidationPrice) {
				next.set(
					`liquidation:${position.id}`,
					candlestickSeries.createPriceLine({
						price: position.liquidationPrice,
						color: '#ff7847',
						lineWidth: 1,
						lineStyle: 2,
						axisLabelVisible: true,
						title: 'LIQ'
					})
				);
			}
		}
		if (!readOnly && $designerMode) {
			for (const [field, price] of Object.entries($chartDraft)) {
				if (!price || (field === $chartActiveField && designerPrice !== null)) continue;
				next.set(
					`draft:${field}`,
					candlestickSeries.createPriceLine({
						price,
						color: field === 'stopLoss' ? '#ff3d9a' : field === 'takeProfit' ? '#2ee6c2' : '#4fd6f7',
						lineWidth: 1,
						lineStyle: 3,
						axisLabelVisible: true,
						title: field
					})
				);
			}
		}
		supplementalLines = next;
	}

	const timeframes = ['1m', '5m', '15m', '1h', '4h', '1D', '1W'];

	/**
	 * lightweight-charts' built-in autoscale can price-fit against the whole
	 * loaded history rather than the currently visible bars once the time
	 * scale's visible range has been set programmatically (rather than by user
	 * pan/zoom). Overriding the provider makes autoscale always price-fit
	 * exactly what's on screen, computed straight from the visible logical
	 * range on every recompute the library performs.
	 */
	function candlestickAutoscaleInfo(): AutoscaleInfo | null {
		if (!chart || !candlestickSeries) return null;
		const range = chart.timeScale().getVisibleLogicalRange();
		if (!range) return null;
		const data = candlestickSeries.data();
		if (data.length === 0) return null;
		const from = Math.max(0, Math.floor(range.from));
		const to = Math.min(data.length - 1, Math.ceil(range.to));
		let min = Infinity;
		let max = -Infinity;
		for (let i = from; i <= to; i++) {
			const bar = data[i];
			if (!bar || !('high' in bar)) continue;
			if (bar.high > max) max = bar.high;
			if (bar.low < min) min = bar.low;
		}
		if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
		return { priceRange: { minValue: min, maxValue: max } };
	}

	/**
	 * Render the single in-progress bar via lightweight-charts' O(1) update
	 * path. This is the only per-tick rendering call: it never touches the
	 * committed history array.
	 */
	function renderLiveCandle(candle: (typeof $chartCandles)[number] | null) {
		if (!candlestickSeries || !volumeSeries || !candle) return;
		candlestickSeries.update({
			time: candle.time as any,
			open: candle.open,
			high: candle.high,
			low: candle.low,
			close: candle.close
		});
		volumeSeries.update({
			time: candle.time as any,
			value: candle.volume || 0,
			color: candle.close >= candle.open ? 'rgba(46, 230, 194, 0.3)' : 'rgba(255, 61, 154, 0.3)'
		});
	}

	/** Committed history plus whatever is currently the in-progress bar. */
	function currentDisplayCandle(): (typeof $chartCandles)[number] | null {
		return $liveCandle ?? ($chartCandles.length ? $chartCandles[$chartCandles.length - 1] : null);
	}

	function applyCandles(candles: typeof $chartCandles, fit = false) {
		const live = $liveCandle;
		if (!candlestickSeries || !volumeSeries || (candles.length === 0 && !live)) return;

		const candleData = candles.map((c) => ({
			time: c.time as any,
			open: c.open,
			high: c.high,
			low: c.low,
			close: c.close
		}));

		const volumeData = candles.map((c) => ({
			time: c.time as any,
			value: c.volume || 0,
			color: c.close >= c.open ? 'rgba(46, 230, 194, 0.3)' : 'rgba(255, 61, 154, 0.3)'
		}));

		candlestickSeries.setData(candleData);
		volumeSeries.setData(volumeData);
		if ($chartHistoryStatus !== 'loading') renderLiveCandle(live);
		appliedFirstTime = candles[0]?.time ?? live?.time ?? null;
		appliedLastTime = candles[candles.length - 1]?.time ?? null;
		appliedLength = candles.length;
		if (fit) showDefaultView(candles.length + (live ? 1 : 0));
	}

	/**
	 * Show the most recent DEFAULT_VISIBLE_BARS at a comfortable bar spacing
	 * with breathing room to the right, instead of fitContent() zooming out
	 * over the entire loaded history.
	 */
	function showDefaultView(candleCount: number) {
		if (!chart) return;
		const from = Math.max(0, candleCount - DEFAULT_VISIBLE_BARS);
		const to = candleCount - 1 + DEFAULT_RIGHT_OFFSET;
		chart.timeScale().setVisibleLogicalRange({ from, to });
	}

	/**
	 * Trackpad pinch gestures arrive as small ctrl+wheel deltas on desktop
	 * browsers. lightweight-charts intentionally caps each delta at a very
	 * small zoom step, so apply a faster range update while preserving the bar
	 * beneath the pointer as the zoom anchor.
	 */
	function handleChartWheel(event: WheelEvent) {
		if (!chart || !chartContainer || event.deltaY === 0) return;
		const timeScale = chart.timeScale();
		const visibleRange = timeScale.getVisibleLogicalRange();
		if (!visibleRange) return;
		const rect = chartContainer.getBoundingClientRect();
		const anchor = timeScale.coordinateToLogical(event.clientX - rect.left);
		if (anchor === null) return;
		const zoomScale = chartWheelZoomScale(event);
		if (zoomScale === 0) return;
		timeScale.setVisibleLogicalRange(zoomLogicalRange(visibleRange, anchor, zoomScale));
		if (event.cancelable) event.preventDefault();
	}

	function selectTf(tf: string) {
		setChartTimeframe(tf);
	}

	/**
	 * Crosshair OHLCV readout. Shows the hovered bar while the pointer is over
	 * the chart; reverts to the live last bar once the pointer leaves so the
	 * legend tracks streaming data again instead of freezing on the old hover.
	 */
	function updateLegend(param: MouseEventParams<Time>) {
		if (!candlestickSeries || !volumeSeries) return;
		hoveringChart = param.point != null && param.time != null;
		if (hoveringChart) {
			const hoveredCandle = param.seriesData.get(candlestickSeries);
			const hoveredVolume = param.seriesData.get(volumeSeries);
			if (hoveredCandle && 'open' in hoveredCandle) {
				legend = {
					time: hoveredCandle.time,
					open: hoveredCandle.open,
					high: hoveredCandle.high,
					low: hoveredCandle.low,
					close: hoveredCandle.close,
					volume: hoveredVolume && 'value' in hoveredVolume ? hoveredVolume.value : 0
				};
				return;
			}
		}
		legend = legendFromCandle(currentDisplayCandle());
	}

	function legendFromCandle(last: (typeof $chartCandles)[number] | null) {
		return last
			? { time: last.time as Time, open: last.open, high: last.high, low: last.low, close: last.close, volume: last.volume || 0 }
			: null;
	}

	onMount(async () => {
		const { createChart, ColorType, CrosshairMode, CandlestickSeries, HistogramSeries } = await import('lightweight-charts');
		if (disposed || !chartContainer) return;
		const terminalFont = getComputedStyle(document.body).fontFamily || 'system-ui, sans-serif';

		chart = createChart(chartContainer, {
			layout: {
				background: { type: ColorType.Solid, color: '#0a0a12' },
				textColor: '#9696ad',
				fontSize: 11,
				fontFamily: terminalFont
			},
			grid: {
				vertLines: { color: '#1a1a2e' },
				horzLines: { color: '#1a1a2e' }
			},
			crosshair: {
				mode: CrosshairMode.Normal,
				vertLine: { color: '#4fd6f7', width: 1, style: 2, labelBackgroundColor: '#4fd6f7' },
				horzLine: { color: '#4fd6f7', width: 1, style: 2, labelBackgroundColor: '#4fd6f7' }
			},
			timeScale: {
				borderColor: '#222238',
				timeVisible: true,
				secondsVisible: false,
				rightOffset: DEFAULT_RIGHT_OFFSET,
				barSpacing: DEFAULT_BAR_SPACING,
				minBarSpacing: 0.5
			},
			rightPriceScale: { borderColor: '#222238', scaleMargins: { top: 0.1, bottom: 0.2 } },
			// Use a custom wheel handler so precision trackpad pinches are not
			// limited to lightweight-charts' barely-visible default step.
			handleScale: { axisPressedMouseMove: true, mouseWheel: false, pinch: true },
			handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: true }
		});

		candlestickSeries = chart.addSeries(CandlestickSeries, {
			upColor: '#2ee6c2',
			downColor: '#ff3d9a',
			borderUpColor: '#2ee6c2',
			borderDownColor: '#ff3d9a',
			wickUpColor: '#2ee6c2',
			wickDownColor: '#ff3d9a',
			priceFormat: priceFormatForMarket($selectedMarket),
			autoscaleInfoProvider: candlestickAutoscaleInfo
		});

		volumeSeries = chart.addSeries(
			HistogramSeries,
			{ color: '#2ee6c2', priceFormat: { type: 'volume' } },
			1
		);
		chart.panes()[1]?.setStretchFactor(120);
		chart.panes()[0]?.setStretchFactor(360);

		// Size the canvas to its final laid-out dimensions before computing any
		// default visible range: createChart() can otherwise capture a stale
		// pre-layout container width, clamping the initial default view.
		handleResize = () => {
			if (disposed || !chart || !chartContainer) return;
			chart.applyOptions({ width: chartContainer.clientWidth, height: chartContainer.clientHeight });
		};
		handleResize();
		chartContainer.addEventListener('wheel', handleChartWheel, { passive: false });

		appliedDatasetKey = chartDatasetKey($selectedMarket, $chartTimeframe);
		if ($chartCandles.length > 0 || $liveCandle) applyCandles($chartCandles, true);

		chart.subscribeClick((param) => {
			if (readOnly || !chart || !candlestickSeries) return;
			if (!chartActionsEnabled) return;
			const price = priceFromClick(chart, candlestickSeries, param, $selectedMarket);
			if (price == null) return;
			handleChartClick(price);
			const warn = warnCrossSpread($orderSide, price);
			crossSpreadWarning = warn ?? '';
		});

		chart.subscribeCrosshairMove((param) => updateLegend(param));

		window.addEventListener('resize', handleResize);
		resizeObserver = new ResizeObserver(handleResize);
		resizeObserver.observe(chartContainer);
		chart.timeScale().subscribeVisibleLogicalRangeChange(scheduleOverlayCoordinates);
		scheduleOverlayCoordinates();
	});

	function clearChartSeries() {
		if (!candlestickSeries || !volumeSeries) return;
		candlestickSeries.setData([]);
		volumeSeries.setData([]);
		appliedFirstTime = null;
		appliedLastTime = null;
		appliedLength = 0;
	}

	// Keep the legend on the live last bar while the pointer is not hovering.
	// $liveCandle/$chartCandles must stay textually referenced here so Svelte's
	// dependency tracking re-runs this block on every tick, not just when
	// hoveringChart toggles.
	$: if ($chartHistoryStatus === 'loading') legend = null;
	$: if ($chartHistoryStatus !== 'loading' && !hoveringChart && ($liveCandle || $chartCandles.length)) legend = legendFromCandle(currentDisplayCandle());

	// Reapply price-axis precision whenever the selected market's decimals change.
	$: if (candlestickSeries && $selectedMarket) {
		const precisionKey = `${$selectedMarket.apiCoin}:${$selectedMarket.priceDecimals}`;
		if (precisionKey !== appliedPrecisionKey) {
			appliedPrecisionKey = precisionKey;
			candlestickSeries.applyOptions({ priceFormat: priceFormatForMarket($selectedMarket) });
		}
	}

	// Clear stale candles immediately when market or timeframe changes.
	$: if (candlestickSeries && volumeSeries) {
		const datasetKey = chartDatasetKey($selectedMarket, $chartTimeframe);
		if (datasetKey !== appliedDatasetKey) {
			appliedDatasetKey = datasetKey;
			clearChartSeries();
		} else if ($chartCandles.length === 0 && appliedLength > 0) {
			clearChartSeries();
		}
	}

	// chartCandles now changes only at reset/bar-close boundaries (never per
	// tick), so this block only needs to decide whether a full setData reset
	// is required; it never re-paints the last bar directly.
	$: if ($chartCandles.length && candlestickSeries && volumeSeries && $chartHistoryStatus !== 'loading') {
		const datasetKey = chartDatasetKey($selectedMarket, $chartTimeframe);
		const first = $chartCandles[0];
		const last = $chartCandles[$chartCandles.length - 1];
		const requiresReset =
			datasetKey !== appliedDatasetKey ||
			first.time !== appliedFirstTime ||
			$chartCandles.length < appliedLength ||
			$chartCandles.length > appliedLength + 1 ||
			(appliedLastTime !== null && last.time < appliedLastTime);

		if (requiresReset) {
			appliedDatasetKey = datasetKey;
			// Re-show the default view whenever the dataset is empty so far, or
			// its starting boundary just moved: a transient bootstrap candle can
			// populate the chart before the authoritative history snapshot
			// arrives, and that later snapshot must not be silently absorbed as
			// a plain append using the earlier (effectively single-bar) view.
			const isNewHistoryBoundary = appliedLength === 0 || first.time !== appliedFirstTime;
			applyCandles($chartCandles, isNewHistoryBoundary);
		} else {
			// An ordinary bar close: its values were already painted via the
			// prior liveCandle updates below, so only bookkeeping advances here.
			appliedLastTime = last.time;
			appliedLength = $chartCandles.length;
		}
	}

	// The in-progress bar renders via O(1) series.update() on every tick; the
	// committed history array above is touched only at reset/bar-close
	// boundaries, keeping per-tick cost independent of history size.
	$: if ($liveCandle && candlestickSeries && volumeSeries && $chartHistoryStatus !== 'loading') {
		renderLiveCandle($liveCandle);
	}

	// Order price lines
	$: if (candlestickSeries && $openOrders) {
		orderLines = syncOrderPriceLines(
			candlestickSeries,
			(privateStateLive ? $openOrders : []).filter((order) => marketMatches($selectedMarket, order.apiCoin, order.marketKey)),
			orderLines,
			pendingOrderPrices
		);
		scheduleOverlayCoordinates();
	}

	$: if (candlestickSeries && (readOnly || $positions || $chartDraft || $designerMode || $chartPreviewPrice || designerPrice !== null || $accountSyncStatus)) {
		syncSupplementalLines();
		scheduleOverlayCoordinates();
	}

	$: if (candlestickSeries) {
		const price = chartActionsEnabled && $clickPlacementMode ? $chartPreviewPrice : null;
		previewLine = setPreviewLine(candlestickSeries, previewLine, price, clickPlacementPreviewSide, $selectedMarket);

	}
	onDestroy(() => {
		disposed = true;
		if (previewLine && candlestickSeries) candlestickSeries.removePriceLine(previewLine);
		if (candlestickSeries) {
			for (const entry of orderLines.values()) candlestickSeries.removePriceLine(entry.line);
		}
		orderLines.clear();
		if (candlestickSeries) {
			for (const line of supplementalLines.values()) candlestickSeries.removePriceLine(line);
		}
		supplementalLines.clear();
		if (coordinateFrame !== null) cancelAnimationFrame(coordinateFrame);
		coordinateFrame = null;
		if (handleResize) window.removeEventListener('resize', handleResize);
		if (chartContainer) chartContainer.removeEventListener('wheel', handleChartWheel);
		resizeObserver?.disconnect();
		resizeObserver = null;
		if (chart) {
			chart.remove();
			chart = null;
		}
		candlestickSeries = null;
		volumeSeries = null;
	});
</script>

<svelte:window
	onmousemove={onChartMouseMove}
	onmouseup={onChartMouseUp}
	onpointermove={onDesignerPointerMove}
	onpointerup={onDesignerPointerUp}
	onpointercancel={onDesignerPointerUp}
	onkeydown={(event) => {
		if (!chartActionsEnabled || event.key !== 'Escape') return;
		if ($clickPlacementMode) clickPlacementMode.set(false);
		if ($designerMode) chartPreviewPrice.set(null);
	}}
/>

<div class="h-full flex flex-col bg-terminal-bg-secondary rounded-lg overflow-hidden">
	<div data-testid="chart-header" class="hidden sm:flex flex-col gap-2 border-b border-terminal-border px-4 py-2">
		<div data-testid="chart-header-market-context" class="min-w-0 flex flex-wrap items-center gap-x-4 gap-y-1">
			<div class="flex shrink-0 items-center gap-2">
				<span class="text-lg font-semibold whitespace-nowrap">{$selectedMarket?.symbol || 'Select market'}</span>
				{#if $selectedMarket}
					<span data-testid="chart-market-kind" class="text-xs px-2 py-0.5 rounded bg-terminal-cyan/15 text-terminal-cyan">{$selectedMarket.kind === 'spot' ? 'Spot' : 'Perpetual'}</span>
				{/if}
			</div>
			{#if $selectedMarket}
				{@const hasChange = $selectedMarket.changePercent24h !== undefined}
				{@const isPositive = ($selectedMarket.changePercent24h ?? 0) >= 0}
				<div class="min-w-0 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
					<span class="whitespace-nowrap tabular-nums text-lg {hasChange && isPositive ? 'text-terminal-green' : hasChange ? 'text-terminal-red' : 'text-terminal-text-muted'}">
						{Number.isFinite($selectedMarket.lastPrice) ? `$${$selectedMarket.lastPrice.toLocaleString('en-US', { minimumFractionDigits: $selectedMarket.priceDecimals })}` : '—'}
					</span>
					<span class="whitespace-nowrap tabular-nums text-sm {hasChange && isPositive ? 'text-terminal-green' : hasChange ? 'text-terminal-red' : 'text-terminal-text-muted'}">
						{hasChange ? `${isPositive ? '+' : ''}${$selectedMarket.changePercent24h!.toFixed(2)}%` : '—'}
					</span>
					{#if marketProfile.meaningfulStats.markPrice && $selectedMarket.markPrice !== undefined}
						<span class="whitespace-nowrap text-terminal-text-muted text-xs">
							Mark: ${$selectedMarket.markPrice.toLocaleString('en-US', { minimumFractionDigits: $selectedMarket.priceDecimals })}
						</span>
					{/if}
					{#if marketProfile.meaningfulStats.fundingRate && $selectedMarket.fundingRate !== undefined}
						<span class="whitespace-nowrap text-terminal-text-muted text-xs">
							Funding: <span class="{$selectedMarket.fundingRate >= 0 ? 'text-terminal-green' : 'text-terminal-red'}">{($selectedMarket.fundingRate * 100).toFixed(4)}%</span>
						</span>
					{/if}
				</div>
			{/if}
		</div>

		<div data-testid="chart-header-controls" class="flex min-w-0 flex-wrap items-center justify-between gap-2">
			{#if chartActionsEnabled}
				<div data-testid="chart-header-actions" class="flex min-w-0 flex-wrap items-center gap-2">
					<button data-action-id="ui.src.lib.components.chart.button.h192fc8b032"
						class="inline-flex items-center border border-terminal-cyan/30 px-2 py-1 text-xs font-semibold rounded transition-colors {$designerMode ? 'bg-terminal-cyan/20 text-terminal-cyan' : 'text-terminal-text-muted hover:text-terminal-text'}"
						onclick={toggleDesignerMode}
						aria-pressed={$designerMode}
						data-testid="chart-designer-toggle"
						title="Design draft — preview order levels on the chart before submitting from the ticket"
					>
						Design
					</button>
					<button data-action-id="ui.src.lib.components.chart.button.h19d1acde11"
						class="inline-flex items-center border border-terminal-green/30 px-2 py-1 text-xs font-semibold rounded transition-colors {$clickPlacementMode ? 'bg-terminal-green/20 text-terminal-green' : 'text-terminal-text-muted hover:text-terminal-text'}"
						onclick={toggleClickPlacementMode}
						aria-pressed={$clickPlacementMode}
						data-testid="chart-click-placement-toggle"
						title="Click placement — right-click the chart to submit an armed limit order"
					>
						{$clickPlacementMode ? 'Armed' : 'Click'}
					</button>
					{#if $clickPlacementMode}
						<select data-action-id="ui.src.lib.components.chart.select.h8566a45bcc" data-testid="chart-click-placement-side" aria-label="Click placement side" bind:value={$clickPlacementSide} class="bg-terminal-bg border border-terminal-border rounded px-1 py-1 text-2xs">
							<option value="auto">Auto</option>
							<option value="buy">Buy</option>
							<option value="sell">Sell</option>
						</select>
						<div data-testid="chart-click-placement-status" aria-live="polite" class="hidden lg:flex flex-wrap items-center gap-2 rounded border border-terminal-green/30 bg-terminal-green/10 px-2 py-1 text-3xs text-terminal-green uppercase tracking-wide">
							<strong>ARMED</strong>
							<span>RIGHT CLICK TO PLACE</span>
							<span>SIZE {formatSize($orderSize)}</span>
							{#if $orderSize <= 0}<span class="text-terminal-yellow">SIZE UNSET</span>{/if}
							<span>SIDE {clickPlacementSideText}</span>
						</div>
					{/if}
				</div>
			{/if}
			<div data-testid="chart-header-timeframes" class="flex min-w-0 max-w-full shrink items-center gap-1 overflow-x-auto bg-terminal-bg rounded p-0.5">
				{#each timeframes as tf}
					<button data-action-id="ui.src.lib.components.chart.button.hf59519be41"
						class="shrink-0 px-2 py-1 text-xs font-medium rounded transition-all duration-150
							   {$chartTimeframe === tf ? 'bg-terminal-bg-tertiary text-terminal-green' : 'text-terminal-text-secondary hover:text-terminal-text'}"
						onclick={() => selectTf(tf)}
					>
						{tf}
					</button>
				{/each}
			</div>
		</div>
	</div>

	{#if chartActionsEnabled}
		<div data-testid="chart-mobile-actions" class="sm:hidden flex flex-col gap-1 border-b border-terminal-border bg-terminal-bg/80 px-2 py-1.5">
			<div class="flex items-center justify-between gap-1.5">
				<button type="button" data-testid="chart-designer-toggle-mobile" class="rounded border border-terminal-cyan/30 px-2 py-1 text-2xs {$designerMode ? 'bg-terminal-cyan/20 text-terminal-cyan' : 'text-terminal-text-muted'}" onclick={toggleDesignerMode} aria-pressed={$designerMode}>
					{$designerMode ? 'Design · armed' : 'Design'}
				</button>
				<button type="button" data-testid="chart-click-placement-touch" class="rounded border border-terminal-border px-2 py-1 text-2xs text-terminal-text-muted opacity-60" disabled title="Click Placement requires a desktop right-click. Use Design on touch devices.">
					Click placement · desktop
				</button>
			</div>
			<span data-testid="chart-click-placement-touch-note" class="text-center text-2xs font-medium leading-tight uppercase tracking-wide text-terminal-text-secondary">Desktop right-click required · use Design on touch</span>
		</div>
	{/if}

	<div data-action-id="chart.surface"
		data-testid="trading-chart"
		data-feed-status={$marketDataStatus}
		data-candle-count={$chartCandles.length + ($liveCandle && $chartHistoryStatus !== 'loading' ? 1 : 0)}
		class="flex-1 relative"
		bind:this={chartContainer}
		oncontextmenu={onChartContextMenu}
		role="application"
		aria-label={readOnly ? 'Read-only price chart' : 'Trading chart'}
	>
		{#if legend}
			{@const decimals = $selectedMarket?.priceDecimals ?? 2}
			{@const changeUp = legend.close >= legend.open}
			<div class="absolute top-1.5 left-1.5 z-10 flex items-center gap-2.5 rounded bg-terminal-bg/85 border border-terminal-border px-2 py-1 text-3xs tabular-nums pointer-events-none select-none">
				<span class="text-terminal-text-muted">O</span><span class={changeUp ? 'text-terminal-green' : 'text-terminal-red'}>{legend.open.toFixed(decimals)}</span>
				<span class="text-terminal-text-muted">H</span><span class={changeUp ? 'text-terminal-green' : 'text-terminal-red'}>{legend.high.toFixed(decimals)}</span>
				<span class="text-terminal-text-muted">L</span><span class={changeUp ? 'text-terminal-green' : 'text-terminal-red'}>{legend.low.toFixed(decimals)}</span>
				<span class="text-terminal-text-muted">C</span><span class={changeUp ? 'text-terminal-green' : 'text-terminal-red'}>{legend.close.toFixed(decimals)}</span>
				<span class="text-terminal-text-muted">{changeUp ? '+' : ''}{(legend.close - legend.open).toFixed(decimals)} ({legend.open !== 0 ? (((legend.close - legend.open) / legend.open) * 100).toFixed(2) : '0.00'}%)</span>
				<span class="text-terminal-text-muted">Vol</span><span class="text-terminal-text-secondary">{formatSize(legend.volume)}</span>
			</div>
		{/if}
		{#if $chartHistoryStatus === 'loading' || ($chartCandles.length === 0 && !$liveCandle)}
			<div class="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
				<div class="rounded border border-terminal-border bg-terminal-bg/90 px-3 py-2 text-2xs {$chartHistoryStatus === 'loading' ? 'text-terminal-text-muted' : $marketDataStatus === 'error' ? 'text-terminal-red' : 'text-terminal-text-muted'}">
					{$chartHistoryStatus === 'loading' ? 'Loading price history…' : unavailableFeedMessage('price history', $marketDataStatus)}
				</div>
			</div>
		{/if}
		{#if privateStateLive}
		{#each $openOrders.filter((order) => marketMatches($selectedMarket, order.apiCoin, order.marketKey)) as order (order.id)}
			{@const y = overlayCoordinates.get(`order:${order.id}`)}
			{#if y !== undefined}
				<div data-action-id="chart.order-drag"
					role="group"
					aria-label="Open order overlay"
					data-order-state={order.pending ? 'pending' : order.error ? 'rejected' : order.status}
					class="absolute right-14 z-20 flex items-center rounded overflow-hidden shadow-lg tabular-nums text-3xs select-none transition-[top] duration-150 {order.side === 'buy' ? 'bg-terminal-green text-terminal-bg' : 'bg-terminal-red text-white'} {order.pending ? 'opacity-60' : ''}"
					style={`top:${Math.max(0, y - 11)}px`}
				>
					<button
						type="button"
						data-testid="chart-live-order-handle"
						class="cursor-ns-resize px-2 py-1 focus:outline-none focus:ring-1 focus:ring-terminal-cyan"
						disabled={order.pending}
						aria-label={`Move ${order.side} order at ${formatChartPrice(liveOrderPrice(order), $selectedMarket)}`}
						title="Drag to modify · Arrow keys move one venue step"
						onmousedown={(event) => startOrderDrag(event, order.id, liveOrderPrice(order) ?? 0)}
						onkeydown={(event) => onLiveOrderKeydown(event, order)}
					>
						{liveOrderStatusLabel(order)} · {order.triggerKind === 'takeProfit' ? 'TP' : order.triggerPrice !== undefined ? 'STOP' : order.side.toUpperCase()} {order.remaining} @ {formatChartPrice(liveOrderPrice(order), $selectedMarket)}
					</button>
					<button data-action-id="ui.src.lib.components.chart.button.hfe0d70279d"
						type="button"
						class="px-1.5 py-1 bg-black/20 hover:bg-black/35 focus:outline-none focus:ring-1 focus:ring-terminal-cyan"
						disabled={order.pending}
						aria-label={`Cancel ${order.side} order`}
						onclick={(event) => cancelChartOrder(event, order.id, order.apiCoin ?? order.marketKey ?? '')}
					>×</button>
				</div>
			{/if}
		{/each}
		{#each $positions.filter((position) => marketMatches($selectedMarket, position.apiCoin, position.marketKey)) as position (position.id)}
			{@const y = overlayCoordinates.get(`position:${position.id}`)}
			{@const liquidationY = overlayCoordinates.get(`liquidation:${position.id}`)}
			{#if y !== undefined}
				<div
					class="absolute left-2 z-10 px-2 py-1 rounded bg-terminal-bg/90 border tabular-nums text-3xs {position.side === 'long' ? 'border-terminal-green text-terminal-green' : 'border-terminal-red text-terminal-red'}"
					style={`top:${Math.max(0, y - 11)}px`}
				>
					{position.side.toUpperCase()} {position.size} · PnL {position.unrealizedPnl >= 0 ? '+' : ''}${position.unrealizedPnl.toFixed(2)}
				</div>
			{/if}
			{#if liquidationY !== undefined && position.liquidationPrice}
				<div
					class="absolute left-2 z-10 px-2 py-1 rounded bg-terminal-bg/90 border border-terminal-orange text-terminal-orange tabular-nums text-3xs"
					style={`top:${Math.max(0, liquidationY - 11)}px`}
				>
					LIQUIDATION {position.liquidationPrice.toFixed($selectedMarket?.priceDecimals ?? 2)}
				</div>
			{/if}
		{/each}
		{:else if !readOnly && $isConnected}
			<div class="absolute top-2 left-2 z-20 rounded border border-terminal-yellow/40 bg-terminal-bg/95 px-2 py-1 text-3xs text-terminal-yellow">
				Private chart overlays paused while account state is {$accountSyncStatus}.
			</div>
		{/if}
		{#if designerDraftView && draftCoordinate !== null}
			<div
				data-testid="chart-designer-draft"
				role="status"
				aria-label={designerDraftView.ariaLabel}
				data-draft-price={designerPrice}
				class="absolute left-8 right-14 z-20 pointer-events-none transition-[top] duration-150"
				style={`top:${Math.max(0, draftCoordinate - 14)}px`}
			>
				<div class="absolute inset-x-0 top-1/2 border-t border-dashed border-terminal-cyan/80"></div>
				<button
					type="button"
					data-testid="chart-designer-draft-handle"
					class="relative inline-flex max-w-full items-center gap-2 rounded border border-terminal-cyan/70 bg-terminal-bg/95 px-2 py-1 text-left font-mono text-3xs text-terminal-cyan shadow-lg pointer-events-auto cursor-ns-resize focus:outline-none focus:ring-1 focus:ring-terminal-cyan"
					aria-label={designerDraftView.ariaLabel}
					title="Drag to adjust · Arrow keys move one venue step · Escape clears preview"
					onpointerdown={startDesignerDrag}
					onkeydown={onDesignerKeydown}
				>
					<span class="inline-flex items-center gap-0.5 rounded border border-terminal-cyan/40 px-1 text-2xs leading-none text-terminal-cyan/80" aria-hidden="true">↕ DRAG</span>
					<span class="font-semibold tracking-wide">{designerDraftView.action}</span>
					<span class="text-terminal-text-muted">{designerDraftView.field}</span>
					<span class="text-terminal-text">{designerDraftView.details}</span>
				</button>
			</div>
		{/if}
		<div class="absolute bottom-4 left-4 text-2xs text-terminal-text-muted bg-terminal-bg/80 px-2 py-1 rounded z-10 pointer-events-none">
			{#if readOnly}
				Read-only chart · public market data only
			{:else if $designerMode}
				Design draft: click chart to preview order levels, then submit from ticket
			{:else if $clickPlacementMode}
				Click placement armed: right-click to submit · Escape to disarm
			{:else}
				Click chart to autofill price · Design opens a draft
			{/if}
		</div>
		{#if crossSpreadWarning}
			<div class="absolute top-2 left-1/2 -translate-x-1/2 text-2xs text-terminal-yellow bg-terminal-bg/90 px-3 py-1 rounded z-10">
				{crossSpreadWarning}
			</div>
		{/if}
		{#if interactionError}
			<button data-action-id="ui.src.lib.components.chart.button.he55dbda5cb" class="absolute top-10 left-1/2 -translate-x-1/2 text-2xs text-terminal-red bg-terminal-bg/95 border border-terminal-red/40 px-3 py-1 rounded z-30" onclick={() => (interactionError = '')}>
				{interactionError}
			</button>
		{/if}
	</div>
</div>
