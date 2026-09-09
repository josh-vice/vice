import { describe, expect, test } from 'bun:test';

test('order ticket exposes live-book preview and exact HIP-3 routing identity', async () => {
	const source = await Bun.file(new URL('./OrderTicket.svelte', import.meta.url)).text();
	for (const token of [
		'estimateOrderPreview',
		'data-testid="order-preview"',
		'data-testid="order-preview-live-status"',
		'$marketDataStatus === \'live\' ? $orderBook : EMPTY_ORDER_BOOK',
		'displayedDepthSize',
		'Fee estimate',
		'fee tier not loaded',
		'data-testid="hip3-routing-disclosure"',
		'$selectedMarket.apiCoin',
		'marketMatches($selectedMarket, position.apiCoin, position.marketKey)',
		'accountLive: $isConnected && $accountSyncStatus === \'live\' && !$privacyMode',
		'recordSubmit(result.executionAttempted === true)'
	]) expect(source).toContain(token);
});
