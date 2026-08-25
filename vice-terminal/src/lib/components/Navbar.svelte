<script lang="ts">
	import {
		activeSubaccount,
		isConnected,
		walletAddress,
		walletStatus,
		selectedMarket,
		marketDataStatus,
		marketCatalogStatus,
		accountSyncStatus,
		activeAssetSyncStatus,
		revenueSyncStatus,
		cliOpen,
		marketType,
		connectWallet,
		disconnectWallet,
		toggleCLI,
		setMarketType,
		type HealthStatus
	} from '$lib/stores';
	import { setSoundMuted, soundMuted } from '$lib/soundNotifications';
	import { privacyMode, setPrivacyMode } from '$lib/privacyMode';
	import { requestWorkspaceLayoutReset, setWorkspaceLocked, setWorkspacePanel, setWorkspacePreset, workspaceLocked, workspacePanels, workspacePreset, type WorkspacePanel, type WorkspacePreset } from '$lib/workspacePreset';
	import { DEFAULT_HOTKEYS, hotkeyFromEvent, loadHotkeys, setHotkeyBinding, type HotkeyAction, type HotkeyBindings } from '$lib/hotkeys';
	import { canPresentAccountState, healthLabel } from '$lib/productionTruth';
	import { Terminal, Wallet, LogOut, Download, Volume2, VolumeX, Eye, EyeOff, Lock, Unlock, LifeBuoy } from 'lucide-svelte';
	import { hyperliquidPublicNetwork, hyperliquidTradingNetwork } from '$lib/hl/network';
	import { tradingKillSwitchActive } from '$lib/execution/releaseSafety';
	import { downloadLatencyEvidence } from '$lib/execution/latencyEvidence';
	import ReportIssue from './ReportIssue.svelte';
	import { onMount } from 'svelte';
	import { installDiagnostics } from '$lib/diagnostics/wire';

	let reportIssueOpen = $state(false);
	let latencyMessage = $state('');
	let workspaceMessage = $state('');

	function downloadLatency(): void {
		try {
			const evidence = downloadLatencyEvidence(hyperliquidPublicNetwork.network);
			latencyMessage = `Latency evidence downloaded (${evidence.samples.length} observed samples).`;
		} catch (error) {
			latencyMessage = error instanceof Error ? `Latency download failed: ${error.message}` : 'Latency download failed.';
		}
	}
	function resetWorkspaceLayout(): void {
		requestWorkspaceLayoutReset();
		panelMenuOpen = false;
		workspaceMessage = `${$workspacePreset[0].toUpperCase()}${$workspacePreset.slice(1)} layout reset.`;
	}
	onMount(() => installDiagnostics());

	function formatAddress(address: string | null): string {
		return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '';
	}

	function healthColor(status: HealthStatus): string {
		if (status === 'live') return 'bg-terminal-green';
		if (status === 'connecting') return 'bg-terminal-yellow animate-pulse';
		if (status === 'stale') return 'bg-terminal-yellow';
		if (status === 'degraded') return 'bg-terminal-yellow';
		if (status === 'error') return 'bg-terminal-red';
		return 'bg-terminal-text-muted';
	}

	let panelMenuOpen = $state(false);
	let hotkeyMenuOpen = $state(false);
	let hotkeyMessage = $state('');
	let bindings = $state<HotkeyBindings>(DEFAULT_HOTKEYS);
	const panels: Array<{ id: WorkspacePanel; label: string }> = [
		{ id: 'watchlist', label: 'Watchlist' }, { id: 'marketData', label: 'Book & tape' },
		{ id: 'ticket', label: 'Order ticket' }, { id: 'bottom', label: 'Account panel' }, { id: 'chat', label: 'The Pit' }
	];
	const hotkeyLabels: Array<{ id: HotkeyAction; label: string }> = [
		{ id: 'buy', label: 'Buy side' }, { id: 'sell', label: 'Sell side' }, { id: 'size10', label: 'Size 10%' }, { id: 'size20', label: 'Size 20%' }, { id: 'size30', label: 'Size 30%' }, { id: 'size40', label: 'Size 40%' }, { id: 'size50', label: 'Size 50%' }, { id: 'size60', label: 'Size 60%' }, { id: 'size70', label: 'Size 70%' }, { id: 'size80', label: 'Size 80%' }, { id: 'size90', label: 'Size 90%' }, { id: 'time1m', label: 'Chart 1m' }, { id: 'time5m', label: 'Chart 5m' }, { id: 'time15m', label: 'Chart 15m' }, { id: 'time1h', label: 'Chart 1h' }, { id: 'time4h', label: 'Chart 4h' }, { id: 'time1d', label: 'Chart 1D' }, { id: 'armClick', label: 'Arm chart click placement' }, { id: 'cli', label: 'Toggle CLI' }, { id: 'focusChart', label: 'Focus chart' }, { id: 'focusBook', label: 'Focus book & tape' }, { id: 'focusTicket', label: 'Focus order ticket' }, { id: 'focusBottom', label: 'Focus account panel' }
	];
	function captureHotkey(event: KeyboardEvent, action: HotkeyAction): void {
		event.preventDefault();
		if (event.key === 'Escape') return;
		const result = setHotkeyBinding(action, hotkeyFromEvent(event));
		if (!result.ok) { hotkeyMessage = result.error; return; }
		bindings = result.bindings;
		hotkeyMessage = `${action} saved`;
	}
