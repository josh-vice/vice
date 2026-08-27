<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import { onMount, setContext } from 'svelte';
	import { startPriceUpdates, stopPriceUpdates, hotkeysEnabled, orderSide, cliOpen, clickPlacementMode, setOrderSizePercent, setChartTimeframe } from '$lib/stores';
	import { actionForHotkey, hotkeyFromEvent, isTypingTarget, loadHotkeys } from '$lib/hotkeys';
	import { SUITE_CONTEXT, suiteContext } from '$lib/suite/context';
	import PwaBanner from '$lib/components/PwaBanner.svelte';
	import { loadPrivacyMode } from '$lib/privacyMode';
	let { children } = $props();
	loadPrivacyMode();
	let isTerminalWorkspace = $derived(page.url.pathname === '/trade');
	setContext(SUITE_CONTEXT, suiteContext);
	let privacyHydrated = $state(true);

	onMount(() => {
		loadPrivacyMode();
		privacyHydrated = true;
		if (page.url.pathname === '/login') return;
		startPriceUpdates();
		return () => stopPriceUpdates();
	});

	// Global hotkey handler
	function handleKeyDown(e: KeyboardEvent) {
		if (!$hotkeysEnabled) return;

		const action = actionForHotkey(loadHotkeys(), hotkeyFromEvent(e));
		// Cmd/Ctrl+K remains global while the CLI input owns focus. This keeps
		// the layout as the single shortcut owner and lets the same key close it.
		if (action === 'cli') {
			e.preventDefault();
			cliOpen.update((v) => !v);
			return;
		}
		if (isTypingTarget(e.target)) return;

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
			case 'focusChart': case 'focusBook': case 'focusTicket': case 'focusBottom': {
				e.preventDefault();
				const focusTarget: Record<string, string> = {
					focusChart: 'workspace-chart',
					focusBook: 'workspace-market-data',
					focusTicket: 'workspace-ticket',
					focusBottom: 'workspace-activity'
				};
				document.getElementById(focusTarget[action])?.focus();
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
		{#if isTerminalWorkspace && !privacyHydrated}
			<div class="flex h-screen items-center justify-center text-xs text-terminal-text-muted" data-testid="privacy-hydration-pending">Loading privacy settings…</div>
		{:else}
			{@render children()}
		{/if}
	</div>
	<PwaBanner />
