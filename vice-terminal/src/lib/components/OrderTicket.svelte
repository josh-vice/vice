<script lang="ts">
	import { selectedMarket, marketRegistry, orderSide, orderType, orderPrice, orderSize, orderLeverage, reduceOnly, postOnly, ioc, activeSubaccount, balances, advancedConfig, orderPresets, applyOrderPreset, saveOrderPreset, deleteOrderPreset, priceInputFocused, chartActiveField, chartDraft, chartRiskPercent, chartCandles, chartTimeframe, designerMode, isConnected, executionStatus, enableTrading, setOrderSizePercent, fatFingerLimits, setFatFingerLimits, orderBook, positions, accountSyncStatus, marketDataStatus } from '$lib/stores';
	import { cancelEnableTrading } from '$lib/stores';
	import { ORDER_TYPE_GROUPS, QUICK_ORDER_TYPES, SIZE_PRESETS, persistenceClass } from '$lib/orderTicketModel';
	import type { OrderSide, OrderType, OrderBook } from '$lib/types';
	import { Minus, Plus, Zap, ChevronDown } from 'lucide-svelte';
	import { placeOrder, startAlgoOrder, fetchOpenOrders } from '$lib/hl/orders';
	import { riskBasedSize } from '$lib/chart/tradingMath';
	import { volatilityBasedSize, volatilitySizingCertified } from '$lib/chart/volatilitySizing';
	import { advancedOrderTypes, isAdvancedOrderCertified, isAdvancedOrderType, unavailableOrderTypeMessage } from '$lib/execution/capabilities';
	import { monotonicNowUs } from '$lib/execution/clock';
	import { recordInputToSubmit } from '$lib/execution/telemetry';
	import { estimateOrderPreview, type OrderPreview } from '$lib/orderPreview';
	import { marketMatches } from '$lib/chart/chartModel';
	import { formatPrice, formatSize } from '$lib/format';
	import { tradingKillSwitchActive, tradingKillSwitchMessage } from '$lib/execution/releaseSafety';
	import { privacyMode } from '$lib/privacyMode';
	import PositionMarketActions from '$lib/components/PositionMarketActions.svelte';
	import { onDestroy } from 'svelte';
	import { marketCapabilities } from '$lib/marketCapabilities';
	import {
		ENABLEMENT_STEP_DETAIL,
		ENABLEMENT_STEP_LABEL,
		boundedEnablementBackoffMs,
		classifyEnablementError,
		enablementIsCancellable,
		enablementIsRetryable,
		enablementProgressLabel,
		type EnablementErrorKind,
		type EnablementPhase
	} from '$lib/execution/enablement';


type AlgorithmOrderType = Exclude<OrderType, 'limit' | 'market' | 'stop' | 'stop_limit' | 'bracket'>;

function isAlgorithmOrderType(type: OrderType): type is AlgorithmOrderType {
	return type !== 'bracket' && isAdvancedOrderType(type);
}

