<script lang="ts">
	import OrderBook from './OrderBook.svelte';
	import RecentTrades from './RecentTrades.svelte';
</script>

<div class="h-full min-h-0 flex flex-col bg-terminal-bg-panel">
	<div class="flex-1 min-h-0 border-b border-terminal-border"><OrderBook /></div>
	<div class="h-[42%] min-h-0 flex-shrink-0"><RecentTrades /></div>
</div>