</script>

<nav class="h-11 bg-terminal-bg border-b border-terminal-border flex items-center justify-between px-3 select-none gap-2">
	<div class="flex items-center gap-3 flex-shrink-0">
		<a href="/trade" class="flex items-center gap-2 hover:opacity-90 transition-opacity">
			<div class="w-6 h-6 rounded bg-black flex items-center justify-center overflow-hidden ring-1 ring-terminal-red/40">
				<img src="/flamingo.png" alt="Vice Terminal flamingo logo" class="w-full h-full object-contain" />
			</div>
			<span class="font-semibold text-sm tracking-tight hidden sm:inline">Vice <span class="text-terminal-red">Terminal</span></span>
		</a>
		<div class="flex items-center gap-0.5" aria-label="Market type">
			<button
				aria-pressed={$marketType === 'perp'}
				class="px-2.5 py-1.5 text-xs font-medium rounded transition-colors {$marketType === 'perp' ? 'bg-terminal-bg-tertiary text-terminal-cyan' : 'text-terminal-text-secondary hover:text-terminal-text'}"
				onclick={() => setMarketType('perp')}
			>Perps</button>
			<button
				aria-pressed={$marketType === 'spot'}
				class="px-2.5 py-1.5 text-xs font-medium rounded transition-colors {$marketType === 'spot' ? 'bg-terminal-bg-tertiary text-terminal-cyan' : 'text-terminal-text-secondary hover:text-terminal-text'}"
				onclick={() => setMarketType('spot')}
			>Spot</button>
			<button data-testid="prediction-filter"
				aria-pressed={$marketType === 'prediction'}
				class="px-2.5 py-1.5 text-xs font-medium rounded transition-colors {$marketType === 'prediction' ? 'bg-terminal-bg-tertiary text-terminal-yellow' : 'text-terminal-text-secondary hover:text-terminal-text'}"
				onclick={() => setMarketType('prediction')}
			>Prediction</button>
		</div>
	</div>

	<div class="flex items-center gap-1.5 px-2 py-1.5 bg-terminal-bg-secondary rounded border border-terminal-border text-xs min-w-0">
		<span class="text-terminal-text-muted hidden sm:inline">Account</span>
		<span class="font-mono font-medium tabular-nums truncate">
			{#if !$privacyMode && canPresentAccountState($isConnected, $accountSyncStatus)}
				${$activeSubaccount.equity.toLocaleString('en-US', { minimumFractionDigits: 2 })}
			{:else if $privacyMode}
				••••••
			{:else}
				—
			{/if}
		</span>
	</div>

	<div class="flex items-center gap-1.5 flex-shrink-0">
		<span class="hidden sm:inline px-1.5 py-0.5 rounded text-3xs font-semibold uppercase bg-terminal-green/15 text-terminal-green" title="Charts, trades, order books, and market catalog">{hyperliquidPublicNetwork.network} DATA</span>
		<span class="hidden sm:inline px-1.5 py-0.5 rounded text-3xs font-semibold uppercase {hyperliquidTradingNetwork.isTestnet ? 'bg-terminal-yellow/15 text-terminal-yellow' : 'bg-terminal-red/20 text-terminal-red'}" title="Account state and order execution">{hyperliquidTradingNetwork.network} TRADING</span>
		{#if tradingKillSwitchActive()}
			<span class="hidden sm:inline px-1.5 py-0.5 rounded text-3xs font-semibold uppercase bg-terminal-red/20 text-terminal-red" title="New trading is disabled by release safety policy">TRADING HALTED</span>
		{/if}
		<button
			class="hidden xl:flex items-center rounded border border-terminal-border bg-terminal-bg-secondary px-1 py-0.5 text-3xs text-terminal-text-secondary"
			title={$workspaceLocked ? 'Customize the workspace layout' : 'Finish customizing and keep this layout'} data-testid="workspace-customize-toggle"
			onclick={() => setWorkspaceLocked(!$workspaceLocked)}
			aria-label={$workspaceLocked ? 'Unlock workspace layout' : 'Lock workspace layout'}
		>
			{#if $workspaceLocked}<Unlock class="w-3.5 h-3.5 text-terminal-cyan" />{:else}<Lock class="w-3.5 h-3.5 text-terminal-yellow" />{/if}
			<span class="px-1 text-terminal-text-muted">{ $workspaceLocked ? 'LOCKED' : 'UNLOCKED' }</span>
		</button>
		<button
			class="hidden xl:flex items-center rounded border border-terminal-border bg-terminal-bg-secondary px-1 py-0.5 text-3xs text-terminal-text-secondary"
			title="Choose a saved workspace starting layout"
		>
			<span class="px-1 text-terminal-text-muted">VIEW</span>
			<select aria-label="Workspace preset" disabled={$workspaceLocked} bind:value={$workspacePreset} onchange={(event) => setWorkspacePreset(event.currentTarget.value as WorkspacePreset)} class="bg-transparent outline-none text-terminal-text disabled:opacity-50">
				<option value="default">Default</option>
				<option value="chart">Chart max</option>
				<option value="data">Data dense</option>
			</select>
		</button>
		<div class="hidden xl:block relative">
			<button data-testid="workspace-widgets-toggle" class="rounded border border-terminal-border bg-terminal-bg-secondary px-2 py-1 text-3xs text-terminal-text-secondary hover:text-terminal-text" onclick={() => panelMenuOpen = !panelMenuOpen} aria-expanded={panelMenuOpen}>WIDGETS</button>
			{#if panelMenuOpen}
				<div class="absolute right-0 top-full z-50 mt-1 w-48 rounded border border-terminal-border bg-terminal-bg-panel p-1 shadow-xl" role="menu" aria-label="Workspace widgets">
					{#if $workspaceLocked}
						<div class="px-2 py-2 text-3xs leading-relaxed text-terminal-text-muted" role="status">Minimal workspace is intentionally simplified. Choose EDIT LAYOUT to enable Pro widgets.</div>
					{:else}
						<div class="px-2 py-1 text-3xs text-terminal-text-muted">Choose visible widgets</div>
						{#each panels as panel}
							<label class="flex cursor-pointer items-center gap-2 px-2 py-1 text-3xs text-terminal-text-secondary hover:bg-terminal-bg-hover">
								<input type="checkbox" checked={$workspacePanels[panel.id]} onchange={(event) => setWorkspacePanel(panel.id, event.currentTarget.checked)} class="accent-terminal-cyan" />
								{panel.label}
							</label>
						{/each}
					{/if}
					<div class="my-1 border-t border-terminal-border"></div>
					<button class="w-full rounded px-2 py-1 text-left text-3xs text-terminal-yellow hover:bg-terminal-bg-hover" onclick={resetWorkspaceLayout}>Reset this layout</button>
				</div>
			{/if}
		</div>
		<div class="hidden xl:block relative">
			<button class="rounded border border-terminal-border bg-terminal-bg-secondary px-2 py-1 text-3xs text-terminal-text-secondary hover:text-terminal-text" onclick={() => { hotkeyMenuOpen = !hotkeyMenuOpen; bindings = loadHotkeys(); hotkeyMessage = ''; }}>HOTKEYS</button>
			{#if hotkeyMenuOpen}
				<div class="absolute right-0 top-full z-50 mt-1 w-56 rounded border border-terminal-border bg-terminal-bg-panel p-2 shadow-xl">
					<div class="mb-1 text-3xs text-terminal-text-muted">Click a binding, then press its new key.</div>
					{#each hotkeyLabels as item}
						<div class="flex items-center justify-between gap-2 py-0.5 text-3xs"><span>{item.label}</span><button class="min-w-12 rounded bg-terminal-bg-secondary px-1 py-0.5 font-mono text-terminal-cyan" onkeydown={(event) => captureHotkey(event, item.id)}>{bindings[item.id]}</button></div>
					{/each}
					{#if hotkeyMessage}<div class="mt-1 text-3xs text-terminal-yellow">{hotkeyMessage}</div>{/if}
				</div>
			{/if}
		</div>
		<button
			class="hidden lg:flex p-1.5 rounded text-terminal-text-secondary hover:text-terminal-text hover:bg-terminal-bg-hover"
			onclick={() => setPrivacyMode(!$privacyMode)}
			title={$privacyMode ? 'Show private account values' : 'Hide private account values'}
			aria-label={$privacyMode ? 'Show private account values' : 'Hide private account values'}
		>{#if $privacyMode}<EyeOff class="w-4 h-4" />{:else}<Eye class="w-4 h-4" />{/if}</button>
		<button
			class="hidden lg:flex p-1.5 rounded text-terminal-text-secondary hover:text-terminal-text hover:bg-terminal-bg-hover"
			onclick={() => void setSoundMuted(!$soundMuted)}
			title={$soundMuted ? 'Enable notification sounds' : 'Mute notification sounds'}
			aria-label={$soundMuted ? 'Enable notification sounds' : 'Mute notification sounds'}
		>{#if $soundMuted}<VolumeX class="w-4 h-4" />{:else}<Volume2 class="w-4 h-4" />{/if}</button>
		<button
			class="hidden lg:flex p-1.5 rounded transition-colors {$cliOpen ? 'bg-terminal-cyan/20 text-terminal-cyan' : 'text-terminal-text-secondary hover:text-terminal-text hover:bg-terminal-bg-hover'}"
			onclick={toggleCLI}
			title="Toggle CLI (⌘K)"
		><Terminal class="w-4 h-4" /></button>
		<button
			class="hidden lg:flex p-1.5 rounded text-terminal-text-secondary hover:text-terminal-text hover:bg-terminal-bg-hover"
			onclick={downloadLatency}
			title="Download measured client latency evidence"
			aria-label="Download measured client latency evidence"
		><Download class="w-4 h-4" /></button>
		<button
			class="hidden lg:flex p-1.5 rounded text-terminal-text-secondary hover:text-terminal-text hover:bg-terminal-bg-hover"
			onclick={() => (reportIssueOpen = true)}
			title="Report an issue — download a privacy-safe support bundle"
			aria-label="Report an issue"
			data-testid="report-issue-open"
		><LifeBuoy class="w-4 h-4" /></button>

		<div class="hidden md:flex items-center gap-2 px-1 text-3xs text-terminal-text-muted">
			<div data-testid="market-data-health" data-feed-status={$marketDataStatus} class="flex items-center gap-1" title="Hyperliquid market data">
				<span class="w-1.5 h-1.5 rounded-full {healthColor($marketDataStatus)}"></span>
				<span>DATA {healthLabel($marketDataStatus)}</span>
			</div>
			<div data-testid="market-catalog-health" class="flex items-center gap-1" title="Hyperliquid market catalog completeness">
				<span class="w-1.5 h-1.5 rounded-full {healthColor($marketCatalogStatus)}"></span>
				<span>CATALOG {healthLabel($marketCatalogStatus)}</span>
			</div>
			<div class="flex items-center gap-1" title="Private account synchronization">
				<span class="w-1.5 h-1.5 rounded-full {healthColor($accountSyncStatus)}"></span>
				<span>ACCOUNT {healthLabel($accountSyncStatus)}</span>
			</div>
			{#if $isConnected && ($selectedMarket?.kind === 'corePerp' || $selectedMarket?.kind === 'hip3Perp') && $activeAssetSyncStatus !== 'idle'}
				<div class="flex items-center gap-1" title="Selected perp account/asset synchronization">
					<span class="w-1.5 h-1.5 rounded-full {healthColor($activeAssetSyncStatus)}"></span>
					<span>ASSET {healthLabel($activeAssetSyncStatus)}</span>
				</div>
			{/if}
			<div class="flex items-center gap-1" title="Authoritative Hyperliquid referral and builder reward state">
				<span class="w-1.5 h-1.5 rounded-full {healthColor($revenueSyncStatus)}"></span>
				<span>REVENUE {healthLabel($revenueSyncStatus)}</span>
			</div>
			{#if latencyMessage}
				<div data-testid="latency-status" class="sr-only" role="status" aria-live="polite">{latencyMessage}</div>
			{/if}
			{#if workspaceMessage}
				<div data-testid="workspace-reset-status" class="sr-only" role="status" aria-live="polite">{workspaceMessage}</div>
			{/if}
		</div>

		{#if $isConnected}
			<div class="flex items-center gap-1">
				<div class="hidden sm:flex items-center gap-1.5 px-2 py-1 bg-terminal-bg-secondary rounded border border-terminal-border">
					<div class="w-1.5 h-1.5 rounded-full {healthColor($walletStatus)}"></div>
					<span class="text-xs font-mono">{$privacyMode ? '••••••' : formatAddress($walletAddress)}</span>
				</div>
				<button class="p-1.5 rounded text-terminal-text-secondary hover:text-terminal-red hover:bg-terminal-red-bg" onclick={disconnectWallet} title="Disconnect">
					<LogOut class="w-4 h-4" />
				</button>
			</div>
		{:else}
			<button
				class="flex items-center gap-1.5 px-2.5 py-1.5 bg-terminal-green text-terminal-bg font-medium text-xs rounded hover:bg-terminal-green-dim disabled:opacity-50"
				onclick={connectWallet}
				disabled={$walletStatus === 'connecting'}
			>
				<Wallet class="w-3.5 h-3.5" />
				<span class="hidden sm:inline">{$walletStatus === 'connecting' ? 'Connecting…' : 'Connect'}</span>
			</button>
		{/if}
		</div>
		</nav>
	{#if reportIssueOpen}
		<ReportIssue onClose={() => (reportIssueOpen = false)} />
	{/if}