const EMPTY_ORDER_BOOK: OrderBook = { bids: [], asks: [], spread: 0, spreadPercent: 0 };

	let typeMenuOpen = false;
	let submitError = '';
	let submitting = false;
	// Secure-trading enablement lifecycle (explicit state machine, not a spinner).
	let enablePhase: EnablementPhase = { kind: 'idle' };
	let enableRetryAvailable = true;
	let enableCountdown = 0;
	let enableRetryTimer: ReturnType<typeof setInterval> | null = null;
	let takeoverRequested = false;

	const ENABLEMENT_ERROR_LABEL: Record<EnablementErrorKind, string> = {
		rejected: 'Approval rejected',
		'wallet-mismatch': 'Wallet account changed',
		'stale-account': 'Account state is stale',
		'rate-limited': 'Venue rate limit reached',
		timeout: 'Request timed out',
		offline: 'Connection unavailable',
		uncertain: 'Unable to enable secure trading',
		'not-connected': 'Wallet not connected'
	};

	function stopEnableRetryTimer() {
		if (enableRetryTimer) {
			clearInterval(enableRetryTimer);
			enableRetryTimer = null;
		}
	}

	function scheduleEnableRetry(backoffMs?: number) {
		stopEnableRetryTimer();
		const total = boundedEnablementBackoffMs(backoffMs);
		enableCountdown = Math.ceil(total / 1000);
		enableRetryAvailable = false;
		enableRetryTimer = setInterval(() => {
			enableCountdown -= 1;
			if (enableCountdown <= 0) {
				enableCountdown = 0;
				enableRetryAvailable = true;
				stopEnableRetryTimer();
			}
		}, 1000);
	}
	function dismissEnablement() {
		cancelEnableTrading();
		stopEnableRetryTimer();
		enablePhase = { kind: 'idle' };
	}

	function retryEnableSecureTrading() {
		takeoverRequested = false;
		void enableSecureTrading();
	}

	function takeOverExpiredLease() {
		takeoverRequested = true;
		void enableSecureTrading();
	}

	onDestroy(stopEnableRetryTimer);
	let presetName = '';
	let amountUnit: 'base' | 'quote' = 'base';
	let presetMessage = '';
	$: marketProfile = marketCapabilities($selectedMarket);
	$: if (marketProfile.amountUnit === 'quote') amountUnit = 'quote';
	$: if (marketProfile.amountUnit === 'base') amountUnit = 'base';

	// Keep the complete catalog discoverable. Certification is an execution gate,
	// never a reason to make an existing order type silently disappear.
	$: availableOrderTypeGroups = ORDER_TYPE_GROUPS
		.map((group) => ({ ...group, types: group.types.filter((type) => marketProfile.allowedOrderTypes.includes(type.id) || (marketProfile.supportsAdvancedOrders && isAdvancedOrderType(type.id))) }))
		.filter((group) => group.types.length > 0);
	$: availableQuickTypes = QUICK_ORDER_TYPES.filter((type) => marketProfile.allowedOrderTypes.includes(type.id) || (marketProfile.supportsAdvancedOrders && isAdvancedOrderType(type.id)));
	$: allTypes = availableOrderTypeGroups.flatMap((g) => g.types);
	$: currentType = allTypes.find((t) => t.id === $orderType) ?? allTypes[0];
	$: persistence = persistenceClass($orderType);
	$: needsPrice = !['market', 'twap', 'adaptive_twap', 'vwap', 'pov', 'break_even', 'maker', 'conditional_ladder', 'chase', 'swarm', 'ping_pong'].includes($orderType);
	$: needsTrigger = marketProfile.supportsTriggers && ['stop', 'stop_limit'].includes($orderType);

	$: valuationPrice = ['limit', 'stop_limit'].includes($orderType) ? ($orderPrice ?? 0) : ($orderPrice ?? $selectedMarket?.lastPrice ?? 0);
	$: notionalValue = $orderSize * valuationPrice;
	$: amountInputValue = amountUnit === 'base' ? $orderSize : notionalValue;
	$: quoteAsset = $selectedMarket?.quoteToken ?? 'USD';
	$: availableMargin = marketProfile.amountUnit === 'quote'
		? ($balances.find((balance) => balance.asset.toUpperCase() === quoteAsset.toUpperCase())?.available ?? 0)
		: $activeSubaccount.marginFree;
	$: marginRequired = marketProfile.usesMargin ? notionalValue / $orderLeverage : 0;
	$: venueMaxLeverage = marketProfile.maxLeverage;
	$: if ($orderLeverage > venueMaxLeverage) orderLeverage.set(venueMaxLeverage);
	$: baseAsset = $selectedMarket?.baseToken ?? 'Asset';
	$: selectedPosition = !$privacyMode && $isConnected && $accountSyncStatus === 'live' ? $positions.find((position) => marketMatches($selectedMarket, position.apiCoin, position.marketKey)) : undefined;
	$: orderPreview = estimateOrderPreview({
		book: $marketDataStatus === 'live' ? $orderBook : EMPTY_ORDER_BOOK,
		side: $orderSide,
		orderType: $orderType,
		size: $orderSize,
		limitPrice: $orderPrice,
		postOnly: $postOnly,
		reduceOnly: $reduceOnly,
		accountLive: $isConnected && $accountSyncStatus === 'live' && !$privacyMode,
		position: selectedPosition ? { side: selectedPosition.side, size: selectedPosition.size } : undefined
	});

	function previewPrice(value: number | undefined): string {
		return value === undefined ? '—' : formatPrice(value, $selectedMarket?.priceDecimals ?? 2);
	}
	function previewSize(value: number): string {
		return formatSize(value);
	}
	function previewStatusLabel(status: OrderPreview['status']): string {
		return {
			'not-applicable': 'Not applicable',
			unavailable: 'Waiting for live book',
			resting: 'Resting limit',
			estimated: 'Estimated fill',
			insufficient: 'Insufficient depth',
			'post-only-crossing': 'Post-only would cross'
		}[status];
	}
	function previewNotional(value: number | undefined): string {
		if ($privacyMode) return '••••••';
		return value === undefined ? '—' : `$${value.toFixed(2)}`;
	}
	function previewFee(preview: OrderPreview): string {
		if ($privacyMode) return '••••••';
		return preview.estimatedFee === null ? 'Unavailable — fee tier not loaded' : `$${preview.estimatedFee.toFixed(4)}`;
	}
	function previewSlippage(value: number | undefined): string {
		return value === undefined ? '—' : `${value.toFixed(2)} bps`;
	}
	function previewReduceOnly(preview: OrderPreview): string {
		return preview.reduceOnly.message;
	}


	function setSide(side: OrderSide) {
		orderSide.set(side);
	}
	function setPostOnly(value: boolean) {
		if (!marketProfile.supportsPostOnly) {
			postOnly.set(false);
			return;
		}
		if (value && !['limit', 'scale', 'maker'].includes($orderType)) {
			postOnly.set(false);
			return;
		}
		postOnly.set(value);
		if (value) ioc.set(false);
	}
	function setIoc(value: boolean) {
		if (!marketProfile.supportsIoc) {
			ioc.set(false);
			return;
		}
		ioc.set(value);
		if (value) postOnly.set(false);
	}
	function pickType(id: OrderType) {
		if (!marketProfile.allowedOrderTypes.includes(id) && !(marketProfile.supportsAdvancedOrders && isAdvancedOrderType(id))) { submitError = `Order type ${id} is not supported for this market`; return; }
		if (!isAdvancedOrderCertified(id)) {
			submitError = unavailableOrderTypeMessage(id);
			return;
		}
		orderType.set(id);
		if (id === 'market') {
			postOnly.set(false);
			ioc.set(marketProfile.supportsIoc);
		} else if (id === 'limit') {
			postOnly.set(marketProfile.supportsPostOnly);
			ioc.set(false);
		} else if (!['scale', 'maker'].includes(id)) {
			postOnly.set(false);
			ioc.set(false);
		}
		if (id === 'bracket') {
			designerMode.set(true);
			chartActiveField.set('entry');
		}
		typeMenuOpen = false;
	}
	function setSizePercent(percent: number) {
		setOrderSizePercent(percent);
	}
	function setAmountUnit(unit: 'base' | 'quote') {
		if (!marketProfile.amountUnits.includes(unit)) return;
		amountUnit = unit;
	}
	function setAmountInput(value: number) {
		const price = $selectedMarket?.lastPrice ?? 0;
		if (!Number.isFinite(value) || value < 0 || (amountUnit === 'quote' && price <= 0)) {
			orderSize.set(0);
			return;
		}
		orderSize.set(amountUnit === 'base' ? value : value / price);
	}
	function setFatFingerLimit(kind: 'order' | 'position', value: string) {
		const marketKey = $selectedMarket?.marketKey;
		const positions = { ...$fatFingerLimits.maxPositionNotionalByMarket };
		if (kind === 'position' && marketKey) positions[marketKey] = value;
		setFatFingerLimits({
			maxOrderNotional: kind === 'order' ? value : $fatFingerLimits.maxOrderNotional,
			maxPositionNotionalByMarket: positions
		});
	}
	function savePreset() {
		presetMessage = '';
		const result = saveOrderPreset(presetName);
		if (result.ok) {
			presetName = '';
			presetMessage = 'Saved';
		} else presetMessage = result.error ?? 'Could not save preset';
	}
	function usePreset(id: string) {
		const preset = $orderPresets.find((candidate) => candidate.id === id);
		if (preset) applyOrderPreset(preset);
	}
	async function submitOrder() {
		submitError = '';
		if (!$selectedMarket) {
			submitError = 'Select a market before placing an order';
			return;
		}
		if (!marketProfile.executable) {
			submitError = marketProfile.readOnlyReason ?? 'This market is read-only';
			return;
		}
		if (!marketProfile.allowedOrderTypes.includes($orderType) && !(marketProfile.supportsAdvancedOrders && isAdvancedOrderType($orderType))) {
			submitError = `Order type ${$orderType} is not supported for this market`;
			return;
		}
		if (!isAdvancedOrderCertified($orderType)) {
			submitError = unavailableOrderTypeMessage($orderType);
			return;
		}
		if (['limit', 'stop_limit'].includes($orderType) && (!$orderPrice || !Number.isFinite($orderPrice) || $orderPrice <= 0)) {
			submitError = `${$orderType === 'stop_limit' ? 'Limit' : 'Order'} price is required`;
			return;
		}
		submitting = true;
		const inputStartedUs = monotonicNowUs();
		const submittedOrderType = $orderType;
		let inputSubmitRecorded = false;
		const recordSubmit = (submitted: boolean) => {
			if (!submitted || inputSubmitRecorded) return;
			inputSubmitRecorded = true;
			recordInputToSubmit(inputStartedUs, monotonicNowUs());
		};
		try {
			if (isAlgorithmOrderType(submittedOrderType)) {
				const result = await startAlgoOrder({
					side: $orderSide,
					type: submittedOrderType,
					size: $orderSize,
					price: $orderPrice ?? undefined,
					triggerPrice: $advancedConfig.triggerPrice,
					reduceOnly: $reduceOnly,
					postOnly: $postOnly,
					algo: { type: submittedOrderType, config: $advancedConfig as Record<string, unknown> }
				});
				recordSubmit(result.executionAttempted === true);
				if (!result.ok) submitError = result.error ?? 'Algo failed';
			} else {
				const result = await placeOrder({
					side: $orderSide,
					type: submittedOrderType,
					price: $orderPrice ?? undefined,
					triggerPrice: needsTrigger ? $advancedConfig.triggerPrice : undefined,
					triggerKind: needsTrigger ? 'stop' : undefined,
					size: $orderSize,
					reduceOnly: $reduceOnly,
					postOnly: $postOnly,
					ioc: $ioc,
					takeProfit: $advancedConfig.takeProfit,
					stopLoss: $advancedConfig.stopLoss,
					trailOffset: $advancedConfig.trailOffset,
					autoTakeProfit: {
						enabled: $advancedConfig.autoTakeProfitEnabled ?? false,
						startPrice: $advancedConfig.autoTakeProfitStartPrice ?? 0,
						endPrice: $advancedConfig.autoTakeProfitEndPrice ?? 0,
						levels: $advancedConfig.autoTakeProfitLevels ?? 3,
						skew: $advancedConfig.autoTakeProfitSkew ?? 1
					}
				});
				recordSubmit(result.data !== undefined);
				if (!result.ok) {
					submitError = result.error ?? 'Order failed';
				} else {
					const refreshed = await fetchOpenOrders();
					if (!refreshed) submitError = 'Order accepted but account reconciliation is unresolved';
					if (result.autoTakeProfit && !result.autoTakeProfit.ok) submitError = `Entry submitted, but auto take-profit failed: ${result.autoTakeProfit.error ?? 'unknown error'}`;
				}
			}
		} catch (e) {
			submitError = e instanceof Error ? e.message : 'Order failed';
		} finally {
			submitting = false;
		}
	}

	async function enableSecureTrading() {
		submitError = '';
		enablePhase = {
			kind: 'step',
			step: 'connecting',
			detail: ENABLEMENT_STEP_DETAIL['connecting']
		};
		stopEnableRetryTimer();
		try {
			await enableTrading(
				{ takeover: takeoverRequested },
				(phase) => {
					enablePhase = phase;
					if (phase.kind === 'error' && phase.error.kind === 'rate-limited') {
						scheduleEnableRetry(phase.error.backoffMs);
					}
				}
			);
		} catch (error) {
			// The stores reporter emits an 'error' phase on the paths it covers;
			// this fallback guarantees a classified state even if a guard threw
			// before the reporter could fire.
			const classified = classifyEnablementError(error);
			enablePhase = { kind: 'error', error: classified, detail: classified.message };
			if (classified.kind === 'rate-limited') scheduleEnableRetry(classified.backoffMs);
		}
	}

	function updateCfg(key: string, value: number | boolean | string) {
		advancedConfig.update((c) => ({ ...c, [key]: value }));
		if (typeof value === 'number') {
			const draftKey =
				key === 'triggerPrice'
					? 'trigger'
					: key === 'takeProfit' || key === 'stopLoss' || key === 'scaleStartPrice' || key === 'scaleEndPrice'
						? key.replace('Price', '')
						: null;
			if (draftKey) chartDraft.update((draft) => ({ ...draft, [draftKey]: value }));
		}
	}

	function localDateTimeInput(value: number | undefined): string {
		if (!value || !Number.isFinite(value)) return '';
		const local = new Date(value - new Date(value).getTimezoneOffset() * 60_000);
		return local.toISOString().slice(0, 16);
	}

	$: if ($orderPrice != null) {
		chartDraft.update((draft) => (draft.entry === $orderPrice ? draft : { ...draft, entry: $orderPrice! }));
	}

	function focusChartField(field: 'entry' | 'trigger' | 'takeProfit' | 'stopLoss' | 'scaleStart' | 'scaleEnd') {
		chartActiveField.set(field);
		priceInputFocused.set(true);
	}

	function blurChartField() {
		priceInputFocused.set(false);
	}

	function applyRiskSize() {
		const entry = $chartDraft.entry ?? $orderPrice ?? $selectedMarket?.lastPrice ?? 0;
		const stop = $chartDraft.stopLoss ?? $advancedConfig.stopLoss ?? 0;
		if (!$selectedMarket) return;
		orderSize.set(
			riskBasedSize({
				equity: $activeSubaccount.equity,
				riskPercent: $chartRiskPercent,
				entry,
				stop,
				marginFree: $activeSubaccount.marginFree,
				leverage: $orderLeverage,
				szDecimals: $selectedMarket.szDecimals ?? 4
			})
		);
	}

	function applyVolatilitySize() {
		if (!$selectedMarket) return;
		const entry = $chartDraft.entry ?? $orderPrice ?? $selectedMarket.lastPrice ?? 0;
		try {
			const result = volatilityBasedSize({
				candles: $chartCandles,
				lookback: $advancedConfig.volatilityLookback ?? 20,
				stopMultiplier: $advancedConfig.volatilityMultiplier ?? 2,
				equity: $activeSubaccount.equity,
				riskPercent: $chartRiskPercent,
				entry,
				marginFree: $activeSubaccount.marginFree,
				leverage: $orderLeverage,
				szDecimals: $selectedMarket.szDecimals
			});
			orderSize.set(result.size);
			advancedConfig.update((config) => ({ ...config, stopLoss: result.stop }));
			chartDraft.update((draft) => ({ ...draft, stopLoss: result.stop }));
		} catch (error) {
			submitError = error instanceof Error ? error.message : 'Volatility sizing unavailable';
		}
	}
