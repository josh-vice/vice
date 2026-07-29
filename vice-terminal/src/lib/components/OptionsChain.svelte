<script lang="ts">
	import { optionChain, selectedExpiry, optionViewMode, strikeRangeFilter, filteredOptionContracts, selectedOption, selectOptionContract, demoFixturesEnabled } from '$lib/stores';
	import { formatPrice, formatDate } from '$lib/format';
	import type { OptionContract } from '$lib/types';
	import { Filter, Settings, TrendingUp, TrendingDown, ChevronDown, Plus, Minus, Phone, FileText, Layers } from 'lucide-svelte';

	// Column visibility state (ThinkOrSwim-style customization)
	let visibleColumns = {
		bid: true,
		ask: true,
		last: true,
		iv: true,
		delta: true,
		gamma: true,
		theta: true,
		vega: true,
		oi: true,
		volume: true
	};

	let showColumnSettings = false;
	let showSpreadBuilder = false;

	// ATM detection
	$: atmStrike = $optionChain.strikes.reduce((closest, strike) => {
		return Math.abs(strike - $optionChain.spotPrice) < Math.abs(closest - $optionChain.spotPrice) ? strike : closest;
	}, $optionChain.strikes[0]);

	// Group contracts by strike for side-by-side display
	$: groupedByStrike = $filteredOptionContracts.reduce((acc, contract) => {
		if (!acc[contract.strike]) {
			acc[contract.strike] = { call: null, put: null };
		}
		acc[contract.strike][contract.optionType] = contract;
		return acc;
	}, {} as Record<number, { call: OptionContract | null; put: OptionContract | null }>);

	$: sortedStrikes = Object.keys(groupedByStrike).map(Number).sort((a, b) => a - b);

	function selectContract(contract: OptionContract | null) {
		if (contract) {
			selectOptionContract(contract);
		}
	}

	function formatGreek(value: number, decimals: number = 4): string {
		return value.toFixed(decimals);
	}

	function formatIV(iv: number): string {
		return `${iv.toFixed(1)}%`;
	}

	function getStrikeClass(strike: number): string {
		if (strike === atmStrike) return 'atm-strike';
		return '';
	}

	function getContractClass(contract: OptionContract | null): string {
		if (!contract) return '';
		if (contract.isATM) return 'bg-terminal-yellow/5';
		if (contract.isITM) return contract.optionType === 'call' ? 'itm-call' : 'itm-put';
		return '';
	}

	// Spread builder state
	interface SpreadLeg {
		contract: OptionContract;
		side: 'buy' | 'sell';
		quantity: number;
	}

	let spreadLegs: SpreadLeg[] = [];

	function addToSpread(contract: OptionContract, side: 'buy' | 'sell') {
		spreadLegs = [...spreadLegs, { contract, side, quantity: 1 }];
		showSpreadBuilder = true;
	}

	function removeFromSpread(index: number) {
		spreadLegs = spreadLegs.filter((_, i) => i !== index);
	}

	function clearSpread() {
		spreadLegs = [];
	}

	$: spreadNetDebit = spreadLegs.reduce((sum, leg) => {
		const price = leg.side === 'buy' ? leg.contract.ask : leg.contract.bid;
		return sum + (leg.side === 'buy' ? price : -price) * leg.quantity;
	}, 0);

	$: spreadGreeks = {
		delta: spreadLegs.reduce((sum, leg) => sum + leg.contract.delta * leg.quantity * (leg.side === 'buy' ? 1 : -1), 0),
		gamma: spreadLegs.reduce((sum, leg) => sum + leg.contract.gamma * leg.quantity * (leg.side === 'buy' ? 1 : -1), 0),
		theta: spreadLegs.reduce((sum, leg) => sum + leg.contract.theta * leg.quantity * (leg.side === 'buy' ? 1 : -1), 0),
		vega: spreadLegs.reduce((sum, leg) => sum + leg.contract.vega * leg.quantity * (leg.side === 'buy' ? 1 : -1), 0)
	};
</script>

