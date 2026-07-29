<script lang="ts">
	import { cliOpen, cliHistory } from '$lib/stores';
	import { executeCliCommand } from '$lib/stores';
	import { onMount, tick } from 'svelte';
	import { Terminal, X, ChevronUp, ChevronDown, Maximize2, Minimize2 } from 'lucide-svelte';

	let inputValue = '';
	let inputRef: HTMLInputElement;
	let historyRef: HTMLDivElement;
	let historyIndex = -1;
	let commandHistory: string[] = [];
	let isExpanded = false;

	const suggestions = [
		'buy 1 BTC-PERP @ market',
		'sell 0.5 BTC-PERP @ 68000',
		'buy 1 BTC-28JUN24-70000-C @ market',
		'scale buy 5 BTC-PERP 65000-67000',
		'twap buy 10 BTC-PERP 30m',
		'chase sell 2 ETH-PERP +0.1%',
		'cancel all',
		'pos',
		'balance',
		'help'
	];

	let filteredSuggestions: string[] = [];
	let showSuggestions = false;
	let selectedSuggestion = -1;

	async function handleSubmit() {
		if (!inputValue.trim()) return;

		const pending = inputValue;
		commandHistory = [pending, ...commandHistory.slice(0, 50)];
		inputValue = '';
		historyIndex = -1;
		showSuggestions = false;

		await executeCliCommand(pending);

		await tick().then(() => {
			if (historyRef) {
				historyRef.scrollTop = historyRef.scrollHeight;
			}
		});
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'ArrowUp') {
			e.preventDefault();
			if (showSuggestions && selectedSuggestion > 0) {
				selectedSuggestion--;
			} else if (!showSuggestions && historyIndex < commandHistory.length - 1) {
				historyIndex++;
				inputValue = commandHistory[historyIndex];
			}
		} else if (e.key === 'ArrowDown') {
			e.preventDefault();
			if (showSuggestions && selectedSuggestion < filteredSuggestions.length - 1) {
				selectedSuggestion++;
			} else if (!showSuggestions && historyIndex > 0) {
				historyIndex--;
				inputValue = commandHistory[historyIndex];
			} else if (!showSuggestions && historyIndex === 0) {
				historyIndex = -1;
				inputValue = '';
			}
		} else if (e.key === 'Tab' && showSuggestions && filteredSuggestions.length > 0) {
			e.preventDefault();
			inputValue = filteredSuggestions[Math.max(0, selectedSuggestion)];
			showSuggestions = false;
		} else if (e.key === 'Escape') {
			showSuggestions = false;
			if ($cliOpen) {
				cliOpen.set(false);
			}
		}
	}

	function handleInput() {
		if (inputValue.length > 0) {
			filteredSuggestions = suggestions.filter(s =>
				s.toLowerCase().startsWith(inputValue.toLowerCase())
			);
			showSuggestions = filteredSuggestions.length > 0;
			selectedSuggestion = 0;
		} else {
			showSuggestions = false;
		}
	}

	function selectSuggestion(suggestion: string) {
		inputValue = suggestion;
		showSuggestions = false;
		inputRef?.focus();
	}

	$: if ($cliOpen && inputRef) {
		tick().then(() => inputRef?.focus());
	}

	function getOutputClass(type: string): string {
		switch (type) {
			case 'success': return 'text-terminal-green';
			case 'error': return 'text-terminal-red';
			default: return 'text-terminal-text-secondary';
		}
	}

	function formatTimestamp(ts: number): string {
		return new Date(ts).toLocaleTimeString('en-US', { hour12: false });
	}
</script>

