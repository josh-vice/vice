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
	import { resolveClickPlacementSide, wouldCrossSpread } from '$lib/chart/tradingMath';
	import { priceFormatForMarket } from '$lib/chart/priceFormat';
	import { markUiFrameReady } from '$lib/native/performance';
	import { unavailableFeedMessage } from '$lib/productionTruth';
	import { formatSize } from '$lib/format';
	import { marketCapabilities } from '$lib/marketCapabilities';
	import { chartDatasetKey, chartIdentity, marketMatches } from '$lib/chart/chartModel';

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
	let overlayCoordinates = new Map<string, number>();
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
		return candlestickSeries.coordinateToPrice(e.clientY - rect.top);
	}

	function startOrderDrag(event: MouseEvent, orderId: string, price: number) {
		if (readOnly) return;
		if (!chartActionsEnabled || !privateStateLive) return;
		event.preventDefault();
		event.stopPropagation();
		draggingOrderId = orderId;
		draggingPrice = price;
	}

	function onChartMouseMove(e: MouseEvent) {
		if (readOnly) return;
		if (!chartActionsEnabled) return;
		if ($clickPlacementMode) {
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
		if (!privateStateLive) {
			draggingOrderId = null;
			interactionError = 'Account state is stale; chart order changes are paused until reconciliation completes';
			scheduleOverlayCoordinates();
			return;
		}
		const orderId = draggingOrderId;
		const newPrice = priceAtEvent(e) ?? draggingPrice;
		const order = $openOrders.find((candidate) => candidate.id === orderId);
		draggingOrderId = null;
		if (newPrice != null) {
				const entry = orderLines.get(orderId);
				const tick = 10 ** -($selectedMarket.priceDecimals ?? 2);
				if (entry && Math.abs(newPrice - entry.price) >= tick / 2) {
				openOrders.update((orders) =>
					orders.map((candidate) =>
						candidate.id === orderId ? { ...candidate, pending: true } : candidate
					)
				);
			const marketIdentity = order?.apiCoin ?? order?.marketKey;
			if (!marketIdentity) {
				interactionError = 'Order has no authoritative Hyperliquid identity; modification was not sent';
				openOrders.update((orders) =>
					orders.map((candidate) => candidate.id === orderId ? { ...candidate, pending: false } : candidate)
				);
				return;
			}
				const result = await modifyOrderPrice(orderId, marketIdentity, newPrice);
					if (!result.ok) {
						interactionError = result.error ?? 'Modify rejected';
					} else {
						const refreshed = await fetchOpenOrders();
						if (!refreshed) interactionError = 'Modify accepted but account reconciliation is unresolved';
					}
					openOrders.update((orders) =>
					orders.map((candidate) =>
						candidate.id === orderId ? { ...candidate, pending: false, error: result.error } : candidate
						)
					);
					// The authoritative order snapshot owns the final coordinate. This
					// explicitly snaps a rejected preview back (with the CSS transition)
					// and also refreshes a successful drag before the next venue event.
					scheduleOverlayCoordinates();
				}
		}
		requestAnimationFrame(markUiFrameReady);
	}

	async function cancelChartOrder(event: MouseEvent, orderId: string, market: string) {
		if (readOnly) return;
		if (!chartActionsEnabled) return;
		event.stopPropagation();
		if (!privateStateLive) {
			interactionError = 'Account state is stale; cancellation is paused until reconciliation completes';
			return;
		}
		openOrders.update((orders) =>
			orders.map((order) => (order.id === orderId ? { ...order, pending: true } : order))
		);
		const result = await cancelOrder(orderId, market);
		if (result.ok) {
			openOrders.update((orders) => orders.filter((order) => order.id !== orderId));
			const refreshed = await fetchOpenOrders();
			if (!refreshed) interactionError = 'Cancel accepted but account reconciliation is unresolved';
		}
		else {
			interactionError = result.error ?? 'Cancel rejected';
			openOrders.update((orders) =>
				orders.map((order) =>
					order.id === orderId ? { ...order, pending: false, error: result.error } : order
				)
			);
		}
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
		if (!privateStateLive) {
			overlayCoordinates = new Map();
			return;
		}
		const next = new Map<string, number>();
		for (const order of $openOrders.filter((candidate) => marketMatches($selectedMarket, candidate.apiCoin, candidate.marketKey))) {
			const price = draggingOrderId === order.id ? draggingPrice : order.triggerPrice || order.price;
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
				if (!price) continue;
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
			handleScale: { axisPressedMouseMove: true, mouseWheel: true, pinch: true },
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

		appliedDatasetKey = chartDatasetKey($selectedMarket, $chartTimeframe);
		if ($chartCandles.length > 0 || $liveCandle) applyCandles($chartCandles, true);

		chart.subscribeClick((param) => {
			if (readOnly || !chart || !candlestickSeries) return;
			if (!chartActionsEnabled) return;
			const price = priceFromClick(chart, candlestickSeries, param);
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
			orderLines
		);
		scheduleOverlayCoordinates();
	}

	$: if (candlestickSeries && (readOnly || $positions || $chartDraft || $designerMode || $accountSyncStatus)) {
		syncSupplementalLines();
		scheduleOverlayCoordinates();
	}

	$: if (candlestickSeries) {
		const price = chartActionsEnabled && $clickPlacementMode ? $chartPreviewPrice : null;
		previewLine = setPreviewLine(candlestickSeries, previewLine, price, $orderSide);

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
	onkeydown={(event) => {
		if (chartActionsEnabled && event.key === 'Escape' && $clickPlacementMode) clickPlacementMode.set(false);
	}}
/>

<div class="h-full flex flex-col bg-terminal-bg-secondary rounded-lg overflow-hidden">
	<div class="hidden sm:flex items-center justify-between px-4 py-2 border-b border-terminal-border">
		<div class="flex items-center gap-4">
			<div class="flex items-center gap-2">
				<span class="text-lg font-semibold whitespace-nowrap">{$selectedMarket?.symbol || 'Select market'}</span>
				{#if $selectedMarket}
					<span data-testid="chart-market-kind" class="text-xs px-2 py-0.5 rounded bg-terminal-cyan/15 text-terminal-cyan">{$selectedMarket.kind === 'spot' ? 'Spot' : 'Perpetual'}</span>
				{/if}
			</div>
			{#if $selectedMarket}
				{@const hasChange = $selectedMarket.changePercent24h !== undefined}
				{@const isPositive = ($selectedMarket.changePercent24h ?? 0) >= 0}
				<div class="flex items-center gap-3 text-sm">
					<span class="tabular-nums text-lg {hasChange && isPositive ? 'text-terminal-green' : hasChange ? 'text-terminal-red' : 'text-terminal-text-muted'}">
						{Number.isFinite($selectedMarket.lastPrice) ? `$${$selectedMarket.lastPrice.toLocaleString('en-US', { minimumFractionDigits: $selectedMarket.priceDecimals })}` : '—'}
					</span>
					<span class="tabular-nums text-sm {hasChange && isPositive ? 'text-terminal-green' : hasChange ? 'text-terminal-red' : 'text-terminal-text-muted'}">
						{hasChange ? `${isPositive ? '+' : ''}${$selectedMarket.changePercent24h!.toFixed(2)}%` : '—'}
					</span>
					{#if marketProfile.meaningfulStats.markPrice && $selectedMarket.markPrice !== undefined}
						<span class="text-terminal-text-muted text-xs">
							Mark: ${$selectedMarket.markPrice.toLocaleString('en-US', { minimumFractionDigits: $selectedMarket.priceDecimals })}
						</span>
					{/if}
					{#if marketProfile.meaningfulStats.fundingRate && $selectedMarket.fundingRate !== undefined}
						<span class="text-terminal-text-muted text-xs">
							Funding: <span class="{$selectedMarket.fundingRate >= 0 ? 'text-terminal-green' : 'text-terminal-red'}">{($selectedMarket.fundingRate * 100).toFixed(4)}%</span>
						</span>
					{/if}
				</div>
			{/if}
		</div>

		<div class="flex items-center gap-2">
			{#if chartActionsEnabled}
			<button data-action-id="ui.src.lib.components.chart.button.h192fc8b032"
				class="px-2 py-1 text-2xs rounded transition-colors {$designerMode ? 'bg-terminal-cyan/20 text-terminal-cyan' : 'text-terminal-text-muted hover:text-terminal-text'}"
				onclick={() => designerMode.update((v) => !v)}
				title="Design draft — preview order levels on the chart before submitting from the ticket"
			>
				Design
			</button>
			<button data-action-id="ui.src.lib.components.chart.button.h19d1acde11"
				class="hidden sm:inline-flex px-2 py-1 text-2xs rounded transition-colors {$clickPlacementMode ? 'bg-terminal-green/20 text-terminal-green' : 'text-terminal-text-muted hover:text-terminal-text'}"
				onclick={() => clickPlacementMode.update((v) => !v)}
				title="Click placement — right-click the chart to submit an armed limit order"
			>
				{$clickPlacementMode ? 'Armed' : 'Click'}
			</button>
			{#if $clickPlacementMode}
				<select data-action-id="ui.src.lib.components.chart.select.h8566a45bcc" bind:value={$clickPlacementSide} class="bg-terminal-bg border border-terminal-border rounded px-1 py-1 text-2xs">
					<option value="auto">Auto</option>
					<option value="buy">Buy</option>
					<option value="sell">Sell</option>
				</select>
			{/if}
			{/if}
			<div class="flex items-center gap-1 bg-terminal-bg rounded p-0.5">
				{#each timeframes as tf}
					<button data-action-id="ui.src.lib.components.chart.button.hf59519be41"
						class="px-2 py-1 text-xs font-medium rounded transition-all duration-150
							   {$chartTimeframe === tf ? 'bg-terminal-bg-tertiary text-terminal-green' : 'text-terminal-text-secondary hover:text-terminal-text'}"
						onclick={() => selectTf(tf)}
					>
						{tf}
					</button>
				{/each}
			</div>
		</div>
	</div>

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
				<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
				<div data-action-id="chart.order-drag"
					role="group"
					aria-label="Open order overlay"
					class="absolute right-14 z-20 flex items-center rounded overflow-hidden shadow-lg tabular-nums text-3xs select-none transition-[top] duration-150 {order.side === 'buy' ? 'bg-terminal-green text-terminal-bg' : 'bg-terminal-red text-white'} {order.pending ? 'opacity-60' : ''}"
					onmousedown={(event) => startOrderDrag(event, order.id, order.triggerPrice || order.price || 0)}
				>
					<span class="cursor-ns-resize px-2 py-1">
						{order.pending ? 'PENDING' : order.status.toUpperCase()} · {order.triggerKind === 'takeProfit' ? 'TP' : order.triggerPrice ? 'STOP' : order.side.toUpperCase()} {order.remaining} @ {(order.triggerPrice || order.price)?.toFixed($selectedMarket?.priceDecimals ?? 2)}
					</span>
					<button data-action-id="ui.src.lib.components.chart.button.hfe0d70279d"
						class="px-1.5 py-1 bg-black/20 hover:bg-black/35"
						aria-label="Cancel order"
						onmousedown={(event) => event.stopPropagation()}
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
