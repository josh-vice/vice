<script lang="ts">
	import { onMount } from 'svelte';
	import { updateAvailable, isOffline, reloadForUpdate, registerPwa, pwaSupported } from '$lib/pwa';

	// Client-only: the stores and registration require a browser. SSR renders
	// nothing so the offline/update banner is never part of the static shell.
	let mounted = false;
	let supported = false;
	onMount(() => {
		mounted = true;
		supported = pwaSupported();
		registerPwa();
	});
</script>

{#if mounted}
	{#if $isOffline}
		<div
			data-testid="pwa-offline-banner"
			class="fixed bottom-3 left-1/2 -translate-x-1/2 z-[9999] rounded border border-terminal-yellow/50 bg-terminal-bg-panel/95 px-3 py-1.5 text-2xs font-mono text-terminal-yellow shadow-lg backdrop-blur"
			role="status"
			aria-live="polite"
		>
			OFFLINE — market data is stale or unavailable. Trading stays fail-closed until the venue reconnects.
		</div>
	{:else if supported && $updateAvailable}
		<div
			data-testid="pwa-update-banner"
			class="fixed bottom-3 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 rounded border border-terminal-green/50 bg-terminal-bg-panel/95 px-3 py-1.5 font-mono text-2xs text-terminal-text shadow-lg backdrop-blur"
			role="status"
			aria-live="polite"
		>
			<span class="text-terminal-green">UPDATE AVAILABLE</span>
			<button data-action-id="ui.src.lib.components.pwabanner.button.ha65c0f110c"
				data-testid="pwa-reload-button"
				type="button"
				class="terminal-btn terminal-btn-primary !px-2 !py-0.5 !text-2xs"
				onclick={reloadForUpdate}
			>
				RELOAD
			</button>
		</div>
	{/if}
{/if}
