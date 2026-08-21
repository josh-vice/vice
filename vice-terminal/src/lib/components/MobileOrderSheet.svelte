<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { orderSide } from '$lib/stores';
	import OrderTicket from '$lib/components/OrderTicket.svelte';
	import { X } from 'lucide-svelte';

	export let open = false;

	const dispatch = createEventDispatcher();

	function close() {
		open = false;
		dispatch('close');
	}

	// Swipe-down to dismiss
	let startY = 0;
	let dragY = 0;
	let dragging = false;

	function onTouchStart(e: TouchEvent) {
		startY = e.touches[0].clientY;
		dragging = true;
	}
	function onTouchMove(e: TouchEvent) {
		if (!dragging) return;
		dragY = Math.max(0, e.touches[0].clientY - startY);
	}
	function onTouchEnd() {
		if (dragY > 90) close();
		dragY = 0;
		dragging = false;
	}

	// The swipe threshold still closes the sheet; the live drag offset is not
	// rendered because the production CSP (style-src 'self', nonce mode) blocks
	// inline style application — the sheet hides via the compiled
	// `translate-y-full` class instead.
</script>

<!-- Backdrop -->
{#if open}
	<button
		class="fixed inset-0 z-40 bg-black/60"
		onclick={close}
		aria-label="Close order sheet"
		tabindex="-1"
	></button>
{/if}

<!-- Bottom Sheet -->
<div
	class="fixed bottom-0 left-0 right-0 z-50 flex flex-col bg-terminal-bg-panel border-t border-terminal-border rounded-t-2xl shadow-2xl transition-transform duration-300 max-h-[90dvh] {open ? '' : 'translate-y-full'}"
	aria-hidden={!open}
	aria-modal="true"
	role="dialog"
>
	<!-- Drag handle -->
	<div
		class="pt-3 pb-1 flex justify-center flex-shrink-0 cursor-grab active:cursor-grabbing"
		role="button"
		tabindex="0"
		aria-label="Drag to close"
		ontouchstart={onTouchStart}
		ontouchmove={onTouchMove}
		ontouchend={onTouchEnd}
	>
		<div class="w-10 h-1 rounded-full bg-terminal-border-light"></div>
	</div>

	<!-- Sheet header: symbol + side indicator + close -->
	<div class="flex items-center justify-between px-4 py-2 flex-shrink-0 border-b border-terminal-border">
		<div class="flex items-center gap-2">
			<span class="text-sm font-semibold text-terminal-text">Order</span>
			<span class="px-2 py-0.5 rounded text-2xs font-bold {$orderSide === 'buy' ? 'bg-terminal-green/15 text-terminal-green' : 'bg-terminal-red/15 text-terminal-red'}">
				{$orderSide === 'buy' ? 'Buy / Long' : 'Sell / Short'}
			</span>
		</div>
		<button
			class="w-7 h-7 flex items-center justify-center rounded-full bg-terminal-bg-secondary text-terminal-text-muted hover:text-terminal-text transition-colors"
			onclick={close}
			aria-label="Close"
		>
			<X class="w-4 h-4" />
		</button>
	</div>

	<!-- Full OrderTicket — same component as desktop, same stores. Only mount
	     it while the sheet is open so the closed, off-screen sheet does not
	     duplicate the desktop ticket's DOM markers (order-persistence-class). -->
	{#if open}
		<div class="flex-1 min-h-0 overflow-hidden">
			<OrderTicket />
		</div>
	{/if}
</div>