{#if $cliOpen}
	<div
		class="fixed bottom-0 left-0 right-0 bg-terminal-bg border-t border-terminal-border shadow-2xl z-50
			   animate-slide-up transition-all duration-200 {isExpanded ? 'h-96' : 'h-64'}"
	>
		<!-- Header -->
		<div class="flex items-center justify-between px-4 py-2 border-b border-terminal-border bg-terminal-bg-secondary">
			<div class="flex items-center gap-3">
				<div class="flex items-center gap-2 text-terminal-green">
					<Terminal class="w-4 h-4" />
					<span class="font-mono text-sm font-medium">noosphere-cli</span>
				</div>
				<span class="text-2xs text-terminal-text-muted">Press ESC to close • Tab to autocomplete • ↑↓ for history • ; chains commands</span>
			</div>
			<div class="flex items-center gap-1">
				<button
					class="p-1.5 rounded hover:bg-terminal-bg-hover text-terminal-text-secondary hover:text-terminal-text transition-colors"
					onclick={() => isExpanded = !isExpanded}
				>
					{#if isExpanded}
						<Minimize2 class="w-4 h-4" />
					{:else}
						<Maximize2 class="w-4 h-4" />
					{/if}
				</button>
				<button
					class="p-1.5 rounded hover:bg-terminal-red/20 text-terminal-text-secondary hover:text-terminal-red transition-colors"
					onclick={() => cliOpen.set(false)}
				>
					<X class="w-4 h-4" />
				</button>
			</div>
		</div>

		<!-- History -->
		<div
			bind:this={historyRef}
			class="flex-1 overflow-y-auto p-4 font-mono text-sm space-y-2"
			style="height: calc(100% - 88px);"
		>
			{#if $cliHistory.length === 0}
				<div class="text-terminal-text-muted text-center py-8">
					<p class="mb-2">Welcome to noosphere-cli</p>
					<p class="text-2xs">Type <span class="text-terminal-green">help</span> for available commands</p>
					<div class="mt-4 text-left max-w-md mx-auto text-2xs space-y-1">
						<p class="text-terminal-text-muted">Quick commands:</p>
						<p><span class="text-terminal-yellow">buy</span>/<span class="text-terminal-yellow">sell</span> [size] [symbol] @ [price]</p>
						<p><span class="text-terminal-yellow">scale</span> [side] [qty] [symbol] [range]</p>
						<p><span class="text-terminal-yellow">twap</span> [side] [qty] [symbol] [duration]</p>
						<p><span class="text-terminal-yellow">chase</span> [side] [qty] [symbol] [offset]</p>
						<p><span class="text-terminal-yellow">pos</span> - show positions</p>
						<p><span class="text-terminal-yellow">bal</span> - show balances</p>
						<p><span class="text-terminal-yellow">cancel</span> [all|orderId]</p>
						<p><span class="text-terminal-yellow">;</span> runs steps in order and stops on the first error</p>
						<p><span class="text-terminal-yellow">repeat</span> 3 pos • bounded to 10 and stops on the first error</p>
						<p><span class="text-terminal-yellow">set</span> size=1 • <span class="text-terminal-yellow">alias</span> fast=buy $size BTC-PERP @ market</p>
					</div>
				</div>
			{:else}
				{#each $cliHistory as cmd}
					<div class="space-y-1">
						<div class="flex items-center gap-2">
							<span class="text-terminal-green">❯</span>
							<span class="text-terminal-text">{cmd.input}</span>
							<span class="text-2xs text-terminal-text-muted ml-auto">{formatTimestamp(cmd.timestamp)}</span>
						</div>
						<div class="pl-4 {getOutputClass(cmd.type)}">
							{cmd.output}
						</div>
					</div>
				{/each}
			{/if}
		</div>

		<!-- Input -->
		<div class="relative border-t border-terminal-border">
			{#if showSuggestions}
				<div class="absolute bottom-full left-0 right-0 bg-terminal-bg-secondary border border-terminal-border rounded-t-lg mb-1 mx-4 overflow-hidden shadow-xl">
					{#each filteredSuggestions.slice(0, 5) as suggestion, i}
						<button
							class="w-full text-left px-4 py-2 text-sm font-mono transition-colors
								   {i === selectedSuggestion ? 'bg-terminal-bg-tertiary text-terminal-green' : 'text-terminal-text-secondary hover:bg-terminal-bg-hover'}"
							onclick={() => selectSuggestion(suggestion)}
						>
							{suggestion}
						</button>
					{/each}
				</div>
			{/if}

			<div class="flex items-center gap-3 px-4 py-3 bg-terminal-bg">
				<span class="text-terminal-green font-mono">❯</span>
				<input
					bind:this={inputRef}
					bind:value={inputValue}
					type="text"
					placeholder="Enter command..."
					class="flex-1 bg-transparent font-mono text-sm outline-none placeholder:text-terminal-text-muted"
					onkeydown={handleKeyDown}
					oninput={handleInput}
					onkeypress={(e) => e.key === 'Enter' && handleSubmit()}
				/>
				<button
					class="px-3 py-1.5 rounded bg-terminal-green text-terminal-bg font-medium text-xs hover:bg-terminal-green-dim transition-colors"
					onclick={handleSubmit}
				>
					Run
				</button>
			</div>
		</div>
	</div>
{/if}

<svelte:window on:keydown={(e) => {
	if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
		e.preventDefault();
		cliOpen.update(v => !v);
	}
}} />