{#if !demoFixturesEnabled}
	<div class="h-full flex items-center justify-center px-4 text-center text-2xs text-terminal-text-muted">
		Options markets are unavailable until an authoritative venue feed is connected.
	</div>
{:else}
<div class="h-full flex flex-col bg-terminal-bg-secondary">
	<!-- Header -->
	<div class="terminal-panel-header flex-wrap gap-2">
		<div class="flex items-center gap-3">
			<span class="font-medium text-terminal-text">Options Chain</span>
			<span class="text-terminal-green font-mono text-sm">
				{$optionChain.underlying} ${formatPrice($optionChain.spotPrice)}
			</span>
		</div>

		<div class="flex items-center gap-2">
			<!-- RFQ Button -->
			<button class="px-3 py-1 text-2xs font-medium rounded bg-terminal-purple/20 text-terminal-purple border border-terminal-purple/30 hover:bg-terminal-purple/30 transition-colors">
				<Phone class="w-3 h-3 inline mr-1" />
				RFQ
			</button>

			<!-- Spread Builder Toggle -->
			<button
				class="px-3 py-1 text-2xs font-medium rounded border transition-colors
					   {showSpreadBuilder ? 'bg-terminal-blue/20 text-terminal-blue border-terminal-blue/30' : 'border-terminal-border text-terminal-text-secondary hover:text-terminal-text'}"
				onclick={() => showSpreadBuilder = !showSpreadBuilder}
			>
				<Layers class="w-3 h-3 inline mr-1" />
				Spread
			</button>

			<!-- Column Settings -->
			<button
				class="p-1.5 rounded hover:bg-terminal-bg-hover transition-colors"
				onclick={() => showColumnSettings = !showColumnSettings}
			>
				<Settings class="w-3.5 h-3.5 text-terminal-text-secondary" />
			</button>
		</div>
	</div>

	<!-- Expiry + Filters Bar -->
	<div class="flex items-center gap-3 px-3 py-2 border-b border-terminal-border bg-terminal-bg">
		<!-- Expiry Tabs -->
		<div class="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-thin">
			{#each $optionChain.expiries as expiry}
				{@const daysToExpiry = Math.max(0, Math.ceil((new Date(expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))}
				<button
					class="px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all duration-150
						   {$selectedExpiry === expiry
							? 'bg-terminal-green/20 text-terminal-green border border-terminal-green/30'
							: 'text-terminal-text-secondary hover:text-terminal-text hover:bg-terminal-bg-hover border border-transparent'}"
					onclick={() => selectedExpiry.set(expiry)}
				>
					{formatDate(expiry)}
					<span class="ml-1 text-2xs opacity-60">{daysToExpiry}d</span>
				</button>
			{/each}
		</div>

		<div class="h-6 w-px bg-terminal-border"></div>

		<!-- View Mode -->
		<div class="flex items-center gap-1 bg-terminal-bg-secondary rounded p-0.5">
			<button
				class="px-2 py-1 text-2xs font-medium rounded {$optionViewMode === 'all' ? 'bg-terminal-bg-tertiary text-terminal-text' : 'text-terminal-text-muted hover:text-terminal-text'}"
				onclick={() => optionViewMode.set('all')}
			>All</button>
			<button
				class="px-2 py-1 text-2xs font-medium rounded {$optionViewMode === 'calls' ? 'bg-terminal-green/20 text-terminal-green' : 'text-terminal-text-muted hover:text-terminal-green'}"
				onclick={() => optionViewMode.set('calls')}
			>Calls</button>
			<button
				class="px-2 py-1 text-2xs font-medium rounded {$optionViewMode === 'puts' ? 'bg-terminal-red/20 text-terminal-red' : 'text-terminal-text-muted hover:text-terminal-red'}"
				onclick={() => optionViewMode.set('puts')}
			>Puts</button>
		</div>

		<!-- ATM Range Filter -->
		<div class="flex items-center gap-2 ml-auto">
			<span class="text-2xs text-terminal-text-muted">ATM ±</span>
			<select class="text-2xs bg-terminal-bg-secondary border border-terminal-border rounded px-2 py-1 text-terminal-text">
				<option>5 strikes</option>
				<option>10 strikes</option>
				<option>All strikes</option>
			</select>
		</div>
	</div>

	<!-- Column Settings Dropdown -->
	{#if showColumnSettings}
		<div class="px-3 py-2 border-b border-terminal-border bg-terminal-bg animate-slide-down">
			<div class="flex items-center gap-4 flex-wrap">
				<span class="text-2xs text-terminal-text-muted uppercase tracking-wider">Columns:</span>
				{#each Object.entries(visibleColumns) as [key, visible]}
					<label class="flex items-center gap-1.5 cursor-pointer">
						<input type="checkbox" bind:checked={visibleColumns[key as keyof typeof visibleColumns]} class="sr-only peer" />
						<div class="w-3.5 h-3.5 rounded border border-terminal-border bg-terminal-bg-secondary
									peer-checked:bg-terminal-green peer-checked:border-terminal-green
									flex items-center justify-center transition-all">
							{#if visible}
								<svg class="w-2 h-2 text-terminal-bg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
								</svg>
							{/if}
						</div>
						<span class="text-2xs text-terminal-text-secondary capitalize">{key}</span>
					</label>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Spread Builder Panel -->
	{#if showSpreadBuilder && spreadLegs.length > 0}
		<div class="px-3 py-2 border-b border-terminal-border bg-terminal-bg-tertiary animate-slide-down">
			<div class="flex items-center justify-between mb-2">
				<span class="text-xs font-medium">Spread Builder</span>
				<button class="text-2xs text-terminal-red hover:underline" onclick={clearSpread}>Clear All</button>
			</div>
			<div class="space-y-1">
				{#each spreadLegs as leg, i}
					<div class="flex items-center gap-2 text-2xs">
						<span class="{leg.side === 'buy' ? 'text-terminal-green' : 'text-terminal-red'} font-medium uppercase">{leg.side}</span>
						<span class="font-mono">{leg.quantity}x</span>
						<span class="text-terminal-text-secondary">{leg.contract.symbol}</span>
						<span class="font-mono">${leg.side === 'buy' ? leg.contract.ask.toFixed(2) : leg.contract.bid.toFixed(2)}</span>
						<button class="ml-auto text-terminal-text-muted hover:text-terminal-red" onclick={() => removeFromSpread(i)}>×</button>
					</div>
				{/each}
			</div>
			<div class="flex items-center justify-between mt-2 pt-2 border-t border-terminal-border">
				<div class="flex items-center gap-4 text-2xs">
					<span>Net: <span class="{spreadNetDebit > 0 ? 'text-terminal-red' : 'text-terminal-green'} font-mono">${Math.abs(spreadNetDebit).toFixed(2)} {spreadNetDebit > 0 ? 'debit' : 'credit'}</span></span>
					<span>Δ: <span class="font-mono">{spreadGreeks.delta.toFixed(3)}</span></span>
					<span>Θ: <span class="font-mono">{spreadGreeks.theta.toFixed(2)}</span></span>
				</div>
				<button class="px-3 py-1 text-2xs font-medium rounded bg-terminal-green text-terminal-bg hover:bg-terminal-green-dim transition-colors">
					Trade Spread
				</button>
			</div>
		</div>
	{/if}

	<!-- Options Table -->
	<div class="flex-1 overflow-auto">
		<table class="w-full text-2xs">
			<!-- Headers -->
			<thead class="sticky top-0 z-10">
				<tr class="bg-terminal-bg">
					<!-- Calls Header -->
					{#if $optionViewMode !== 'puts'}
						<th class="px-2 py-2 text-terminal-green font-medium text-center border-b border-terminal-border" colspan={Object.values(visibleColumns).filter(Boolean).length + 1}>
							<div class="flex items-center justify-center gap-1">
								<TrendingUp class="w-3 h-3" />
								CALLS
							</div>
						</th>
					{/if}

					<!-- Strike -->
					<th class="px-3 py-2 bg-terminal-bg-tertiary font-semibold text-center border-b border-terminal-border">Strike</th>

					<!-- Puts Header -->
					{#if $optionViewMode !== 'calls'}
						<th class="px-2 py-2 text-terminal-red font-medium text-center border-b border-terminal-border" colspan={Object.values(visibleColumns).filter(Boolean).length + 1}>
							<div class="flex items-center justify-center gap-1">
								<TrendingDown class="w-3 h-3" />
								PUTS
							</div>
						</th>
					{/if}
				</tr>
				<tr class="bg-terminal-bg-secondary text-terminal-text-muted uppercase tracking-wider">
					<!-- Calls Columns -->
					{#if $optionViewMode !== 'puts'}
						<th class="px-1 py-1.5 text-center border-b border-terminal-border w-8"></th>
						{#if visibleColumns.bid}<th class="px-2 py-1.5 text-right border-b border-terminal-border">Bid</th>{/if}
						{#if visibleColumns.ask}<th class="px-2 py-1.5 text-right border-b border-terminal-border">Ask</th>{/if}
						{#if visibleColumns.last}<th class="px-2 py-1.5 text-right border-b border-terminal-border">Last</th>{/if}
						{#if visibleColumns.iv}<th class="px-2 py-1.5 text-right border-b border-terminal-border">IV</th>{/if}
						{#if visibleColumns.delta}<th class="px-2 py-1.5 text-right border-b border-terminal-border">Δ</th>{/if}
						{#if visibleColumns.gamma}<th class="px-2 py-1.5 text-right border-b border-terminal-border">Γ</th>{/if}
						{#if visibleColumns.theta}<th class="px-2 py-1.5 text-right border-b border-terminal-border">Θ</th>{/if}
						{#if visibleColumns.vega}<th class="px-2 py-1.5 text-right border-b border-terminal-border">V</th>{/if}
						{#if visibleColumns.oi}<th class="px-2 py-1.5 text-right border-b border-terminal-border">OI</th>{/if}
						{#if visibleColumns.volume}<th class="px-2 py-1.5 text-right border-b border-terminal-border">Vol</th>{/if}
					{/if}

					<!-- Strike -->
					<th class="px-3 py-1.5 text-center bg-terminal-bg-tertiary border-b border-terminal-border font-bold">$</th>

					<!-- Puts Columns -->
					{#if $optionViewMode !== 'calls'}
						{#if visibleColumns.bid}<th class="px-2 py-1.5 text-right border-b border-terminal-border">Bid</th>{/if}
						{#if visibleColumns.ask}<th class="px-2 py-1.5 text-right border-b border-terminal-border">Ask</th>{/if}
						{#if visibleColumns.last}<th class="px-2 py-1.5 text-right border-b border-terminal-border">Last</th>{/if}
						{#if visibleColumns.iv}<th class="px-2 py-1.5 text-right border-b border-terminal-border">IV</th>{/if}
						{#if visibleColumns.delta}<th class="px-2 py-1.5 text-right border-b border-terminal-border">Δ</th>{/if}
						{#if visibleColumns.gamma}<th class="px-2 py-1.5 text-right border-b border-terminal-border">Γ</th>{/if}
						{#if visibleColumns.theta}<th class="px-2 py-1.5 text-right border-b border-terminal-border">Θ</th>{/if}
						{#if visibleColumns.vega}<th class="px-2 py-1.5 text-right border-b border-terminal-border">V</th>{/if}
						{#if visibleColumns.oi}<th class="px-2 py-1.5 text-right border-b border-terminal-border">OI</th>{/if}
						{#if visibleColumns.volume}<th class="px-2 py-1.5 text-right border-b border-terminal-border">Vol</th>{/if}
						<th class="px-1 py-1.5 text-center border-b border-terminal-border w-8"></th>
					{/if}
				</tr>
			</thead>

			<tbody>
				{#each sortedStrikes as strike (strike)}
					{@const contracts = groupedByStrike[strike]}
					{@const call = contracts.call}
					{@const put = contracts.put}
					{@const isATM = strike === atmStrike}
					<tr class="hover:bg-terminal-bg-hover transition-colors {isATM ? 'bg-terminal-yellow/5' : ''}">
						<!-- Call Data -->
						{#if $optionViewMode !== 'puts'}
							<td class="px-1 py-1 text-center border-b border-terminal-border/50">
								{#if call}
									<div class="flex gap-0.5 justify-center">
										<button
											class="w-5 h-5 rounded flex items-center justify-center text-terminal-green hover:bg-terminal-green/20 transition-colors"
											onclick={() => addToSpread(call, 'buy')}
											title="Buy"
										><Plus class="w-3 h-3" /></button>
										<button
											class="w-5 h-5 rounded flex items-center justify-center text-terminal-red hover:bg-terminal-red/20 transition-colors"
											onclick={() => addToSpread(call, 'sell')}
											title="Sell"
										><Minus class="w-3 h-3" /></button>
									</div>
								{/if}
							</td>
							<td
								class="px-2 py-1 text-right font-mono border-b border-terminal-border/50 cursor-pointer {getContractClass(call)} {$selectedOption?.symbol === call?.symbol ? 'bg-terminal-blue/20' : ''}"
								onclick={() => selectContract(call)}
							>
								{#if visibleColumns.bid && call}<span class="text-terminal-green">{call.bid.toFixed(2)}</span>{/if}
							</td>
							<td
								class="px-2 py-1 text-right font-mono border-b border-terminal-border/50 cursor-pointer {getContractClass(call)} {$selectedOption?.symbol === call?.symbol ? 'bg-terminal-blue/20' : ''}"
								onclick={() => selectContract(call)}
							>
								{#if visibleColumns.ask && call}<span class="text-terminal-red">{call.ask.toFixed(2)}</span>{/if}
							</td>
							{#if visibleColumns.last}
								<td class="px-2 py-1 text-right font-mono text-terminal-text-secondary border-b border-terminal-border/50 {getContractClass(call)}">
									{call?.last.toFixed(2) || '-'}
								</td>
							{/if}
							{#if visibleColumns.iv}
								<td class="px-2 py-1 text-right font-mono text-terminal-yellow border-b border-terminal-border/50 {getContractClass(call)}">
									{call ? formatIV(call.iv) : '-'}
								</td>
							{/if}
							{#if visibleColumns.delta}
								<td class="px-2 py-1 text-right font-mono border-b border-terminal-border/50 {getContractClass(call)}">
									{call ? formatGreek(call.delta, 3) : '-'}
								</td>
							{/if}
							{#if visibleColumns.gamma}
								<td class="px-2 py-1 text-right font-mono text-terminal-text-muted border-b border-terminal-border/50 {getContractClass(call)}">
									{call ? formatGreek(call.gamma, 4) : '-'}
								</td>
							{/if}
							{#if visibleColumns.theta}
								<td class="px-2 py-1 text-right font-mono text-terminal-red/70 border-b border-terminal-border/50 {getContractClass(call)}">
									{call ? formatGreek(call.theta, 2) : '-'}
								</td>
							{/if}
							{#if visibleColumns.vega}
								<td class="px-2 py-1 text-right font-mono text-terminal-blue/70 border-b border-terminal-border/50 {getContractClass(call)}">
									{call ? formatGreek(call.vega, 2) : '-'}
								</td>
							{/if}
							{#if visibleColumns.oi}
								<td class="px-2 py-1 text-right font-mono text-terminal-text-muted border-b border-terminal-border/50 {getContractClass(call)}">
									{call?.openInterest.toLocaleString() || '-'}
								</td>
							{/if}
							{#if visibleColumns.volume}
								<td class="px-2 py-1 text-right font-mono text-terminal-text-muted border-b border-terminal-border/50 {getContractClass(call)}">
									{call?.volume.toLocaleString() || '-'}
								</td>
							{/if}
						{/if}

						<!-- Strike -->
						<td class="px-3 py-1.5 text-center font-mono font-bold bg-terminal-bg-tertiary border-b border-terminal-border {isATM ? 'text-terminal-yellow' : 'text-terminal-text'}">
							{strike.toLocaleString()}
							{#if isATM}
								<span class="ml-1 text-2xs text-terminal-yellow">ATM</span>
							{/if}
						</td>

						<!-- Put Data -->
						{#if $optionViewMode !== 'calls'}
							{#if visibleColumns.bid}
								<td
									class="px-2 py-1 text-right font-mono border-b border-terminal-border/50 cursor-pointer {getContractClass(put)} {$selectedOption?.symbol === put?.symbol ? 'bg-terminal-blue/20' : ''}"
									onclick={() => selectContract(put)}
								>
									{#if put}<span class="text-terminal-green">{put.bid.toFixed(2)}</span>{/if}
								</td>
							{/if}
							{#if visibleColumns.ask}
								<td
									class="px-2 py-1 text-right font-mono border-b border-terminal-border/50 cursor-pointer {getContractClass(put)} {$selectedOption?.symbol === put?.symbol ? 'bg-terminal-blue/20' : ''}"
									onclick={() => selectContract(put)}
								>
									{#if put}<span class="text-terminal-red">{put.ask.toFixed(2)}</span>{/if}
								</td>
							{/if}
							{#if visibleColumns.last}
								<td class="px-2 py-1 text-right font-mono text-terminal-text-secondary border-b border-terminal-border/50 {getContractClass(put)}">
									{put?.last.toFixed(2) || '-'}
								</td>
							{/if}
							{#if visibleColumns.iv}
								<td class="px-2 py-1 text-right font-mono text-terminal-yellow border-b border-terminal-border/50 {getContractClass(put)}">
									{put ? formatIV(put.iv) : '-'}
								</td>
							{/if}
							{#if visibleColumns.delta}
								<td class="px-2 py-1 text-right font-mono border-b border-terminal-border/50 {getContractClass(put)}">
									{put ? formatGreek(put.delta, 3) : '-'}
								</td>
							{/if}
							{#if visibleColumns.gamma}
								<td class="px-2 py-1 text-right font-mono text-terminal-text-muted border-b border-terminal-border/50 {getContractClass(put)}">
									{put ? formatGreek(put.gamma, 4) : '-'}
								</td>
							{/if}
							{#if visibleColumns.theta}
								<td class="px-2 py-1 text-right font-mono text-terminal-red/70 border-b border-terminal-border/50 {getContractClass(put)}">
									{put ? formatGreek(put.theta, 2) : '-'}
								</td>
							{/if}
							{#if visibleColumns.vega}
								<td class="px-2 py-1 text-right font-mono text-terminal-blue/70 border-b border-terminal-border/50 {getContractClass(put)}">
									{put ? formatGreek(put.vega, 2) : '-'}
								</td>
							{/if}
							{#if visibleColumns.oi}
								<td class="px-2 py-1 text-right font-mono text-terminal-text-muted border-b border-terminal-border/50 {getContractClass(put)}">
									{put?.openInterest.toLocaleString() || '-'}
								</td>
							{/if}
							{#if visibleColumns.volume}
								<td class="px-2 py-1 text-right font-mono text-terminal-text-muted border-b border-terminal-border/50 {getContractClass(put)}">
									{put?.volume.toLocaleString() || '-'}
								</td>
							{/if}
							<td class="px-1 py-1 text-center border-b border-terminal-border/50">
								{#if put}
									<div class="flex gap-0.5 justify-center">
										<button
											class="w-5 h-5 rounded flex items-center justify-center text-terminal-green hover:bg-terminal-green/20 transition-colors"
											onclick={() => addToSpread(put, 'buy')}
											title="Buy"
										><Plus class="w-3 h-3" /></button>
										<button
											class="w-5 h-5 rounded flex items-center justify-center text-terminal-red hover:bg-terminal-red/20 transition-colors"
											onclick={() => addToSpread(put, 'sell')}
											title="Sell"
										><Minus class="w-3 h-3" /></button>
									</div>
								{/if}
							</td>
						{/if}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
{/if}
