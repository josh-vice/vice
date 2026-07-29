import { expect, test } from 'bun:test';

test('US-010 position controls delegate every close route to the exact-identity boundary', async () => {
	const source = await Bun.file(new URL('./BottomPanel.svelte', import.meta.url)).text();
	expect(source).toContain('buildPositionCloseIntent(position, $marketRegistry, $selectedMarket, $orderBook, mode)');
	expect(source).toContain("closePosition(position.id, 'market')");
	expect(source).toContain("closePosition(position.id, 'quote')");
	expect(source).toContain("closePositionTwap(position.id, 5)");
	expect(source).toContain('openScaleClose(position.id)');
	expect(source).toContain('async function closePositionScale(positionId: string)');
	expect(source).toContain("type: 'scale'");
	expect(source).toContain('postOnly: false');
	expect(source).toContain('buildPositionCloseIntent(position, $marketRegistry, $selectedMarket, $orderBook, \'market\')');
	expect(source).toContain("buildPositionCloseIntent(position, $marketRegistry, $selectedMarket, $orderBook, 'market')");
	expect(source).toContain('startAlgoOrder({ ...close.intent, type: \'twap\'');
	expect(source).toContain("Account state is stale; position controls are paused until reconciliation completes");
	expect(source).toContain('buildPositionReversePlan(position, $marketRegistry, $selectedMarket, $orderBook)');
	expect(source).toContain('Confirm reverse');
});
