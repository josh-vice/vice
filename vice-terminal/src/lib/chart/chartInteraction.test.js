import { describe, expect, test } from 'bun:test';

describe('US-003 chart interaction safety', () => {
	test('keeps context-menu submission explicitly armed and restores drag pending state when identity is missing', async () => {
		const source = await Bun.file(new URL('../components/Chart.svelte', import.meta.url)).text();
		expect(source).toContain('if (readOnly || !$clickPlacementMode || !$selectedMarket) return;');
		expect(source).toContain('if (readOnly) return;');
		expect(source).toContain('event.preventDefault();');
		expect(source).toContain('Order has no authoritative Hyperliquid identity; modification was not sent');
		expect(source).toContain('candidate.id === orderId ? { ...candidate, pending: false }');
		expect(source).toContain('crossSpreadWarning = warning ??');
		expect(source).toContain("order.pending ? 'PENDING' : order.status.toUpperCase()");
		expect(source).toContain('liquidation:${position.id}');
		expect(source).toContain("$selectedMarket?.apiCoin ?? $selectedMarket?.marketKey");
		expect(source).toContain('scheduleOverlayCoordinates();');
		expect(source).toContain('transition-[top] duration-150');
		expect(source).toContain("$accountSyncStatus === 'live'");
		expect(source).toContain("$marketDataStatus !== 'live'");
		expect(source).toContain('Account state is not reconciled; Click Placement is paused until it is live');
		expect(source).toContain('Private chart overlays paused while account state is');
		expect(source).toContain("unavailableFeedMessage('price history', $marketDataStatus)");
		expect(source).not.toContain("const datasetKey = `${$selectedMarket?.symbol");
	});

	test('does not keep cached private rows actionable during stale account sync', async () => {
		const panel = await Bun.file(new URL('../components/BottomPanel.svelte', import.meta.url)).text();
		expect(panel).toContain("$accountSyncStatus === 'live'");
		expect(panel).toContain('Private account rows are hidden until the authoritative account snapshot is live');
		expect(panel).toContain('privateStateLive ? $openOrders.length : 0');
	});

	test('keeps trigger identity and reports the authoritative trigger field on rejection', async () => {
		const source = await Bun.file(new URL('../execution/localExecution.ts', import.meta.url)).text();
		expect(source).toContain("const isTrigger = order.type === 'stop' || order.type === 'stop_limit' || order.triggerPrice != null;");
		expect(source).toContain("tpsl: order.triggerKind === 'takeProfit' ? 'tp' : 'sl'");
		// Trigger identity is preserved into the journal's authoritative field so
		// a trigger modify reconciles (and rejects) against triggerPx, not limitPx.
		expect(source).toContain("targetField: isTrigger ? 'triggerPx' : 'limitPx'");
		// The shared reconcile primitive picks the authoritative price field from
		// that targetField when classifying the replacement order.
		const primitive = await Bun.file(new URL('../execution/modifyReconcile.ts', import.meta.url)).text();
		expect(primitive).toContain("opts.targetField === 'triggerPx' ? replacement.triggerPx : replacement.limitPx");
	});

	test('routes chart submissions with the exact selected market identity', async () => {
		const source = await Bun.file(new URL('./clickTrading.ts', import.meta.url)).text();
		expect(source).toContain('selectedMarket');
		expect(source).toContain('marketKey: get(selectedMarket)?.marketKey');
	});
});