</script>

{#if !$selectedMarket}
	<div class="flex h-full items-center justify-center p-4 text-center text-2xs text-terminal-text-muted" data-testid="order-ticket-no-market">
		Select a market to configure an order.
	</div>
{:else if !marketProfile.executable || !currentType}
	<div class="flex h-full items-center justify-center p-4 text-center text-2xs text-terminal-yellow" data-testid="order-ticket-unsupported">
		{marketProfile.readOnlyReason ?? 'Order entry is unavailable for this market.'}
	</div>
{:else}
<div class="h-full flex flex-col bg-terminal-bg-panel">
	<!-- Buy/Sell Tabs -->
	<div class="grid grid-cols-2 border-b border-terminal-border flex-shrink-0">
		<button data-action-id="ui.src.lib.components.orderticket.button.h3165c9fc1f"
			class="py-2 text-xs font-medium transition-colors
				   {$orderSide === 'buy'
					? 'bg-terminal-cyan/10 text-terminal-cyan border-b-2 border-terminal-cyan'
					: 'text-terminal-text-secondary hover:text-terminal-text'}"
			onclick={() => setSide('buy')}
		>
			Buy {baseAsset}
		</button>
		<button data-action-id="ui.src.lib.components.orderticket.button.h645dde7b3e"
			class="py-2 text-xs font-medium transition-colors
				   {$orderSide === 'sell'
					? 'bg-terminal-red/10 text-terminal-red border-b-2 border-terminal-red'
					: 'text-terminal-text-secondary hover:text-terminal-text'}"
			onclick={() => setSide('sell')}
		>
			Sell {baseAsset}
		</button>
	</div>
	{#if $selectedMarket.kind === 'hip3Perp'}
		<div data-testid="hip3-routing-disclosure" role="note" class="flex items-center justify-between gap-2 rounded border border-terminal-cyan/30 bg-terminal-cyan/5 px-2 py-1.5 text-3xs">
			<span class="font-medium text-terminal-cyan">HIP-3 route</span>
			<span class="text-right text-terminal-text-muted">{$selectedMarket.dex ?? 'DEX unavailable'} · API coin {$selectedMarket.apiCoin}</span>
		</div>
	{/if}


	<!-- Order Form -->
	<div class="flex-1 overflow-y-auto p-2.5 space-y-2.5 scrollbar-none">
		<div class="grid grid-cols-4 gap-1">
			{#each availableQuickTypes as quick}
				{@const certified = isAdvancedOrderCertified(quick.id)}
				<button data-action-id="ui.src.lib.components.orderticket.button.hc5d9ff4cb4"
					class="py-1.5 rounded text-2xs font-medium {certified ? ($orderType === quick.id ? 'bg-terminal-cyan/15 text-terminal-cyan ring-1 ring-terminal-cyan/40' : 'bg-terminal-bg text-terminal-text-muted hover:text-terminal-text') : 'cursor-not-allowed opacity-60'}"
					onclick={() => pickType(quick.id)}
					disabled={!certified}
					aria-disabled={!certified}
					title={certified ? quick.desc : unavailableOrderTypeMessage(quick.id)}
				>{quick.label}</button>
			{/each}
		</div>

		<!-- Account-scoped order presets. Values are local UI intent only and are
		     revalidated by the execution boundary before signing. -->
		{#if $isConnected}
			<div class="rounded border border-terminal-border/60 bg-terminal-bg p-1.5 space-y-1">
				<div class="flex items-center gap-1">
					<select data-action-id="ui.src.lib.components.orderticket.select.hde28becad8" class="min-w-0 flex-1 terminal-input text-3xs py-1" value="" onchange={(event) => usePreset(event.currentTarget.value)}>
						<option value="">Load preset…</option>
						{#each $orderPresets as preset}
							<option value={preset.id}>{preset.name} · {preset.orderType}</option>
						{/each}
					</select>
					<input data-action-id="ui.src.lib.components.orderticket.input.he13ce8388c" class="w-20 terminal-input text-3xs py-1 px-1" bind:value={presetName} maxlength="40" placeholder="Name" aria-label="Preset name" />
					<button data-action-id="ui.src.lib.components.orderticket.button.h56ef0f2413" class="px-1.5 py-1 rounded bg-terminal-cyan/15 text-terminal-cyan text-3xs" onclick={savePreset} disabled={!presetName.trim()}>Save</button>
				</div>
				{#if $orderPresets.length > 0}
					<div class="flex gap-1 overflow-x-auto scrollbar-none">
						{#each $orderPresets.slice(0, 4) as preset}
							<button data-action-id="ui.src.lib.components.orderticket.button.h6a74c86c9a" class="shrink-0 text-3xs text-terminal-text-muted hover:text-terminal-text" title="Delete preset" onclick={() => deleteOrderPreset(preset.id)}>{preset.name} ×</button>
						{/each}
					</div>
				{/if}
				{#if presetMessage}<div class="text-3xs text-terminal-text-muted">{presetMessage}</div>{/if}
			</div>
		{/if}
		<!-- Order Type Selector (custom dropdown for grouping + descriptions) -->
		<div class="relative">
			<button data-action-id="ui.src.lib.components.orderticket.button.h61d0cd3d1f"
				class="w-full flex items-center justify-between bg-terminal-bg border border-terminal-border rounded px-2.5 py-2 text-xs hover:border-terminal-cyan/50 transition-colors"
				onclick={() => (typeMenuOpen = !typeMenuOpen)}
			>
				<span class="flex flex-col items-start">
					<span class="text-terminal-text font-medium">{currentType.label}</span>
					<span class="text-3xs text-terminal-text-muted">{currentType.desc}</span>
				</span>
				<ChevronDown class="w-3.5 h-3.5 text-terminal-text-muted transition-transform {typeMenuOpen ? 'rotate-180' : ''}" />
			</button>
			{#if typeMenuOpen}
				<div class="absolute z-30 mt-1 w-full bg-terminal-bg-secondary border border-terminal-border rounded shadow-xl max-h-72 overflow-y-auto scrollbar-none">
					{#each availableOrderTypeGroups as g}
						<div class="px-2 py-1 text-3xs uppercase tracking-wide text-terminal-text-muted bg-terminal-bg-tertiary/40">{g.group}</div>
						{#each g.types as t}
							{@const certified = isAdvancedOrderCertified(t.id)}
							<button data-action-id="ui.src.lib.components.orderticket.button.hd2a4b6e82"
								class="w-full text-left px-2.5 py-1.5 transition-colors flex flex-col {certified ? 'hover:bg-terminal-bg-hover' : 'cursor-not-allowed opacity-60'} {t.id === $orderType ? 'bg-terminal-cyan/10' : ''}"
								onclick={() => pickType(t.id)}
								disabled={!certified}
								aria-disabled={!certified}
								title={certified ? t.desc : unavailableOrderTypeMessage(t.id)}
							>
								<span class="flex items-center gap-1 text-2xs font-medium {t.id === $orderType ? 'text-terminal-cyan' : 'text-terminal-text'}">{t.label}{#if !certified}<span class="rounded bg-terminal-yellow/10 px-1 text-3xs text-terminal-yellow">Testnet certification required</span>{/if}</span>
								<span class="text-3xs text-terminal-text-muted">{certified ? t.desc : unavailableOrderTypeMessage(t.id)}</span>
							</button>
						{/each}
					{/each}
				</div>
			{/if}
		</div>

		<!-- Amount -->
		<div>
			<div class="flex items-center justify-between mb-1">
				<span class="text-3xs text-terminal-text-muted">Amount</span>
				<div class="flex items-center gap-1">
					{#if marketProfile.amountUnits.includes('base')}<button data-action-id="ui.src.lib.components.orderticket.button.he5d584f437" class="px-1.5 py-0.5 text-3xs rounded {amountUnit === 'base' ? 'bg-terminal-bg-tertiary text-terminal-text' : 'text-terminal-text-muted hover:text-terminal-text'}" onclick={() => setAmountUnit('base')}>{baseAsset}</button>{/if}
					{#if marketProfile.amountUnits.includes('quote')}<button data-action-id="ui.src.lib.components.orderticket.button.h8c9984834d" class="px-1.5 py-0.5 text-3xs rounded {amountUnit === 'quote' ? 'bg-terminal-bg-tertiary text-terminal-text' : 'text-terminal-text-muted hover:text-terminal-text'}" onclick={() => setAmountUnit('quote')}>{quoteAsset}</button>{/if}
				</div>
			</div>
			<div class="flex items-center gap-1">
				<button data-action-id="ui.src.lib.components.orderticket.button.h60b761af0b"
					class="p-1.5 bg-terminal-bg rounded hover:bg-terminal-bg-hover transition-colors"
					onclick={() => orderSize.update((s) => Math.max(0, s - 0.01))}
				>
					<Minus class="w-3 h-3 text-terminal-text-muted" />
				</button>
				<input data-action-id="ui.src.lib.components.orderticket.input.h322ec251fe"
					type="number"
					value={amountInputValue}
					oninput={(event) => setAmountInput(Number(event.currentTarget.value))}
					class="flex-1 terminal-input text-center font-mono text-xs py-1.5"
					step={amountUnit === 'base' ? '0.001' : '0.01'}
					min="0"
					placeholder="0"
					aria-label="Order amount"
				/>
				<button data-action-id="ui.src.lib.components.orderticket.button.h538ecdd58c"
					class="p-1.5 bg-terminal-bg rounded hover:bg-terminal-bg-hover transition-colors"
					onclick={() => orderSize.update((s) => s + 0.01)}
				>
					<Plus class="w-3 h-3 text-terminal-text-muted" />
				</button>
			</div>
			<div class="flex gap-0.5 mt-1">
				{#each SIZE_PRESETS as preset}
					<button data-action-id="ui.src.lib.components.orderticket.button.h77b1731cbf"
						class="flex-1 py-1 text-3xs rounded bg-terminal-bg hover:bg-terminal-bg-hover transition-colors text-terminal-text-muted"
						onclick={() => setSizePercent(preset)}
					>
						{preset}%
					</button>
				{/each}
			</div>
		</div>

		<!-- Limit / Stop price -->
		{#if needsPrice}
			<div>
				<span class="text-3xs text-terminal-text-muted block mb-1">{$orderType === 'stop_limit' ? 'Limit price' : 'Price'}</span>
				<div class="flex items-center gap-1">
					<button data-action-id="ui.src.lib.components.orderticket.button.h2c0b318903" class="p-1.5 bg-terminal-bg rounded hover:bg-terminal-bg-hover transition-colors" onclick={() => orderPrice.update((p) => (p || 0) - 1)}>
						<Minus class="w-3 h-3 text-terminal-text-muted" />
					</button>
					<input data-action-id="ui.src.lib.components.orderticket.input.hdf732c07e3"
						type="number"
						bind:value={$orderPrice}
						onfocus={() => focusChartField('entry')}
						onblur={blurChartField}
						class="flex-1 terminal-input text-center font-mono text-xs py-1.5"
						step="0.1"
						placeholder="0.00"
						aria-label="Order price"
					/>
					<button data-action-id="ui.src.lib.components.orderticket.button.h6aec707dd7" class="p-1.5 bg-terminal-bg rounded hover:bg-terminal-bg-hover transition-colors" onclick={() => orderPrice.update((p) => (p || 0) + 1)}>
						<Plus class="w-3 h-3 text-terminal-text-muted" />
					</button>
				</div>
			</div>
		{/if}

		<!-- Trigger price for stops -->
		{#if needsTrigger}
			<div>
				<span class="text-3xs text-terminal-text-muted block mb-1">Trigger price</span>
				<input data-action-id="ui.src.lib.components.orderticket.input.h98f5bf7ee"
					type="number"
					value={$advancedConfig.triggerPrice}
					oninput={(event) => updateCfg('triggerPrice', +event.currentTarget.value)}
					onfocus={() => focusChartField('trigger')}
					onblur={blurChartField}
					class="w-full terminal-input font-mono text-xs py-1.5 px-2"
					step="0.1"
					placeholder="Click chart"
					aria-label="Trigger price"
				/>
			</div>
		{/if}
		<div data-testid="order-preview" class="rounded border border-terminal-border/60 bg-terminal-bg-secondary p-2 space-y-1.5">
			<div class="flex items-center justify-between">
				<span class="text-3xs uppercase tracking-wide text-terminal-text-muted">Order preview</span>
				<span class="text-3xs text-terminal-cyan">{previewStatusLabel(orderPreview.status)}</span>
				{#if orderPreview.status === 'unavailable' || orderPreview.status === 'insufficient' || orderPreview.status === 'post-only-crossing'}
					<span data-testid="order-preview-live-status" role="status" aria-live="polite" class="sr-only">{previewStatusLabel(orderPreview.status)}</span>
				{/if}
			</div>
			<div class="grid grid-cols-2 gap-x-3 gap-y-1 text-3xs tabular-nums">
				<div class="flex justify-between gap-2"><span class="text-terminal-text-muted">Best</span><span class="font-mono">{previewPrice(orderPreview.bestPrice)}</span></div>
				<div class="flex min-w-0 justify-between gap-2"><span class="text-terminal-text-muted">Depth</span><span class="min-w-0 break-words text-right font-mono">{previewSize(orderPreview.filledSize)} / {previewSize(orderPreview.effectiveSize)} · {previewSize(orderPreview.displayedDepthSize)} displayed</span></div>
				<div class="flex justify-between gap-2"><span class="text-terminal-text-muted">Avg fill</span><span class="font-mono">{previewPrice(orderPreview.averageFillPrice)}</span></div>
				<div class="flex justify-between gap-2"><span class="text-terminal-text-muted">Slippage</span><span class="font-mono">{previewSlippage(orderPreview.slippageBps)}</span></div>
				<div class="flex justify-between gap-2"><span class="text-terminal-text-muted">Notional</span><span class="font-mono">{previewNotional(orderPreview.estimatedNotional)}</span></div>
				<div class="col-span-2 flex justify-between gap-2"><span class="text-terminal-text-muted">Fee estimate</span><span class="min-w-0 text-right font-mono">{previewFee(orderPreview)}</span></div>
			</div>
			<div class="border-t border-terminal-border/40 pt-1 text-3xs">
				<span class="text-terminal-text-muted">Reduce-only ·{' '}</span><span class={orderPreview.reduceOnly.status === 'reduces' || orderPreview.reduceOnly.status === 'capped' ? 'text-terminal-green' : 'text-terminal-text-secondary'}>{previewReduceOnly(orderPreview)}</span>
			</div>
		</div>


		<!-- ===== Advanced parameter blocks ===== -->
		<details class="rounded border border-terminal-border/60 bg-terminal-bg-secondary" data-testid="advanced-order-options">
			<summary data-action-id="ui.src.lib.components.orderticket.summary.h98272e1083" class="cursor-pointer px-2 py-1.5 text-3xs uppercase tracking-wide text-terminal-text-muted">Advanced order options</summary>
		{#if $orderType === 'trailing_stop'}
			<div class="bg-terminal-bg rounded p-2 space-y-1.5">
				<span class="text-3xs text-terminal-text-muted uppercase">Trailing Stop</span>
				<label class="flex items-center justify-between text-2xs">
					<span class="text-terminal-text-secondary">Trail offset (%)</span>
					<input data-action-id="ui.src.lib.components.orderticket.input.h5b3b05d4d0" type="number" value={$advancedConfig.trailOffset} oninput={(e) => updateCfg('trailOffset', +e.currentTarget.value)} class="w-20 terminal-input font-mono text-2xs py-1 px-1.5 text-right" step="0.1" />
				</label>
			</div>
		{/if}

		{#if $orderType === 'maker'}
			<div class="bg-terminal-bg rounded p-2 space-y-1.5">
				<span class="text-3xs text-terminal-text-muted uppercase">Maker routing</span>
				<label class="flex items-center justify-between text-2xs"><span class="text-terminal-text-secondary">Book offset (ticks)</span><input data-action-id="ui.src.lib.components.orderticket.input.h686addc33c" type="number" value={$advancedConfig.makerOffsetTicks ?? 0} oninput={(e) => updateCfg('makerOffsetTicks', +e.currentTarget.value)} class="w-20 terminal-input text-2xs py-1 px-1.5 text-right" min="0" step="1" /></label>
			</div>
		{/if}

		{#if $orderType === 'conditional_ladder'}
			<div class="bg-terminal-bg rounded p-2 space-y-1.5">
				<span class="text-3xs text-terminal-text-muted uppercase">Conditional ladder</span>
				{#if ($advancedConfig.conditionalTriggerSource ?? 'priceCross') !== 'time'}
					<label class="flex items-center justify-between text-2xs"><span class="text-terminal-text-secondary">Trigger kind</span><select data-action-id="ui.src.lib.components.orderticket.select.hcfdab1e3b5" value={$advancedConfig.conditionalTriggerKind ?? 'stop'} onchange={(e) => updateCfg('conditionalTriggerKind', e.currentTarget.value as 'stop' | 'takeProfit')} class="terminal-input text-2xs py-1 px-1.5"><option value="stop">Stop</option><option value="takeProfit">Take profit</option></select></label>
				{/if}
				<label class="flex items-center justify-between text-2xs"><span class="text-terminal-text-secondary">Trigger source</span><select data-action-id="ui.src.lib.components.orderticket.select.he917adcc63" value={$advancedConfig.conditionalTriggerSource ?? 'priceCross'} onchange={(e) => updateCfg('conditionalTriggerSource', e.currentTarget.value)} class="terminal-input text-2xs py-1 px-1.5"><option value="priceCross">Live price cross</option><option value="candleClose">Completed candle close</option><option value="candleVolume">Completed candle volume</option><option value="time">Local time</option><option value="syntheticPair">Synthetic pair</option></select></label>
				{#if ($advancedConfig.conditionalTriggerSource ?? 'priceCross') === 'candleClose' || ($advancedConfig.conditionalTriggerSource ?? 'priceCross') === 'candleVolume'}
					<label class="flex items-center justify-between text-2xs"><span class="text-terminal-text-secondary">Candle interval</span><select data-action-id="ui.src.lib.components.orderticket.select.h42d329838d" value={$advancedConfig.conditionalTriggerInterval ?? $chartTimeframe} onchange={(e) => updateCfg('conditionalTriggerInterval', e.currentTarget.value as '1m' | '5m' | '15m' | '1h' | '4h' | '1D')} class="terminal-input text-2xs py-1 px-1.5"><option value="1m">1m</option><option value="5m">5m</option><option value="15m">15m</option><option value="1h">1h</option><option value="4h">4h</option><option value="1D">1D</option></select></label>
				{/if}
				{#if ($advancedConfig.conditionalTriggerSource ?? 'priceCross') === 'time'}
					<label class="flex items-center justify-between text-2xs"><span class="text-terminal-text-secondary">Local fire time</span><input data-action-id="ui.src.lib.components.orderticket.input.had97eee9aa" aria-label="Conditional ladder local fire time" type="datetime-local" value={localDateTimeInput($advancedConfig.conditionalTriggerAtMs)} onchange={(e) => updateCfg('conditionalTriggerAtMs', new Date(e.currentTarget.value).getTime())} class="terminal-input text-2xs py-1 px-1.5" /></label>
				{:else}
					{#if ($advancedConfig.conditionalTriggerSource ?? 'priceCross') === 'syntheticPair'}
						<label class="flex items-center justify-between text-2xs"><span class="text-terminal-text-secondary">Reference market</span><input data-action-id="ui.src.lib.components.orderticket.input.h1a9f63d7ef" aria-label="Conditional pair reference market" list="conditional-pair-markets" value={$advancedConfig.conditionalPairMarketKey ?? ''} onchange={(e) => updateCfg('conditionalPairMarketKey', e.currentTarget.value)} class="w-40 terminal-input text-2xs py-1 px-1.5" placeholder="Exact market key" /><datalist id="conditional-pair-markets">{#each $marketRegistry.filter((market) => market.marketKey !== $selectedMarket?.marketKey) as market (market.marketKey)}<option value={market.marketKey}>{market.apiCoin}</option>{/each}</datalist></label>
						<label class="flex items-center justify-between text-2xs"><span class="text-terminal-text-secondary">Pair operation</span><select data-action-id="ui.src.lib.components.orderticket.select.h53287fab3f" value={$advancedConfig.conditionalPairOperation ?? 'ratio'} onchange={(e) => updateCfg('conditionalPairOperation', e.currentTarget.value)} class="terminal-input text-2xs py-1 px-1.5"><option value="ratio">Left / reference</option><option value="spread">Left − reference</option></select></label>
					{/if}
					<label class="flex items-center justify-between text-2xs"><span class="text-terminal-text-secondary">{($advancedConfig.conditionalTriggerSource ?? 'priceCross') === 'candleVolume' ? 'Trigger volume' : ($advancedConfig.conditionalTriggerSource ?? 'priceCross') === 'candleClose' ? 'Trigger close' : ($advancedConfig.conditionalTriggerSource ?? 'priceCross') === 'syntheticPair' ? 'Pair threshold' : 'Trigger price'}</span><input data-action-id="ui.src.lib.components.orderticket.input.h8026870423" type="number" value={$advancedConfig.conditionalTriggerPrice ?? 0} oninput={(e) => updateCfg('conditionalTriggerPrice', +e.currentTarget.value)} onfocus={() => focusChartField('trigger')} onblur={blurChartField} class="w-24 terminal-input text-2xs py-1 px-1.5 text-right" step="0.1" /></label>
				{/if}
				<label class="flex items-center justify-between text-2xs"><span class="text-terminal-text-secondary">Start price</span><input data-action-id="ui.src.lib.components.orderticket.input.hf81c653d39" type="number" value={$advancedConfig.scaleStartPrice ?? 0} oninput={(e) => updateCfg('scaleStartPrice', +e.currentTarget.value)} class="w-24 terminal-input text-2xs py-1 px-1.5 text-right" step="0.1" /></label>
				<label class="flex items-center justify-between text-2xs"><span class="text-terminal-text-secondary">End price</span><input data-action-id="ui.src.lib.components.orderticket.input.h658a0f11c6" type="number" value={$advancedConfig.scaleEndPrice ?? 0} oninput={(e) => updateCfg('scaleEndPrice', +e.currentTarget.value)} class="w-24 terminal-input text-2xs py-1 px-1.5 text-right" step="0.1" /></label>
				<label class="flex items-center justify-between text-2xs"><span class="text-terminal-text-secondary">Levels</span><input data-action-id="ui.src.lib.components.orderticket.input.hfefd50d607" type="number" value={$advancedConfig.scaleLevels ?? 5} oninput={(e) => updateCfg('scaleLevels', +e.currentTarget.value)} class="w-20 terminal-input text-2xs py-1 px-1.5 text-right" min="2" max="100" /></label>
			</div>
		{/if}

		{#if $orderType === 'bracket' || $orderType === 'oco'}
			<div class="bg-terminal-bg rounded p-2 space-y-1.5">
				<span class="text-3xs text-terminal-text-muted uppercase">{$orderType === 'bracket' ? 'Bracket' : 'OCO'} Levels</span>
				<label class="flex items-center justify-between text-2xs">
					<span class="text-terminal-green">Take profit</span>
					<input data-action-id="ui.src.lib.components.orderticket.input.ha3e6beeb5a" type="number" value={$advancedConfig.takeProfit} oninput={(e) => updateCfg('takeProfit', +e.currentTarget.value)} onfocus={() => focusChartField('takeProfit')} onblur={blurChartField} class="w-24 terminal-input font-mono text-2xs py-1 px-1.5 text-right" step="0.1" />
				</label>
				<label class="flex items-center justify-between text-2xs">
					<span class="text-terminal-red">Stop loss</span>
					<input data-action-id="ui.src.lib.components.orderticket.input.h6ed726d2d8" type="number" value={$advancedConfig.stopLoss} oninput={(e) => updateCfg('stopLoss', +e.currentTarget.value)} onfocus={() => focusChartField('stopLoss')} onblur={blurChartField} class="w-24 terminal-input font-mono text-2xs py-1 px-1.5 text-right" step="0.1" />
				</label>
				<div class="flex items-center gap-1 pt-1">
					<input data-action-id="ui.src.lib.components.orderticket.input.h3c1f61556e" type="number" bind:value={$chartRiskPercent} min="0.1" max="100" step="0.1" class="w-16 terminal-input text-2xs py-1" />
					<span class="text-3xs text-terminal-text-muted">% equity risk</span>
					<button data-action-id="ui.src.lib.components.orderticket.button.h880fcab698" class="ml-auto px-2 py-1 text-3xs rounded bg-terminal-cyan/15 text-terminal-cyan" onclick={applyRiskSize}>Size</button>
				</div>
			</div>
		{/if}

		{#if !['twap', 'adaptive_twap', 'vwap', 'pov', 'scale', 'conditional_ladder', 'oco', 'trailing_stop', 'break_even', 'maker', 'chase', 'swarm', 'iceberg', 'ping_pong'].includes($orderType)}
			<div class="bg-terminal-bg rounded p-2 space-y-1.5">
				<label class="flex items-center gap-2 text-2xs text-terminal-text-secondary"><input data-action-id="ui.src.lib.components.orderticket.input.he7bd18cc61" type="checkbox" checked={$advancedConfig.autoTakeProfitEnabled ?? false} onchange={(event) => updateCfg('autoTakeProfitEnabled', event.currentTarget.checked)} class="accent-terminal-green" /><span>Auto take-profit with reduce-only Scale</span></label>
				{#if $advancedConfig.autoTakeProfitEnabled}
					<label class="flex items-center justify-between text-2xs"><span class="text-terminal-text-secondary">Start price</span><input data-action-id="ui.src.lib.components.orderticket.input.h432ec94ce5" type="number" value={$advancedConfig.autoTakeProfitStartPrice ?? 0} oninput={(event) => updateCfg('autoTakeProfitStartPrice', +event.currentTarget.value)} class="w-24 terminal-input text-2xs py-1 px-1.5 text-right" step="0.1" /></label>
					<label class="flex items-center justify-between text-2xs"><span class="text-terminal-text-secondary">End price</span><input data-action-id="ui.src.lib.components.orderticket.input.h06b376128d" type="number" value={$advancedConfig.autoTakeProfitEndPrice ?? 0} oninput={(event) => updateCfg('autoTakeProfitEndPrice', +event.currentTarget.value)} class="w-24 terminal-input text-2xs py-1 px-1.5 text-right" step="0.1" /></label>
					<label class="flex items-center justify-between text-2xs"><span class="text-terminal-text-secondary">Levels</span><input data-action-id="ui.src.lib.components.orderticket.input.hd10325bc25" type="number" value={$advancedConfig.autoTakeProfitLevels ?? 3} oninput={(event) => updateCfg('autoTakeProfitLevels', +event.currentTarget.value)} class="w-20 terminal-input text-2xs py-1 px-1.5 text-right" min="2" max="100" /></label>
					<p class="text-3xs text-terminal-text-muted">Entry is blocked if the requested range is not profitable. Scale orders still use the same execution-boundary risk and market checks as every other order.</p>
				{/if}
			</div>
		{/if}

		{#if volatilitySizingCertified()}
			<div class="bg-terminal-bg rounded p-2 space-y-1.5">
				<span class="text-3xs text-terminal-text-muted uppercase">Volatility sizing</span>
				<label class="flex items-center justify-between text-2xs"><span class="text-terminal-text-secondary">ATR lookback</span><input data-action-id="ui.src.lib.components.orderticket.input.hb087c77e76" type="number" value={$advancedConfig.volatilityLookback ?? 20} oninput={(e) => updateCfg('volatilityLookback', +e.currentTarget.value)} class="w-20 terminal-input text-2xs py-1 px-1.5 text-right" min="2" max="200" /></label>
				<label class="flex items-center justify-between text-2xs"><span class="text-terminal-text-secondary">Stop ATR multiplier</span><input data-action-id="ui.src.lib.components.orderticket.input.h48ceb574f6" type="number" value={$advancedConfig.volatilityMultiplier ?? 2} oninput={(e) => updateCfg('volatilityMultiplier', +e.currentTarget.value)} class="w-20 terminal-input text-2xs py-1 px-1.5 text-right" min="0.1" step="0.1" /></label>
				<button data-action-id="ui.src.lib.components.orderticket.button.h8af072fb0e" class="w-full px-2 py-1 text-3xs rounded bg-terminal-cyan/15 text-terminal-cyan" onclick={applyVolatilitySize}>Size from live ATR</button>
			</div>
		{/if}

		{#if $orderType === 'twap'}
			<div class="bg-terminal-bg rounded p-2 space-y-1.5">
				<span class="text-3xs text-terminal-text-muted uppercase">TWAP Schedule</span>
				<label class="flex items-center justify-between text-2xs">
					<span class="text-terminal-text-secondary">Duration (min)</span>
					<input data-action-id="ui.src.lib.components.orderticket.input.h2c5c127c72" type="number" value={$advancedConfig.twapDuration} oninput={(e) => updateCfg('twapDuration', +e.currentTarget.value)} class="w-20 terminal-input font-mono text-2xs py-1 px-1.5 text-right" />
				</label>
				<label class="flex items-center justify-between text-2xs">
					<span class="text-terminal-text-secondary">Intervals</span>
					<input data-action-id="ui.src.lib.components.orderticket.input.h67c1435a00" type="number" value={$advancedConfig.twapIntervals} oninput={(e) => updateCfg('twapIntervals', +e.currentTarget.value)} class="w-20 terminal-input font-mono text-2xs py-1 px-1.5 text-right" />
				</label>
				<label class="flex items-center justify-between text-2xs cursor-pointer">
					<span class="text-terminal-text-secondary">Randomize timing</span>
					<input data-action-id="ui.src.lib.components.orderticket.input.h696776873a" type="checkbox" checked={$advancedConfig.twapRandomize} onchange={(e) => updateCfg('twapRandomize', e.currentTarget.checked)} class="w-3 h-3 accent-terminal-cyan" />
				</label>
			</div>
		{/if}

		{#if $orderType === 'adaptive_twap' || $orderType === 'vwap'}
			<div class="bg-terminal-bg rounded p-2 space-y-1.5">
				<span class="text-3xs text-terminal-text-muted uppercase">{$orderType === 'vwap' ? 'VWAP Schedule' : 'Adaptive TWAP Schedule'}</span>
				<label class="flex items-center justify-between text-2xs"><span class="text-terminal-text-secondary">Duration (min)</span><input data-action-id="ui.src.lib.components.orderticket.input.h58fb334539" type="number" value={$advancedConfig.adaptiveDuration ?? 30} oninput={(e) => updateCfg('adaptiveDuration', +e.currentTarget.value)} class="w-20 terminal-input text-2xs py-1 px-1.5 text-right" min="1" max="1440" /></label>
				<label class="flex items-center justify-between text-2xs"><span class="text-terminal-text-secondary">Intervals</span><input data-action-id="ui.src.lib.components.orderticket.input.h1d06867f5a" type="number" value={$advancedConfig.adaptiveIntervals ?? 10} oninput={(e) => updateCfg('adaptiveIntervals', +e.currentTarget.value)} class="w-20 terminal-input text-2xs py-1 px-1.5 text-right" min="2" max="100" /></label>
				<label class="flex items-center justify-between text-2xs"><span class="text-terminal-text-secondary">Participation</span><input data-action-id="ui.src.lib.components.orderticket.input.hc7612f587d" type="number" value={$advancedConfig.adaptiveParticipation ?? 0.1} oninput={(e) => updateCfg('adaptiveParticipation', +e.currentTarget.value)} class="w-20 terminal-input text-2xs py-1 px-1.5 text-right" min="0.01" max="1" step="0.01" /></label>
				<label class="flex items-center justify-between text-2xs"><span class="text-terminal-text-secondary">Book offset (ticks)</span><input data-action-id="ui.src.lib.components.orderticket.input.h01619d1d53" type="number" value={$advancedConfig.adaptiveOffsetTicks ?? 1} oninput={(e) => updateCfg('adaptiveOffsetTicks', +e.currentTarget.value)} class="w-20 terminal-input text-2xs py-1 px-1.5 text-right" min="0" /></label>
			</div>
		{/if}

		{#if $orderType === 'pov'}
			<div class="bg-terminal-bg rounded p-2 space-y-1.5">
				<span class="text-3xs text-terminal-text-muted uppercase">Participation of Volume</span>
				<label class="flex items-center justify-between text-2xs"><span class="text-terminal-text-secondary">Duration (min)</span><input data-action-id="ui.src.lib.components.orderticket.input.he87862b8a9" type="number" value={$advancedConfig.adaptiveDuration ?? 30} oninput={(e) => updateCfg('adaptiveDuration', +e.currentTarget.value)} class="w-20 terminal-input text-2xs py-1 px-1.5 text-right" min="1" max="1440" /></label>
				<label class="flex items-center justify-between text-2xs"><span class="text-terminal-text-secondary">Participation</span><input data-action-id="ui.src.lib.components.orderticket.input.h518d5cb609" type="number" value={$advancedConfig.povParticipation ?? 0.1} oninput={(e) => updateCfg('povParticipation', +e.currentTarget.value)} class="w-20 terminal-input text-2xs py-1 px-1.5 text-right" min="0.01" max="1" step="0.01" /></label>
				<label class="flex items-center justify-between text-2xs"><span class="text-terminal-text-secondary">Trade window</span><input data-action-id="ui.src.lib.components.orderticket.input.h517c5a483c" type="number" value={$advancedConfig.povWindowTrades ?? 20} oninput={(e) => updateCfg('povWindowTrades', +e.currentTarget.value)} class="w-20 terminal-input text-2xs py-1 px-1.5 text-right" min="1" max="200" /></label>
				<p class="text-3xs text-terminal-text-muted">Children wait when public volume is insufficient.</p>
			</div>
		{/if}

		{#if $orderType === 'break_even'}
			<div class="bg-terminal-bg rounded p-2 space-y-1.5">
				<span class="text-3xs text-terminal-text-muted uppercase">Break-even protection</span>
				<label class="flex items-center justify-between text-2xs"><span class="text-terminal-text-secondary">Trigger distance</span><input data-action-id="ui.src.lib.components.orderticket.input.h03a8b51df9" type="number" value={$advancedConfig.breakEvenTrigger ?? 0} oninput={(e) => updateCfg('breakEvenTrigger', +e.currentTarget.value)} class="w-20 terminal-input text-2xs py-1 px-1.5 text-right" min="0.00000001" step="0.1" /></label>
				<label class="flex items-center justify-between text-2xs"><span class="text-terminal-text-secondary">Entry offset</span><input data-action-id="ui.src.lib.components.orderticket.input.h06a78dbec8" type="number" value={$advancedConfig.breakEvenOffset ?? 0} oninput={(e) => updateCfg('breakEvenOffset', +e.currentTarget.value)} class="w-20 terminal-input text-2xs py-1 px-1.5 text-right" min="0" step="0.1" /></label>
				<label class="flex items-center gap-2 text-2xs text-terminal-text-secondary"><input data-action-id="ui.src.lib.components.orderticket.input.h4df9c435a5" type="checkbox" checked={$advancedConfig.deadmanEnabled ?? false} onchange={(e) => updateCfg('deadmanEnabled', e.currentTarget.checked)} class="accent-terminal-red" /><span>Arm account-wide dead-man switch</span></label>
			</div>
		{/if}

		{#if $orderType === 'scale'}
			<div class="bg-terminal-bg rounded p-2 space-y-1.5">
				<span class="text-3xs text-terminal-text-muted uppercase">Scale Ladder</span>
				<label class="flex items-center justify-between text-2xs">
					<span class="text-terminal-text-secondary">Order count</span>
					<input data-action-id="ui.src.lib.components.orderticket.input.h66739022dc" type="number" value={$advancedConfig.scaleLevels} oninput={(e) => updateCfg('scaleLevels', +e.currentTarget.value)} class="w-20 terminal-input font-mono text-2xs py-1 px-1.5 text-right" />
				</label>
				<label class="flex items-center justify-between text-2xs">
					<span class="text-terminal-text-secondary">Start price</span>
					<input data-action-id="ui.src.lib.components.orderticket.input.h6fbc7790b2" type="number" value={$advancedConfig.scaleStartPrice} oninput={(e) => updateCfg('scaleStartPrice', +e.currentTarget.value)} onfocus={() => focusChartField('scaleStart')} onblur={blurChartField} class="w-24 terminal-input font-mono text-2xs py-1 px-1.5 text-right" step="0.1" />
				</label>
				<label class="flex items-center justify-between text-2xs">
					<span class="text-terminal-text-secondary">End price</span>
					<input data-action-id="ui.src.lib.components.orderticket.input.h15ecd45132" type="number" value={$advancedConfig.scaleEndPrice} oninput={(e) => updateCfg('scaleEndPrice', +e.currentTarget.value)} onfocus={() => focusChartField('scaleEnd')} onblur={blurChartField} class="w-24 terminal-input font-mono text-2xs py-1 px-1.5 text-right" step="0.1" />
				</label>
				<label class="flex items-center justify-between text-2xs">
					<span class="text-terminal-text-secondary">Size skew</span>
					<input data-action-id="ui.src.lib.components.orderticket.input.h08a4ff5956" type="number" value={$advancedConfig.scaleSkew} oninput={(e) => updateCfg('scaleSkew', +e.currentTarget.value)} class="w-20 terminal-input font-mono text-2xs py-1 px-1.5 text-right" step="0.1" />
				</label>
			</div>
		{/if}

		{#if $orderType === 'iceberg'}
			<div class="bg-terminal-bg rounded p-2 space-y-1.5">
				<span class="text-3xs text-terminal-text-muted uppercase">Iceberg</span>
				<label class="flex items-center justify-between text-2xs">
					<span class="text-terminal-text-secondary">Display size ({baseAsset})</span>
					<input data-action-id="ui.src.lib.components.orderticket.input.h9245e28e53" type="number" value={$advancedConfig.icebergDisplaySize} oninput={(e) => updateCfg('icebergDisplaySize', +e.currentTarget.value)} class="w-20 terminal-input font-mono text-2xs py-1 px-1.5 text-right" step="0.01" />
				</label>
				<label class="flex items-center gap-1.5 cursor-pointer">
					<input data-action-id="ui.src.lib.components.orderticket.input.hc625e1303a"
						type="checkbox"
						checked={$advancedConfig.icebergWaitForFill ?? true}
						onchange={(e) => updateCfg('icebergWaitForFill', e.currentTarget.checked)}
						class="w-3 h-3 rounded border-terminal-border bg-terminal-bg accent-terminal-green"
					/>
					<span class="text-3xs text-terminal-text-secondary">Refill after fill</span>
				</label>
				{#if !($advancedConfig.icebergWaitForFill ?? true)}
					<label class="flex items-center justify-between text-2xs">
						<span class="text-terminal-text-secondary">Refill delay (ms)</span>
						<input data-action-id="ui.src.lib.components.orderticket.input.he355ff4e41" type="number" value={$advancedConfig.icebergRefillMs} oninput={(e) => updateCfg('icebergRefillMs', +e.currentTarget.value)} class="w-20 terminal-input font-mono text-2xs py-1 px-1.5 text-right" />
					</label>
				{/if}
			</div>
		{/if}

		{#if $orderType === 'chase'}
			<div class="bg-terminal-bg rounded p-2 space-y-1.5">
				<span class="text-3xs text-terminal-text-muted uppercase">Chase</span>
				<label class="flex items-center justify-between text-2xs">
					<span class="text-terminal-text-secondary">Offset (ticks)</span>
					<input data-action-id="ui.src.lib.components.orderticket.input.h8133fdd738" type="number" value={$advancedConfig.chaseOffset} oninput={(e) => updateCfg('chaseOffset', +e.currentTarget.value)} class="w-20 terminal-input font-mono text-2xs py-1 px-1.5 text-right" />
				</label>
				<label class="flex items-center justify-between text-2xs">
					<span class="text-terminal-text-secondary">Max chases</span>
					<input data-action-id="ui.src.lib.components.orderticket.input.hbe8222ee3b" type="number" value={$advancedConfig.chaseMaxChases} oninput={(e) => updateCfg('chaseMaxChases', +e.currentTarget.value)} class="w-20 terminal-input font-mono text-2xs py-1 px-1.5 text-right" />
				</label>
				<label class="flex items-center gap-2 text-2xs text-terminal-text-secondary">
					<input data-action-id="ui.src.lib.components.orderticket.input.hc0bbaa45fe" type="checkbox" checked={$advancedConfig.deadmanEnabled ?? false} onchange={(e) => updateCfg('deadmanEnabled', e.currentTarget.checked)} class="accent-terminal-red" />
					<span>Arm account-wide dead-man switch</span>
				</label>
				{#if $advancedConfig.deadmanEnabled}
					<label class="flex items-center justify-between text-2xs">
						<span class="text-terminal-text-secondary">Cancel-all timeout (ms)</span>
						<input data-action-id="ui.src.lib.components.orderticket.input.h71aea26fe3" type="number" min="5000" value={$advancedConfig.deadmanMs ?? 30000} oninput={(e) => updateCfg('deadmanMs', +e.currentTarget.value)} class="w-24 terminal-input font-mono text-2xs py-1 px-1.5 text-right" />
					</label>
					<p class="text-3xs text-terminal-red">Hyperliquid's switch cancels all account orders when it expires.</p>
				{/if}
			</div>
		{/if}

		{#if $orderType === 'swarm'}
			<div class="bg-terminal-bg rounded p-2 space-y-1.5">
				<span class="text-3xs text-terminal-text-muted uppercase">Swarm</span>
				<label class="flex items-center justify-between text-2xs">
					<span class="text-terminal-text-secondary">Order count</span>
					<input data-action-id="ui.src.lib.components.orderticket.input.hf39b4840bf" type="number" value={$advancedConfig.swarmOrders} oninput={(e) => updateCfg('swarmOrders', +e.currentTarget.value)} class="w-20 terminal-input font-mono text-2xs py-1 px-1.5 text-right" />
				</label>
				<label class="flex items-center justify-between text-2xs">
					<span class="text-terminal-text-secondary">Spread (%)</span>
					<input data-action-id="ui.src.lib.components.orderticket.input.ha1927b09af" type="number" value={$advancedConfig.swarmSpread} oninput={(e) => updateCfg('swarmSpread', +e.currentTarget.value)} class="w-20 terminal-input font-mono text-2xs py-1 px-1.5 text-right" step="0.1" />
				</label>
			</div>
		{/if}

		{#if $orderType === 'ping_pong'}
			<div class="bg-terminal-bg rounded p-2 space-y-1.5">
				<span class="text-3xs text-terminal-text-muted uppercase">Ping Pong</span>
				<label class="flex items-center justify-between text-2xs">
					<span class="text-terminal-text-secondary">Range (%)</span>
					<input data-action-id="ui.src.lib.components.orderticket.input.h9d8b95b713" type="number" value={$advancedConfig.pingPongRange} oninput={(e) => updateCfg('pingPongRange', +e.currentTarget.value)} class="w-20 terminal-input font-mono text-2xs py-1 px-1.5 text-right" step="0.1" />
				</label>
				<label class="flex items-center justify-between text-2xs">
					<span class="text-terminal-text-secondary">Cycles</span>
					<input data-action-id="ui.src.lib.components.orderticket.input.h7eea75b0a4" type="number" value={$advancedConfig.pingPongCycles} oninput={(e) => updateCfg('pingPongCycles', +e.currentTarget.value)} class="w-20 terminal-input font-mono text-2xs py-1 px-1.5 text-right" />
				</label>
			</div>
		{/if}

		{#if marketProfile.leverageEnabled}
<!-- Leverage Slider -->
		<div class="bg-terminal-bg rounded p-2">
			<div class="flex items-center justify-between mb-1.5">
				<span class="text-3xs text-terminal-text-muted">Leverage</span>
				<span class="text-3xs font-mono text-terminal-cyan">{$orderLeverage}x</span>
			</div>
			<input data-action-id="ui.src.lib.components.orderticket.input.h22cfd6fe44"
				type="range"
				bind:value={$orderLeverage}
				min="1"
				max={venueMaxLeverage}
				class="w-full h-1 bg-terminal-bg-tertiary rounded-lg appearance-none cursor-pointer
					   [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3
					   [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-terminal-green
					   [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
			/>
			<div class="flex justify-between text-3xs text-terminal-text-muted mt-1">
				<span>1x</span><span>10x</span><span>20x</span><span>50x</span><span>{venueMaxLeverage}x max</span>
			</div>
		</div>
		{/if}

		<!-- Order Options -->
		<div class="flex items-center gap-3 flex-wrap">
			{#if marketProfile.supportsReduceOnly}
			<label class="flex items-center gap-1.5 cursor-pointer">
				<input data-action-id="ui.src.lib.components.orderticket.input.hb813b84419" type="checkbox" bind:checked={$reduceOnly} class="w-3 h-3 rounded border-terminal-border bg-terminal-bg accent-terminal-green" />
				<span class="text-3xs text-terminal-text-secondary">Reduce Only</span>
			</label>
			{/if}
			{#if marketProfile.supportsPostOnly}
			<label class="flex items-center gap-1.5 cursor-pointer">
				<input data-action-id="ui.src.lib.components.orderticket.input.h7d79015ccc" type="checkbox" checked={$postOnly} onchange={(event) => setPostOnly(event.currentTarget.checked)} class="w-3 h-3 rounded border-terminal-border bg-terminal-bg accent-terminal-green" />
				<span class="text-3xs text-terminal-text-secondary">POST</span>
			</label>
			{/if}
			{#if marketProfile.supportsIoc}
			<label class="flex items-center gap-1.5 cursor-pointer">
				<input data-action-id="ui.src.lib.components.orderticket.input.h67777448a8" type="checkbox" checked={$ioc} onchange={(event) => setIoc(event.currentTarget.checked)} class="w-3 h-3 rounded border-terminal-border bg-terminal-bg accent-terminal-green" />
				<span class="text-3xs text-terminal-text-secondary">IOC</span>
			</label>
			{/if}
		</div>

		<!-- Summary -->
		<div class="space-y-1 text-2xs pt-1 border-t border-terminal-border/50">
			<div class="flex justify-between">
				<span class="text-terminal-text-muted">{marketProfile.usesMargin ? 'Notional Value' : `Order value (${quoteAsset})`}</span>
				<span class="font-mono">{$privacyMode ? '••••••' : `$${notionalValue.toFixed(2)}`}</span>
			</div>
			{#if marketProfile.usesMargin}
			<div class="flex justify-between">
				<span class="text-terminal-text-muted">Required Margin</span>
				<span class="font-mono">{$privacyMode ? '••••••' : `$${marginRequired.toFixed(2)}`}</span>
			</div>
			{/if}
			<div class="flex justify-between">
				<span class="text-terminal-text-muted">{marketProfile.usesMargin ? 'Available Margin' : `${quoteAsset} Balance`}</span>
				<span class="font-mono text-terminal-green">{$privacyMode ? '••••••' : `$${availableMargin.toLocaleString()}`}</span>
			</div>
		</div>


		<div class="mt-2 rounded bg-terminal-bg p-2 space-y-1.5">
			<span class="block text-3xs uppercase text-terminal-text-muted">Local risk limits</span>
			<label class="flex items-center justify-between gap-2 text-2xs">
				<span class="text-terminal-text-secondary">Max order (USD)</span>
				<input data-action-id="ui.src.lib.components.orderticket.input.h78d5935b89" aria-label="Maximum order notional" type="number" min="0" step="any" value={$fatFingerLimits.maxOrderNotional} oninput={(event) => setFatFingerLimit('order', event.currentTarget.value)} class="w-24 terminal-input font-mono text-2xs py-1 px-1.5 text-right" placeholder="Off" />
			</label>
			<label class="flex items-center justify-between gap-2 text-2xs">
				<span class="text-terminal-text-secondary">Max {$selectedMarket?.symbol ?? 'market'} position</span>
				<input data-action-id="ui.src.lib.components.orderticket.input.h475905b6d6" aria-label="Maximum position notional" type="number" min="0" step="any" value={$selectedMarket ? ($fatFingerLimits.maxPositionNotionalByMarket[$selectedMarket.marketKey] ?? '') : ''} oninput={(event) => setFatFingerLimit('position', event.currentTarget.value)} disabled={!$selectedMarket} class="w-24 terminal-input font-mono text-2xs py-1 px-1.5 text-right disabled:opacity-50" placeholder="Off" />
			</label>
			<p class="text-3xs text-terminal-text-muted">Saved on this device. Limits reject before signing.</p>
		</div>
		</details>
	</div>
	<!-- Submit -->
	<div class="p-2 border-t border-terminal-border flex-shrink-0 space-y-2">
		<PositionMarketActions />
		<div data-testid="order-persistence-class" class="mb-1.5 rounded border border-terminal-border/60 bg-terminal-bg-secondary px-2 py-1.5 text-3xs">
			<span class={persistence.local ? 'text-terminal-yellow' : 'text-terminal-cyan'}>{persistence.label}</span>
			<span class="text-terminal-text-muted"> · {persistence.detail}</span>
		</div>
		{#if tradingKillSwitchActive()}
			<p class="text-3xs text-terminal-red mb-1.5">{tradingKillSwitchMessage()}</p>
		{/if}
		{#if $isConnected && $executionStatus !== 'live'}
			<p class="text-3xs text-terminal-text-muted mb-1.5">
				Enable an encrypted, device-local Hyperliquid agent. The key never reaches Vice servers.
			</p>
			{#if enablePhase.kind === 'step'}
				<div
					data-testid="enablement-progress"
					role="status"
					aria-live="polite"
					aria-busy="true"
					class="mb-1.5 rounded border border-terminal-cyan/40 bg-terminal-cyan/5 px-2 py-1.5 text-3xs"
				>
					<div class="font-medium text-terminal-cyan">{enablementProgressLabel(enablePhase.step)}</div>
					<div class="mt-0.5 text-terminal-text-muted">{enablePhase.detail}</div>
					{#if enablementIsCancellable(enablePhase)}
						<button data-action-id="ui.src.lib.components.orderticket.button.h9cd5ffb282" class="mt-1.5 text-terminal-cyan hover:underline" onclick={dismissEnablement}>Cancel</button>
					{/if}
				</div>
			{:else if enablePhase.kind === 'error'}
				<div
					data-testid="enablement-error"
					role="alert"
					class="mb-1.5 rounded border border-terminal-red/40 bg-terminal-red/5 px-2 py-1.5 text-3xs"
				>
					<div class="font-medium text-terminal-red">{ENABLEMENT_ERROR_LABEL[enablePhase.error.kind]}</div>
					<div class="mt-0.5 text-terminal-text-muted">{enablePhase.error.message}</div>
					<div class="mt-1.5 flex items-center gap-1.5">
						{#if enablementIsRetryable(enablePhase)}
							<button data-action-id="ui.src.lib.components.orderticket.button.hd0b615625c"
								class="rounded border border-terminal-cyan/60 px-1.5 py-0.5 text-terminal-cyan hover:bg-terminal-cyan/10 disabled:opacity-50"
								disabled={!enableRetryAvailable}
								onclick={retryEnableSecureTrading}
							>
								{enableRetryAvailable ? 'Retry' : `Retry in ${enableCountdown}s`}
							</button>
						{/if}
						{#if enablePhase.error.message.includes('explicit takeover')}
							<button data-action-id="ui.src.lib.components.orderticket.button.h053953045e"
								class="rounded border border-terminal-yellow/60 px-1.5 py-0.5 text-terminal-yellow hover:bg-terminal-yellow/10"
								onclick={takeOverExpiredLease}
							>
								Take over after expiry
							</button>
						{/if}
						<button data-action-id="ui.src.lib.components.orderticket.button.h9653243098" class="rounded border border-terminal-border px-1.5 py-0.5 hover:bg-terminal-bg" onclick={dismissEnablement}>Dismiss</button>
					</div>
				</div>
			{/if}
		{/if}
		<button data-action-id="ui.src.lib.components.orderticket.button.heb1fe67786" data-testid="order-submit"
			class="w-full py-2.5 rounded font-medium text-sm transition-all active:scale-[0.98]
				   disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5
				   {$orderSide === 'buy'
					? 'bg-terminal-cyan text-terminal-bg hover:bg-terminal-cyan/90'
					: 'bg-terminal-red text-white hover:bg-terminal-red-dim'}"
			onclick={$isConnected && $executionStatus !== 'live' ? enableSecureTrading : submitOrder}
			disabled={submitting || !$isConnected || tradingKillSwitchActive() || enablePhase.kind === 'step' || ($executionStatus === 'live' && $orderSize === 0)}
		>
			<Zap class="w-3.5 h-3.5" />
			{!$isConnected
				? 'Connect to trade'
				: enablePhase.kind === 'step'
					? `Enabling… ${ENABLEMENT_STEP_LABEL[enablePhase.step]}`
					: submitting
						? 'Working…'
						: $executionStatus !== 'live'
							? 'Enable secure trading'
							: $orderSide === 'buy'
								? ($selectedMarket.kind === 'spot' ? 'Buy' : 'Buy / Long')
								: ($selectedMarket.kind === 'spot' ? 'Sell' : 'Sell / Short')} {baseAsset}
		</button>
	</div>
</div>
{/if}
