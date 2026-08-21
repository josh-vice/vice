<script lang="ts">
	import { selectedMarket, marketRegistry, orderSide, orderType, orderPrice, orderSize, orderLeverage, reduceOnly, postOnly, ioc, activeSubaccount, balances, advancedConfig, orderPresets, applyOrderPreset, saveOrderPreset, deleteOrderPreset, priceInputFocused, chartActiveField, chartDraft, chartRiskPercent, chartCandles, chartTimeframe, designerMode, isConnected, executionStatus, enableTrading, walletAddress, revenueSnapshot, revenueSyncStatus, setOrderSizePercent, fatFingerLimits, setFatFingerLimits } from '$lib/stores';
	import type { OrderSide, OrderType } from '$lib/types';
	import { Minus, Plus, Zap, ChevronDown } from 'lucide-svelte';
	import { placeOrder, startAlgoOrder, fetchOpenOrders } from '$lib/hl/orders';
	import { riskBasedSize } from '$lib/chart/tradingMath';
	import { volatilityBasedSize, volatilitySizingCertified } from '$lib/chart/volatilitySizing';
	import { builderRevenueEnabled, configuredBuilder, configuredReferralCode, referralConfigured, revenueDisclosure, orderTypeRevenueDisclosure } from '$lib/execution/revenueConfig';
	import { requestConfiguredReferral } from '$lib/execution/agentVault';
	import { advancedOrderTypes, isAdvancedOrderCertified, unavailableOrderTypeMessage } from '$lib/execution/capabilities';
	import { tradingKillSwitchActive, tradingKillSwitchMessage } from '$lib/execution/releaseSafety';
	import { privacyMode } from '$lib/privacyMode';
	import { onDestroy } from 'svelte';
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

	// Full Insilico-style order type catalog, grouped
	const orderTypeGroups: { group: string; types: { id: OrderType; label: string; desc: string }[] }[] = [
		{
			group: 'Basic',
			types: [
				{ id: 'limit', label: 'Limit', desc: 'Resting order at a set price' },
				{ id: 'market', label: 'Market', desc: 'Fill immediately at best price' }
			]
		},
		{
			group: 'Conditional',
			types: [
				{ id: 'stop', label: 'Stop Market', desc: 'Market order on trigger' },
				{ id: 'stop_limit', label: 'Stop Limit', desc: 'Limit order on trigger' },
				{ id: 'bracket', label: 'Bracket (TP/SL)', desc: 'Entry with take-profit & stop-loss' }
			]
		},
		{
			group: 'Advanced',
				types: [
					{ id: 'twap', label: 'Native TWAP', desc: 'Venue-managed slices over 5–1440 minutes' },
					{ id: 'adaptive_twap', label: 'Adaptive TWAP', desc: 'Local liquidity-aware slices with persisted reconciliation' },
					{ id: 'vwap', label: 'VWAP', desc: 'Local volume-weighted slices from live public trade flow' },
					{ id: 'pov', label: 'POV', desc: 'Participate at a capped fraction of observed public volume' },
					{ id: 'break_even', label: 'Break-even Stop', desc: 'Move protection to entry after a favorable move' },
					{ id: 'maker', label: 'Maker Route', desc: 'Post a non-crossing order at the live top of book' },
					{ id: 'conditional_ladder', label: 'Conditional Ladder', desc: 'Arm a scale ladder after a trigger price is reached' },
					{ id: 'scale', label: 'Scale / Ladder', desc: 'Atomic limit orders across a price range' },
				{ id: 'chase', label: 'Chase', desc: 'Reprice a post-only child toward the live book' },
				{ id: 'oco', label: 'OCO', desc: 'Take-profit and stop-loss children with sibling cancellation' },
				{ id: 'trailing_stop', label: 'Trailing Stop', desc: 'Move a trigger only as the favorable extreme improves' },
				{ id: 'iceberg', label: 'Iceberg', desc: 'Sequential display-size child orders' },
				{ id: 'swarm', label: 'Swarm', desc: 'Distributed post-only child ladder around a center price' },
				{ id: 'ping_pong', label: 'Ping-Pong', desc: 'Alternating post-only legs after authoritative fills' }
			]
		}
	];

	const sizePresets = [10, 25, 50, 75, 100];
	const quickTypes: { id: OrderType; label: string }[] = [
		{ id: 'limit', label: 'Limit' },
		{ id: 'market', label: 'Market' },
		{ id: 'stop', label: 'Stop' },
		{ id: 'bracket', label: 'TP/SL' }
	];
	const venueNativeOrderTypes = new Set<OrderType>(['limit', 'market', 'stop', 'stop_limit', 'bracket', 'twap']);

	function persistenceClass(type: OrderType): { label: string; detail: string; local: boolean } {
		if (venueNativeOrderTypes.has(type)) {
			return {
				label: 'Venue-native',
				detail: 'The venue manages this order after it is accepted. It can survive this browser closing.',
				local: false
			};
		}
		return {
			label: 'Device-local',
			detail: 'Vice persists and reconciles this job on this device. It does not run on Vice servers; reopening this device reconciles before resuming.',
			local: true
		};
	}

	let typeMenuOpen = false;
	let submitError = '';
	let submitting = false;
	let referralMessage = '';
	let referralConfirmOpen = false;
	let referralBusy = false;
	let builderOptIn = false;
	// Secure-trading enablement lifecycle (explicit state machine, not a spinner).
	let enablePhase: EnablementPhase = { kind: 'idle' };
	let enableRetryAvailable = true;
	let enableCountdown = 0;
	let enableRetryTimer: ReturnType<typeof setInterval> | null = null;

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
		stopEnableRetryTimer();
		enablePhase = { kind: 'idle' };
	}

	function retryEnableSecureTrading() {
		void enableSecureTrading();
	}

	onDestroy(stopEnableRetryTimer);
	let presetName = '';
	let presetMessage = '';
	let amountUnit: 'base' | 'quote' = 'base';

	// Keep the complete catalog discoverable. Certification is an execution gate,
	// never a reason to make an existing order type silently disappear.
	$: availableOrderTypeGroups = orderTypeGroups;
	$: availableQuickTypes = quickTypes.filter((type) => isAdvancedOrderCertified(type.id));
	$: uncertifiedAdvancedCount = advancedOrderTypes().filter((type) => !isAdvancedOrderCertified(type)).length;
	$: allTypes = availableOrderTypeGroups.flatMap((g) => g.types);
	$: currentType = allTypes.find((t) => t.id === $orderType) ?? allTypes[0];
	$: persistence = persistenceClass($orderType);
	$: needsPrice = !['market', 'twap', 'adaptive_twap', 'vwap', 'pov', 'break_even', 'maker', 'conditional_ladder', 'chase', 'swarm', 'ping_pong'].includes($orderType);
	$: needsTrigger = ['stop', 'stop_limit', 'trailing_stop'].includes($orderType);

	$: notionalValue = $orderSize * ($selectedMarket?.lastPrice || 0);
	$: amountInputValue = amountUnit === 'base' ? $orderSize : notionalValue;
	$: marginRequired = notionalValue / $orderLeverage;
	$: availableMargin = $selectedMarket?.kind === 'spot'
		? ($balances.find((balance) => balance.asset.toUpperCase() === ($selectedMarket?.quoteToken ?? '').toUpperCase())?.available ?? 0)
		: $activeSubaccount.marginFree;
	$: venueMaxLeverage = $selectedMarket?.kind === 'spot' ? 1 : ($selectedMarket?.maxLeverage ?? 100);
	$: if ($orderLeverage > venueMaxLeverage) orderLeverage.set(venueMaxLeverage);
	$: maxSize = (availableMargin * ($selectedMarket?.kind === 'spot' ? 1 : Math.min($orderLeverage, venueMaxLeverage))) / ($selectedMarket?.lastPrice || 1);
	$: baseAsset = $selectedMarket?.baseToken ?? 'Asset';

	async function requestReferral() {
		referralMessage = '';
		referralConfirmOpen = false;
		referralBusy = true;
		const provider = typeof window !== 'undefined' ? (window as any).ethereum : null;
		if (!provider || !$walletAddress) {
			referralMessage = 'Connect the wallet before requesting the optional referral.';
			referralBusy = false;
			return;
		}
		try {
			const result = await requestConfiguredReferral(provider, $walletAddress);
			referralMessage = result.message;
		} finally {
			referralBusy = false;
		}
	}

	function setSide(side: OrderSide) {
		orderSide.set(side);
	}
	function setPostOnly(value: boolean) {
		if (value && !['limit', 'scale', 'maker'].includes($orderType)) {
			postOnly.set(false);
			return;
		}
		postOnly.set(value);
		if (value) ioc.set(false);
	}
	function setIoc(value: boolean) {
		ioc.set(value);
		if (value) postOnly.set(false);
	}
	function pickType(id: OrderType) {
		if (!isAdvancedOrderCertified(id)) {
			submitError = unavailableOrderTypeMessage(id);
			return;
		}
		orderType.set(id);
		if (id === 'market') {
			postOnly.set(false);
			ioc.set(true);
		} else if (id === 'limit') {
			postOnly.set(true);
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
		submitting = true;
			const algoTypes: OrderType[] = ['twap', 'adaptive_twap', 'vwap', 'pov', 'break_even', 'maker', 'conditional_ladder', 'scale', 'chase', 'oco', 'trailing_stop', 'swarm', 'iceberg', 'ping_pong'];

		try {
			if (algoTypes.includes($orderType)) {
				const result = await startAlgoOrder({
					side: $orderSide,
					type: $orderType,
					size: $orderSize,
					price: $orderPrice ?? undefined,
					triggerPrice: $advancedConfig.triggerPrice,
					reduceOnly: $reduceOnly,
					postOnly: $postOnly,
				algo: { type: $orderType as 'twap' | 'adaptive_twap' | 'vwap' | 'pov' | 'break_even' | 'maker' | 'conditional_ladder' | 'scale' | 'chase' | 'oco' | 'trailing_stop' | 'swarm' | 'iceberg' | 'ping_pong', config: $advancedConfig as Record<string, unknown> }
				});
				if (!result.ok) submitError = result.error ?? 'Algo failed';
			} else {
				const result = await placeOrder({
					side: $orderSide,
					type: $orderType,
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
				if (!result.ok) {
					submitError = result.error ?? 'Order failed';
				} else {
					await fetchOpenOrders();
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
				{ approveBuilder: builderOptIn },
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

<div class="h-full flex flex-col bg-terminal-bg-panel">
	<!-- Buy/Sell Tabs -->
	<div class="grid grid-cols-2 border-b border-terminal-border flex-shrink-0">
		<button
			class="py-2 text-xs font-medium transition-colors
				   {$orderSide === 'buy'
					? 'bg-terminal-cyan/10 text-terminal-cyan border-b-2 border-terminal-cyan'
					: 'text-terminal-text-secondary hover:text-terminal-text'}"
			onclick={() => setSide('buy')}
		>
			Buy {baseAsset}
		</button>
		<button
			class="py-2 text-xs font-medium transition-colors
				   {$orderSide === 'sell'
					? 'bg-terminal-red/10 text-terminal-red border-b-2 border-terminal-red'
					: 'text-terminal-text-secondary hover:text-terminal-text'}"
			onclick={() => setSide('sell')}
		>
			Sell {baseAsset}
		</button>
	</div>

	<!-- Order Form -->
	<div class="flex-1 overflow-y-auto p-2.5 space-y-2.5 scrollbar-none">
		<div class="grid grid-cols-4 gap-1">
			{#each availableQuickTypes as quick}
				<button
					class="py-1.5 rounded text-2xs font-medium {$orderType === quick.id ? 'bg-terminal-cyan/15 text-terminal-cyan ring-1 ring-terminal-cyan/40' : 'bg-terminal-bg text-terminal-text-muted hover:text-terminal-text'}"
					onclick={() => pickType(quick.id)}
				>{quick.label}</button>
			{/each}
		</div>
		{#if uncertifiedAdvancedCount > 0}
			<div class="rounded border border-terminal-yellow/20 bg-terminal-yellow/5 px-2 py-1.5 text-3xs text-terminal-text-muted" data-testid="advanced-certification-status">
				{uncertifiedAdvancedCount} advanced strategies are listed in the order-type menu but locked pending funded-testnet lifecycle and reconnect certification.
			</div>
		{/if}

		<!-- Account-scoped order presets. Values are local UI intent only and are
		     revalidated by the execution boundary before signing. -->
		{#if $isConnected}
			<div class="rounded border border-terminal-border/60 bg-terminal-bg p-1.5 space-y-1">
				<div class="flex items-center gap-1">
					<select class="min-w-0 flex-1 terminal-input text-3xs py-1" value="" onchange={(event) => usePreset(event.currentTarget.value)}>
						<option value="">Load preset…</option>
						{#each $orderPresets as preset}
							<option value={preset.id}>{preset.name} · {preset.orderType}</option>
						{/each}
					</select>
					<input class="w-20 terminal-input text-3xs py-1 px-1" bind:value={presetName} maxlength="40" placeholder="Name" aria-label="Preset name" />
					<button class="px-1.5 py-1 rounded bg-terminal-cyan/15 text-terminal-cyan text-3xs" onclick={savePreset} disabled={!presetName.trim()}>Save</button>
				</div>
				{#if $orderPresets.length > 0}
					<div class="flex gap-1 overflow-x-auto scrollbar-none">
						{#each $orderPresets.slice(0, 4) as preset}
							<button class="shrink-0 text-3xs text-terminal-text-muted hover:text-terminal-text" title="Delete preset" onclick={() => deleteOrderPreset(preset.id)}>{preset.name} ×</button>
						{/each}
					</div>
				{/if}
				{#if presetMessage}<div class="text-3xs text-terminal-text-muted">{presetMessage}</div>{/if}
			</div>
		{/if}
		<!-- Order Type Selector (custom dropdown for grouping + descriptions) -->
		<div class="relative">
			<button
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
							<button
								class="w-full text-left px-2.5 py-1.5 transition-colors flex flex-col
									   {certified ? 'hover:bg-terminal-bg-hover' : 'cursor-not-allowed opacity-60'}
									   {t.id === $orderType ? 'bg-terminal-cyan/10' : ''}"
								onclick={() => pickType(t.id)}
								disabled={!certified}
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
					<button class="px-1.5 py-0.5 text-3xs rounded {amountUnit === 'base' ? 'bg-terminal-bg-tertiary text-terminal-text' : 'text-terminal-text-muted hover:text-terminal-text'}" onclick={() => setAmountUnit('base')}>{baseAsset}</button>
					<button class="px-1.5 py-0.5 text-3xs rounded {amountUnit === 'quote' ? 'bg-terminal-bg-tertiary text-terminal-text' : 'text-terminal-text-muted hover:text-terminal-text'}" onclick={() => setAmountUnit('quote')}>USD</button>
				</div>
			</div>
			<div class="flex items-center gap-1">
				<button
					class="p-1.5 bg-terminal-bg rounded hover:bg-terminal-bg-hover transition-colors"
					onclick={() => orderSize.update((s) => Math.max(0, s - 0.01))}
				>
					<Minus class="w-3 h-3 text-terminal-text-muted" />
				</button>
				<input
					type="number"
					value={amountInputValue}
					oninput={(event) => setAmountInput(Number(event.currentTarget.value))}
					class="flex-1 terminal-input text-center font-mono text-xs py-1.5"
					step={amountUnit === 'base' ? '0.001' : '0.01'}
					min="0"
					placeholder="0"
				/>
				<button
					class="p-1.5 bg-terminal-bg rounded hover:bg-terminal-bg-hover transition-colors"
					onclick={() => orderSize.update((s) => s + 0.01)}
				>
					<Plus class="w-3 h-3 text-terminal-text-muted" />
				</button>
			</div>
			<div class="flex gap-0.5 mt-1">
				{#each sizePresets as preset}
					<button
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
					<button class="p-1.5 bg-terminal-bg rounded hover:bg-terminal-bg-hover transition-colors" onclick={() => orderPrice.update((p) => (p || 0) - 1)}>
						<Minus class="w-3 h-3 text-terminal-text-muted" />
					</button>
					<input
						type="number"
						bind:value={$orderPrice}
						onfocus={() => focusChartField('entry')}
						onblur={blurChartField}
						class="flex-1 terminal-input text-center font-mono text-xs py-1.5"
						step="0.1"
						placeholder="0.00"
					/>
					<button class="p-1.5 bg-terminal-bg rounded hover:bg-terminal-bg-hover transition-colors" onclick={() => orderPrice.update((p) => (p || 0) + 1)}>
						<Plus class="w-3 h-3 text-terminal-text-muted" />
					</button>
				</div>
			</div>
		{/if}

		<!-- Trigger price for stops -->
		{#if needsTrigger}
			<div>
				<span class="text-3xs text-terminal-text-muted block mb-1">Trigger price</span>
				<input
					type="number"
					value={$advancedConfig.triggerPrice}
					oninput={(event) => updateCfg('triggerPrice', +event.currentTarget.value)}
					onfocus={() => focusChartField('trigger')}
					onblur={blurChartField}
					class="w-full terminal-input font-mono text-xs py-1.5 px-2"
					step="0.1"
					placeholder="Click chart"
				/>
			</div>
		{/if}

		<!-- ===== Advanced parameter blocks ===== -->
		{#if $orderType === 'trailing_stop'}
			<div class="bg-terminal-bg rounded p-2 space-y-1.5">
				<span class="text-3xs text-terminal-text-muted uppercase">Trailing Stop</span>
				<label class="flex items-center justify-between text-2xs">
					<span class="text-terminal-text-secondary">Trail offset (%)</span>
					<input type="number" value={$advancedConfig.trailOffset} oninput={(e) => updateCfg('trailOffset', +e.currentTarget.value)} class="w-20 terminal-input font-mono text-2xs py-1 px-1.5 text-right" step="0.1" />
				</label>
			</div>
		{/if}

		{#if $orderType === 'maker'}
			<div class="bg-terminal-bg rounded p-2 space-y-1.5">
				<span class="text-3xs text-terminal-text-muted uppercase">Maker routing</span>
				<label class="flex items-center justify-between text-2xs"><span class="text-terminal-text-secondary">Book offset (ticks)</span><input type="number" value={$advancedConfig.makerOffsetTicks ?? 0} oninput={(e) => updateCfg('makerOffsetTicks', +e.currentTarget.value)} class="w-20 terminal-input text-2xs py-1 px-1.5 text-right" min="0" step="1" /></label>
			</div>
		{/if}

		{#if $orderType === 'conditional_ladder'}
			<div class="bg-terminal-bg rounded p-2 space-y-1.5">
				<span class="text-3xs text-terminal-text-muted uppercase">Conditional ladder</span>
				{#if ($advancedConfig.conditionalTriggerSource ?? 'priceCross') !== 'time'}
					<label class="flex items-center justify-between text-2xs"><span class="text-terminal-text-secondary">Trigger kind</span><select value={$advancedConfig.conditionalTriggerKind ?? 'stop'} onchange={(e) => updateCfg('conditionalTriggerKind', e.currentTarget.value as 'stop' | 'takeProfit')} class="terminal-input text-2xs py-1 px-1.5"><option value="stop">Stop</option><option value="takeProfit">Take profit</option></select></label>
				{/if}
				<label class="flex items-center justify-between text-2xs"><span class="text-terminal-text-secondary">Trigger source</span><select value={$advancedConfig.conditionalTriggerSource ?? 'priceCross'} onchange={(e) => updateCfg('conditionalTriggerSource', e.currentTarget.value)} class="terminal-input text-2xs py-1 px-1.5"><option value="priceCross">Live price cross</option><option value="candleClose">Completed candle close</option><option value="candleVolume">Completed candle volume</option><option value="time">Local time</option><option value="syntheticPair">Synthetic pair</option></select></label>
				{#if ($advancedConfig.conditionalTriggerSource ?? 'priceCross') === 'candleClose' || ($advancedConfig.conditionalTriggerSource ?? 'priceCross') === 'candleVolume'}
					<label class="flex items-center justify-between text-2xs"><span class="text-terminal-text-secondary">Candle interval</span><select value={$advancedConfig.conditionalTriggerInterval ?? $chartTimeframe} onchange={(e) => updateCfg('conditionalTriggerInterval', e.currentTarget.value as '1m' | '5m' | '15m' | '1h' | '4h' | '1D')} class="terminal-input text-2xs py-1 px-1.5"><option value="1m">1m</option><option value="5m">5m</option><option value="15m">15m</option><option value="1h">1h</option><option value="4h">4h</option><option value="1D">1D</option></select></label>
				{/if}
				{#if ($advancedConfig.conditionalTriggerSource ?? 'priceCross') === 'time'}
					<label class="flex items-center justify-between text-2xs"><span class="text-terminal-text-secondary">Local fire time</span><input aria-label="Conditional ladder local fire time" type="datetime-local" value={localDateTimeInput($advancedConfig.conditionalTriggerAtMs)} onchange={(e) => updateCfg('conditionalTriggerAtMs', new Date(e.currentTarget.value).getTime())} class="terminal-input text-2xs py-1 px-1.5" /></label>
				{:else}
					{#if ($advancedConfig.conditionalTriggerSource ?? 'priceCross') === 'syntheticPair'}
						<label class="flex items-center justify-between text-2xs"><span class="text-terminal-text-secondary">Reference market</span><input aria-label="Conditional pair reference market" list="conditional-pair-markets" value={$advancedConfig.conditionalPairMarketKey ?? ''} onchange={(e) => updateCfg('conditionalPairMarketKey', e.currentTarget.value)} class="w-40 terminal-input text-2xs py-1 px-1.5" placeholder="Exact market key" /><datalist id="conditional-pair-markets">{#each $marketRegistry.filter((market) => market.marketKey !== $selectedMarket?.marketKey) as market (market.marketKey)}<option value={market.marketKey}>{market.apiCoin}</option>{/each}</datalist></label>
						<label class="flex items-center justify-between text-2xs"><span class="text-terminal-text-secondary">Pair operation</span><select value={$advancedConfig.conditionalPairOperation ?? 'ratio'} onchange={(e) => updateCfg('conditionalPairOperation', e.currentTarget.value)} class="terminal-input text-2xs py-1 px-1.5"><option value="ratio">Left / reference</option><option value="spread">Left − reference</option></select></label>
					{/if}
					<label class="flex items-center justify-between text-2xs"><span class="text-terminal-text-secondary">{($advancedConfig.conditionalTriggerSource ?? 'priceCross') === 'candleVolume' ? 'Trigger volume' : ($advancedConfig.conditionalTriggerSource ?? 'priceCross') === 'candleClose' ? 'Trigger close' : ($advancedConfig.conditionalTriggerSource ?? 'priceCross') === 'syntheticPair' ? 'Pair threshold' : 'Trigger price'}</span><input type="number" value={$advancedConfig.conditionalTriggerPrice ?? 0} oninput={(e) => updateCfg('conditionalTriggerPrice', +e.currentTarget.value)} onfocus={() => focusChartField('trigger')} onblur={blurChartField} class="w-24 terminal-input text-2xs py-1 px-1.5 text-right" step="0.1" /></label>
				{/if}
				<label class="flex items-center justify-between text-2xs"><span class="text-terminal-text-secondary">Start price</span><input type="number" value={$advancedConfig.scaleStartPrice ?? 0} oninput={(e) => updateCfg('scaleStartPrice', +e.currentTarget.value)} class="w-24 terminal-input text-2xs py-1 px-1.5 text-right" step="0.1" /></label>
				<label class="flex items-center justify-between text-2xs"><span class="text-terminal-text-secondary">End price</span><input type="number" value={$advancedConfig.scaleEndPrice ?? 0} oninput={(e) => updateCfg('scaleEndPrice', +e.currentTarget.value)} class="w-24 terminal-input text-2xs py-1 px-1.5 text-right" step="0.1" /></label>
				<label class="flex items-center justify-between text-2xs"><span class="text-terminal-text-secondary">Levels</span><input type="number" value={$advancedConfig.scaleLevels ?? 5} oninput={(e) => updateCfg('scaleLevels', +e.currentTarget.value)} class="w-20 terminal-input text-2xs py-1 px-1.5 text-right" min="2" max="100" /></label>
			</div>
		{/if}

		{#if $orderType === 'bracket' || $orderType === 'oco'}
			<div class="bg-terminal-bg rounded p-2 space-y-1.5">
				<span class="text-3xs text-terminal-text-muted uppercase">{$orderType === 'bracket' ? 'Bracket' : 'OCO'} Levels</span>
				<label class="flex items-center justify-between text-2xs">
					<span class="text-terminal-green">Take profit</span>
					<input type="number" value={$advancedConfig.takeProfit} oninput={(e) => updateCfg('takeProfit', +e.currentTarget.value)} onfocus={() => focusChartField('takeProfit')} onblur={blurChartField} class="w-24 terminal-input font-mono text-2xs py-1 px-1.5 text-right" step="0.1" />
				</label>
				<label class="flex items-center justify-between text-2xs">
					<span class="text-terminal-red">Stop loss</span>
					<input type="number" value={$advancedConfig.stopLoss} oninput={(e) => updateCfg('stopLoss', +e.currentTarget.value)} onfocus={() => focusChartField('stopLoss')} onblur={blurChartField} class="w-24 terminal-input font-mono text-2xs py-1 px-1.5 text-right" step="0.1" />
				</label>
				<div class="flex items-center gap-1 pt-1">
					<input type="number" bind:value={$chartRiskPercent} min="0.1" max="100" step="0.1" class="w-16 terminal-input text-2xs py-1" />
					<span class="text-3xs text-terminal-text-muted">% equity risk</span>
					<button class="ml-auto px-2 py-1 text-3xs rounded bg-terminal-cyan/15 text-terminal-cyan" onclick={applyRiskSize}>Size</button>
				</div>
			</div>
		{/if}

		{#if !['twap', 'adaptive_twap', 'vwap', 'pov', 'scale', 'conditional_ladder', 'oco', 'trailing_stop', 'break_even', 'maker', 'chase', 'swarm', 'iceberg', 'ping_pong'].includes($orderType)}
			<div class="bg-terminal-bg rounded p-2 space-y-1.5">
				<label class="flex items-center gap-2 text-2xs text-terminal-text-secondary"><input type="checkbox" checked={$advancedConfig.autoTakeProfitEnabled ?? false} onchange={(event) => updateCfg('autoTakeProfitEnabled', event.currentTarget.checked)} class="accent-terminal-green" /><span>Auto take-profit with reduce-only Scale</span></label>
				{#if $advancedConfig.autoTakeProfitEnabled}
					<label class="flex items-center justify-between text-2xs"><span class="text-terminal-text-secondary">Start price</span><input type="number" value={$advancedConfig.autoTakeProfitStartPrice ?? 0} oninput={(event) => updateCfg('autoTakeProfitStartPrice', +event.currentTarget.value)} class="w-24 terminal-input text-2xs py-1 px-1.5 text-right" step="0.1" /></label>
					<label class="flex items-center justify-between text-2xs"><span class="text-terminal-text-secondary">End price</span><input type="number" value={$advancedConfig.autoTakeProfitEndPrice ?? 0} oninput={(event) => updateCfg('autoTakeProfitEndPrice', +event.currentTarget.value)} class="w-24 terminal-input text-2xs py-1 px-1.5 text-right" step="0.1" /></label>
					<label class="flex items-center justify-between text-2xs"><span class="text-terminal-text-secondary">Levels</span><input type="number" value={$advancedConfig.autoTakeProfitLevels ?? 3} oninput={(event) => updateCfg('autoTakeProfitLevels', +event.currentTarget.value)} class="w-20 terminal-input text-2xs py-1 px-1.5 text-right" min="2" max="100" /></label>
					<p class="text-3xs text-terminal-text-muted">Entry is blocked if the requested range is not profitable. Scale still needs its own funded-testnet certification.</p>
				{/if}
			</div>
		{/if}

		{#if volatilitySizingCertified()}
			<div class="bg-terminal-bg rounded p-2 space-y-1.5">
				<span class="text-3xs text-terminal-text-muted uppercase">Volatility sizing</span>
				<label class="flex items-center justify-between text-2xs"><span class="text-terminal-text-secondary">ATR lookback</span><input type="number" value={$advancedConfig.volatilityLookback ?? 20} oninput={(e) => updateCfg('volatilityLookback', +e.currentTarget.value)} class="w-20 terminal-input text-2xs py-1 px-1.5 text-right" min="2" max="200" /></label>
				<label class="flex items-center justify-between text-2xs"><span class="text-terminal-text-secondary">Stop ATR multiplier</span><input type="number" value={$advancedConfig.volatilityMultiplier ?? 2} oninput={(e) => updateCfg('volatilityMultiplier', +e.currentTarget.value)} class="w-20 terminal-input text-2xs py-1 px-1.5 text-right" min="0.1" step="0.1" /></label>
				<button class="w-full px-2 py-1 text-3xs rounded bg-terminal-cyan/15 text-terminal-cyan" onclick={applyVolatilitySize}>Size from live ATR</button>
			</div>
		{/if}

		{#if $orderType === 'twap'}
			<div class="bg-terminal-bg rounded p-2 space-y-1.5">
				<span class="text-3xs text-terminal-text-muted uppercase">TWAP Schedule</span>
				<label class="flex items-center justify-between text-2xs">
					<span class="text-terminal-text-secondary">Duration (min)</span>
					<input type="number" value={$advancedConfig.twapDuration} oninput={(e) => updateCfg('twapDuration', +e.currentTarget.value)} class="w-20 terminal-input font-mono text-2xs py-1 px-1.5 text-right" />
				</label>
				<label class="flex items-center justify-between text-2xs">
					<span class="text-terminal-text-secondary">Intervals</span>
					<input type="number" value={$advancedConfig.twapIntervals} oninput={(e) => updateCfg('twapIntervals', +e.currentTarget.value)} class="w-20 terminal-input font-mono text-2xs py-1 px-1.5 text-right" />
				</label>
				<label class="flex items-center justify-between text-2xs cursor-pointer">
					<span class="text-terminal-text-secondary">Randomize timing</span>
					<input type="checkbox" checked={$advancedConfig.twapRandomize} onchange={(e) => updateCfg('twapRandomize', e.currentTarget.checked)} class="w-3 h-3 accent-terminal-cyan" />
				</label>
			</div>
		{/if}

		{#if $orderType === 'adaptive_twap' || $orderType === 'vwap'}
			<div class="bg-terminal-bg rounded p-2 space-y-1.5">
				<span class="text-3xs text-terminal-text-muted uppercase">{$orderType === 'vwap' ? 'VWAP Schedule' : 'Adaptive TWAP Schedule'}</span>
				<label class="flex items-center justify-between text-2xs"><span class="text-terminal-text-secondary">Duration (min)</span><input type="number" value={$advancedConfig.adaptiveDuration ?? 30} oninput={(e) => updateCfg('adaptiveDuration', +e.currentTarget.value)} class="w-20 terminal-input text-2xs py-1 px-1.5 text-right" min="1" max="1440" /></label>
				<label class="flex items-center justify-between text-2xs"><span class="text-terminal-text-secondary">Intervals</span><input type="number" value={$advancedConfig.adaptiveIntervals ?? 10} oninput={(e) => updateCfg('adaptiveIntervals', +e.currentTarget.value)} class="w-20 terminal-input text-2xs py-1 px-1.5 text-right" min="2" max="100" /></label>
				<label class="flex items-center justify-between text-2xs"><span class="text-terminal-text-secondary">Participation</span><input type="number" value={$advancedConfig.adaptiveParticipation ?? 0.1} oninput={(e) => updateCfg('adaptiveParticipation', +e.currentTarget.value)} class="w-20 terminal-input text-2xs py-1 px-1.5 text-right" min="0.01" max="1" step="0.01" /></label>
				<label class="flex items-center justify-between text-2xs"><span class="text-terminal-text-secondary">Book offset (ticks)</span><input type="number" value={$advancedConfig.adaptiveOffsetTicks ?? 1} oninput={(e) => updateCfg('adaptiveOffsetTicks', +e.currentTarget.value)} class="w-20 terminal-input text-2xs py-1 px-1.5 text-right" min="0" /></label>
			</div>
		{/if}

		{#if $orderType === 'pov'}
			<div class="bg-terminal-bg rounded p-2 space-y-1.5">
				<span class="text-3xs text-terminal-text-muted uppercase">Participation of Volume</span>
				<label class="flex items-center justify-between text-2xs"><span class="text-terminal-text-secondary">Duration (min)</span><input type="number" value={$advancedConfig.adaptiveDuration ?? 30} oninput={(e) => updateCfg('adaptiveDuration', +e.currentTarget.value)} class="w-20 terminal-input text-2xs py-1 px-1.5 text-right" min="1" max="1440" /></label>
				<label class="flex items-center justify-between text-2xs"><span class="text-terminal-text-secondary">Participation</span><input type="number" value={$advancedConfig.povParticipation ?? 0.1} oninput={(e) => updateCfg('povParticipation', +e.currentTarget.value)} class="w-20 terminal-input text-2xs py-1 px-1.5 text-right" min="0.01" max="1" step="0.01" /></label>
				<label class="flex items-center justify-between text-2xs"><span class="text-terminal-text-secondary">Trade window</span><input type="number" value={$advancedConfig.povWindowTrades ?? 20} oninput={(e) => updateCfg('povWindowTrades', +e.currentTarget.value)} class="w-20 terminal-input text-2xs py-1 px-1.5 text-right" min="1" max="200" /></label>
				<p class="text-3xs text-terminal-text-muted">Children wait when public volume is insufficient.</p>
			</div>
		{/if}

		{#if $orderType === 'break_even'}
			<div class="bg-terminal-bg rounded p-2 space-y-1.5">
				<span class="text-3xs text-terminal-text-muted uppercase">Break-even protection</span>
				<label class="flex items-center justify-between text-2xs"><span class="text-terminal-text-secondary">Trigger distance</span><input type="number" value={$advancedConfig.breakEvenTrigger ?? 0} oninput={(e) => updateCfg('breakEvenTrigger', +e.currentTarget.value)} class="w-20 terminal-input text-2xs py-1 px-1.5 text-right" min="0.00000001" step="0.1" /></label>
				<label class="flex items-center justify-between text-2xs"><span class="text-terminal-text-secondary">Entry offset</span><input type="number" value={$advancedConfig.breakEvenOffset ?? 0} oninput={(e) => updateCfg('breakEvenOffset', +e.currentTarget.value)} class="w-20 terminal-input text-2xs py-1 px-1.5 text-right" min="0" step="0.1" /></label>
				<label class="flex items-center gap-2 text-2xs text-terminal-text-secondary"><input type="checkbox" checked={$advancedConfig.deadmanEnabled ?? false} onchange={(e) => updateCfg('deadmanEnabled', e.currentTarget.checked)} class="accent-terminal-red" /><span>Arm account-wide dead-man switch</span></label>
			</div>
		{/if}

		{#if $orderType === 'scale'}
			<div class="bg-terminal-bg rounded p-2 space-y-1.5">
				<span class="text-3xs text-terminal-text-muted uppercase">Scale Ladder</span>
				<label class="flex items-center justify-between text-2xs">
					<span class="text-terminal-text-secondary">Order count</span>
					<input type="number" value={$advancedConfig.scaleLevels} oninput={(e) => updateCfg('scaleLevels', +e.currentTarget.value)} class="w-20 terminal-input font-mono text-2xs py-1 px-1.5 text-right" />
				</label>
				<label class="flex items-center justify-between text-2xs">
					<span class="text-terminal-text-secondary">Start price</span>
					<input type="number" value={$advancedConfig.scaleStartPrice} oninput={(e) => updateCfg('scaleStartPrice', +e.currentTarget.value)} onfocus={() => focusChartField('scaleStart')} onblur={blurChartField} class="w-24 terminal-input font-mono text-2xs py-1 px-1.5 text-right" step="0.1" />
				</label>
				<label class="flex items-center justify-between text-2xs">
					<span class="text-terminal-text-secondary">End price</span>
					<input type="number" value={$advancedConfig.scaleEndPrice} oninput={(e) => updateCfg('scaleEndPrice', +e.currentTarget.value)} onfocus={() => focusChartField('scaleEnd')} onblur={blurChartField} class="w-24 terminal-input font-mono text-2xs py-1 px-1.5 text-right" step="0.1" />
				</label>
				<label class="flex items-center justify-between text-2xs">
					<span class="text-terminal-text-secondary">Size skew</span>
					<input type="number" value={$advancedConfig.scaleSkew} oninput={(e) => updateCfg('scaleSkew', +e.currentTarget.value)} class="w-20 terminal-input font-mono text-2xs py-1 px-1.5 text-right" step="0.1" />
				</label>
			</div>
		{/if}

		{#if $orderType === 'iceberg'}
			<div class="bg-terminal-bg rounded p-2 space-y-1.5">
				<span class="text-3xs text-terminal-text-muted uppercase">Iceberg</span>
				<label class="flex items-center justify-between text-2xs">
					<span class="text-terminal-text-secondary">Display size ({baseAsset})</span>
					<input type="number" value={$advancedConfig.icebergDisplaySize} oninput={(e) => updateCfg('icebergDisplaySize', +e.currentTarget.value)} class="w-20 terminal-input font-mono text-2xs py-1 px-1.5 text-right" step="0.01" />
				</label>
				<label class="flex items-center gap-1.5 cursor-pointer">
					<input
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
						<input type="number" value={$advancedConfig.icebergRefillMs} oninput={(e) => updateCfg('icebergRefillMs', +e.currentTarget.value)} class="w-20 terminal-input font-mono text-2xs py-1 px-1.5 text-right" />
					</label>
				{/if}
			</div>
		{/if}

		{#if $orderType === 'chase'}
			<div class="bg-terminal-bg rounded p-2 space-y-1.5">
				<span class="text-3xs text-terminal-text-muted uppercase">Chase</span>
				<label class="flex items-center justify-between text-2xs">
					<span class="text-terminal-text-secondary">Offset (ticks)</span>
					<input type="number" value={$advancedConfig.chaseOffset} oninput={(e) => updateCfg('chaseOffset', +e.currentTarget.value)} class="w-20 terminal-input font-mono text-2xs py-1 px-1.5 text-right" />
				</label>
				<label class="flex items-center justify-between text-2xs">
					<span class="text-terminal-text-secondary">Max chases</span>
					<input type="number" value={$advancedConfig.chaseMaxChases} oninput={(e) => updateCfg('chaseMaxChases', +e.currentTarget.value)} class="w-20 terminal-input font-mono text-2xs py-1 px-1.5 text-right" />
				</label>
				<label class="flex items-center gap-2 text-2xs text-terminal-text-secondary">
					<input type="checkbox" checked={$advancedConfig.deadmanEnabled ?? false} onchange={(e) => updateCfg('deadmanEnabled', e.currentTarget.checked)} class="accent-terminal-red" />
					<span>Arm account-wide dead-man switch</span>
				</label>
				{#if $advancedConfig.deadmanEnabled}
					<label class="flex items-center justify-between text-2xs">
						<span class="text-terminal-text-secondary">Cancel-all timeout (ms)</span>
						<input type="number" min="5000" value={$advancedConfig.deadmanMs ?? 30000} oninput={(e) => updateCfg('deadmanMs', +e.currentTarget.value)} class="w-24 terminal-input font-mono text-2xs py-1 px-1.5 text-right" />
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
					<input type="number" value={$advancedConfig.swarmOrders} oninput={(e) => updateCfg('swarmOrders', +e.currentTarget.value)} class="w-20 terminal-input font-mono text-2xs py-1 px-1.5 text-right" />
				</label>
				<label class="flex items-center justify-between text-2xs">
					<span class="text-terminal-text-secondary">Spread (%)</span>
					<input type="number" value={$advancedConfig.swarmSpread} oninput={(e) => updateCfg('swarmSpread', +e.currentTarget.value)} class="w-20 terminal-input font-mono text-2xs py-1 px-1.5 text-right" step="0.1" />
				</label>
			</div>
		{/if}

		{#if $orderType === 'ping_pong'}
			<div class="bg-terminal-bg rounded p-2 space-y-1.5">
				<span class="text-3xs text-terminal-text-muted uppercase">Ping Pong</span>
				<label class="flex items-center justify-between text-2xs">
					<span class="text-terminal-text-secondary">Range (%)</span>
					<input type="number" value={$advancedConfig.pingPongRange} oninput={(e) => updateCfg('pingPongRange', +e.currentTarget.value)} class="w-20 terminal-input font-mono text-2xs py-1 px-1.5 text-right" step="0.1" />
				</label>
				<label class="flex items-center justify-between text-2xs">
					<span class="text-terminal-text-secondary">Cycles</span>
					<input type="number" value={$advancedConfig.pingPongCycles} oninput={(e) => updateCfg('pingPongCycles', +e.currentTarget.value)} class="w-20 terminal-input font-mono text-2xs py-1 px-1.5 text-right" />
				</label>
			</div>
		{/if}

		<!-- Leverage Slider -->
		<div class="bg-terminal-bg rounded p-2">
			<div class="flex items-center justify-between mb-1.5">
				<span class="text-3xs text-terminal-text-muted">Leverage</span>
				<span class="text-3xs font-mono text-terminal-cyan">{$orderLeverage}x</span>
			</div>
			<input
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

		<!-- Order Options -->
		<div class="flex items-center gap-3 flex-wrap">
			<label class="flex items-center gap-1.5 cursor-pointer">
				<input type="checkbox" bind:checked={$reduceOnly} class="w-3 h-3 rounded border-terminal-border bg-terminal-bg accent-terminal-green" />
				<span class="text-3xs text-terminal-text-secondary">Reduce Only</span>
			</label>
			<label class="flex items-center gap-1.5 cursor-pointer">
				<input type="checkbox" checked={$postOnly} onchange={(event) => setPostOnly(event.currentTarget.checked)} class="w-3 h-3 rounded border-terminal-border bg-terminal-bg accent-terminal-green" />
				<span class="text-3xs text-terminal-text-secondary">POST</span>
			</label>
			<label class="flex items-center gap-1.5 cursor-pointer">
				<input type="checkbox" checked={$ioc} onchange={(event) => setIoc(event.currentTarget.checked)} class="w-3 h-3 rounded border-terminal-border bg-terminal-bg accent-terminal-green" />
				<span class="text-3xs text-terminal-text-secondary">IOC</span>
			</label>
		</div>

		<!-- Summary -->
		<div class="space-y-1 text-2xs pt-1 border-t border-terminal-border/50">
			<div class="flex justify-between">
				<span class="text-terminal-text-muted">Notional Value</span>
				<span class="font-mono">{$privacyMode ? '••••••' : `$${notionalValue.toFixed(2)}`}</span>
			</div>
			<div class="flex justify-between">
				<span class="text-terminal-text-muted">Required Margin</span>
				<span class="font-mono">{$privacyMode ? '••••••' : `$${marginRequired.toFixed(2)}`}</span>
			</div>
			<div class="flex justify-between">
				<span class="text-terminal-text-muted">Available</span>
				<span class="font-mono text-terminal-green">{$privacyMode ? '••••••' : `$${availableMargin.toLocaleString()}`}</span>
			</div>
		</div>

		<div class="mt-2 rounded bg-terminal-bg p-2 space-y-1.5">
			<span class="block text-3xs uppercase text-terminal-text-muted">Local risk limits</span>
			<label class="flex items-center justify-between gap-2 text-2xs">
				<span class="text-terminal-text-secondary">Max order (USD)</span>
				<input aria-label="Maximum order notional" type="number" min="0" step="any" value={$fatFingerLimits.maxOrderNotional} oninput={(event) => setFatFingerLimit('order', event.currentTarget.value)} class="w-24 terminal-input font-mono text-2xs py-1 px-1.5 text-right" placeholder="Off" />
			</label>
			<label class="flex items-center justify-between gap-2 text-2xs">
				<span class="text-terminal-text-secondary">Max {$selectedMarket?.symbol ?? 'market'} position</span>
				<input aria-label="Maximum position notional" type="number" min="0" step="any" value={$selectedMarket ? ($fatFingerLimits.maxPositionNotionalByMarket[$selectedMarket.marketKey] ?? '') : ''} oninput={(event) => setFatFingerLimit('position', event.currentTarget.value)} disabled={!$selectedMarket} class="w-24 terminal-input font-mono text-2xs py-1 px-1.5 text-right disabled:opacity-50" placeholder="Off" />
			</label>
			<p class="text-3xs text-terminal-text-muted">Saved on this device. Limits reject before signing.</p>
		</div>
	</div>

	<!-- Submit -->
	<div class="p-2 border-t border-terminal-border flex-shrink-0">
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
				{#if orderTypeRevenueDisclosure($orderType)} {orderTypeRevenueDisclosure($orderType)}{:else if revenueDisclosure()} {revenueDisclosure()}{/if}
			</p>
			{#if builderRevenueEnabled() && configuredBuilder() && enablePhase.kind !== 'step'}
				<label class="mb-1.5 flex items-start gap-1.5 rounded border border-terminal-border/60 bg-terminal-bg-secondary px-2 py-1.5 text-3xs text-terminal-text-muted">
					<input type="checkbox" bind:checked={builderOptIn} class="mt-0.5 accent-terminal-cyan" />
					<span>I approve the optional 0.1 bp Vice builder fee for eligible orders. This requests a one-time wallet approval; leaving it unchecked still enables local trading without builder attribution.</span>
				</label>
			{/if}
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
						<button class="mt-1.5 text-terminal-cyan hover:underline" onclick={dismissEnablement}>Cancel</button>
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
							<button
								class="rounded border border-terminal-cyan/60 px-1.5 py-0.5 text-terminal-cyan hover:bg-terminal-cyan/10 disabled:opacity-50"
								disabled={!enableRetryAvailable}
								onclick={retryEnableSecureTrading}
							>
								{enableRetryAvailable ? 'Retry' : `Retry in ${enableCountdown}s`}
							</button>
						{/if}
						<button class="rounded border border-terminal-border px-1.5 py-0.5 hover:bg-terminal-bg" onclick={dismissEnablement}>Dismiss</button>
					</div>
				</div>
			{/if}
		{/if}
		{#if $isConnected && $executionStatus === 'live' && $orderType === 'twap' && orderTypeRevenueDisclosure($orderType)}
			<p class="text-3xs text-terminal-yellow mb-1.5">{orderTypeRevenueDisclosure($orderType)}</p>
		{/if}
		{#if $isConnected && $executionStatus === 'live' && referralConfigured()}
			<div class="mb-1.5 rounded border border-terminal-border/60 bg-terminal-bg-secondary px-2 py-1.5 text-3xs text-terminal-text-muted">
				<span>Optional referral: it can only be set if this account has no existing Hyperliquid referrer.</span>
				{#if $revenueSyncStatus === 'live' && $revenueSnapshot}
					<div class="mt-1">Referral: {$revenueSnapshot.referral.assigned ? ($revenueSnapshot.referral.code ?? 'assigned') : 'unassigned'} · Builder rewards: {$revenueSnapshot.referral.builderRewards.toFixed(4)} USDC</div>
				{:else if $revenueSyncStatus === 'stale'}
					<div class="mt-1 text-terminal-yellow">Revenue attribution is temporarily unavailable; no estimate is shown.</div>
				{/if}
				{#if !referralConfirmOpen}
					<button class="ml-1 text-terminal-cyan hover:underline" onclick={() => (referralConfirmOpen = true)}>Review optional referral</button>
				{:else}
					<div class="mt-1.5 rounded border border-terminal-yellow/40 bg-terminal-yellow/5 p-1.5 text-terminal-text">
						<div>Vice will request referral code <span class="font-mono text-terminal-cyan">{configuredReferralCode() ?? 'configured code'}</span> for this wallet.</div>
						<div class="mt-1 text-terminal-text-muted">Hyperliquid decides eligibility. Existing referrers are never overwritten. A wallet confirmation is required, and the result is verified afterward.</div>
						<div class="mt-1.5 flex gap-1.5">
							<button class="rounded border border-terminal-cyan/60 px-1.5 py-0.5 text-terminal-cyan hover:bg-terminal-cyan/10 disabled:opacity-50" disabled={referralBusy} onclick={requestReferral}>{referralBusy ? 'Waiting…' : 'Confirm and request'}</button>
							<button class="rounded border border-terminal-border px-1.5 py-0.5 hover:bg-terminal-bg" disabled={referralBusy} onclick={() => (referralConfirmOpen = false)}>Cancel</button>
						</div>
					</div>
				{/if}
				{#if referralMessage}<div class="mt-1 text-terminal-text-muted">{referralMessage}</div>{/if}
			</div>
		{/if}
		{#if submitError}
			<p class="text-2xs text-terminal-red mb-1.5">{submitError}</p>
		{/if}
		<button
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
								? 'Buy / Long'
								: 'Sell / Short'} {baseAsset}
		</button>
	</div>
</div>
