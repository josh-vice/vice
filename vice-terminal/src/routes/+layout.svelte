<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import { onMount, setContext } from 'svelte';
	import { startPriceUpdates, stopPriceUpdates, hotkeysEnabled, orderSide, cliOpen, clickPlacementMode, setOrderSizePercent, setChartTimeframe } from '$lib/stores';
	import { actionForHotkey, hotkeyFromEvent, isTypingTarget, loadHotkeys } from '$lib/hotkeys';
	import { SUITE_CONTEXT, suiteContext } from '$lib/suite/context';
	import PwaBanner from '$lib/components/PwaBanner.svelte';

	let { children } = $props();
	let isTerminalWorkspace = $derived(page.url.pathname === '/trade');
	setContext(SUITE_CONTEXT, suiteContext);

	onMount(() => {
		if (page.url.pathname === '/login') return;
		startPriceUpdates();
		return () => stopPriceUpdates();
	});

	// Global hotkey handler
	function handleKeyDown(e: KeyboardEvent) {
		if (!$hotkeysEnabled) return;

		if (isTypingTarget(e.target)) return;
		const action = actionForHotkey(loadHotkeys(), hotkeyFromEvent(e));
		switch (action) {
			case 'buy':
				orderSide.set('buy');
				break;
			case 'sell':
				orderSide.set('sell');
				break;
			case 'size10': case 'size20': case 'size30': case 'size40': case 'size50': case 'size60': case 'size70': case 'size80': case 'size90':
				const percent = Number(action.slice(4));
				setOrderSizePercent(percent);
				break;
			case 'time1m': setChartTimeframe('1m'); break;
			case 'time5m': setChartTimeframe('5m'); break;
			case 'time15m': setChartTimeframe('15m'); break;
			case 'time1h': setChartTimeframe('1h'); break;
			case 'time4h': setChartTimeframe('4h'); break;
			case 'time1d': setChartTimeframe('1D'); break;
			case 'armClick': clickPlacementMode.update((armed) => !armed); break;
			case 'cli':
			e.preventDefault();
			cliOpen.update(v => !v);
			break;
			case 'focusChart': case 'focusBook': case 'focusTicket': case 'focusBottom': {
				e.preventDefault();
				const panel = action.slice(5).toLowerCase();
				document.getElementById(`workspace-${panel}`)?.focus();
				break;
			}
		}
	}
</script>

<svelte:window onkeydown={handleKeyDown} />

<svelte:head>
	<title>Vice Terminal | Professional Crypto Trading Terminal</title>
	<meta name="description" content="Non-custodial Hyperliquid terminal for core perpetuals, HIP-3 markets, and spot." />
</svelte:head>

	<div class={isTerminalWorkspace ? 'h-screen w-screen overflow-hidden bg-terminal-bg text-terminal-text font-sans' : 'min-h-screen bg-terminal-bg text-terminal-text font-sans'}>
		{@render children()}
	</div>
	<PwaBanner />
