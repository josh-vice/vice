import { describe, expect, test } from 'bun:test';

describe('US-003 mobile chart parity', () => {
	test('mobile timeframe controls use the shared chart timeframe action', async () => {
		const source = await Bun.file(new URL('../routes/+page.svelte', import.meta.url)).text();
		expect(source).toContain('chartTimeframe, setChartTimeframe');
		expect(source).toContain('tf === $chartTimeframe');
		expect(source).toContain('onclick={() => setChartTimeframe(tf)}');
	});

	test('mobile trading uses the shared chart, market data, and order ticket surfaces', async () => {
		const source = await Bun.file(new URL('../routes/+page.svelte', import.meta.url)).text();
		const sheet = await Bun.file(new URL('./components/MobileOrderSheet.svelte', import.meta.url)).text();

		expect(source).toContain("import Chart from '$lib/components/Chart.svelte'");
		expect(source).toContain("import OrderBook from '$lib/components/OrderBook.svelte'");
		expect(source).toContain("import RecentTrades from '$lib/components/RecentTrades.svelte'");
		expect(source).toContain("import MobileOrderSheet from '$lib/components/MobileOrderSheet.svelte'");
		expect(source).toContain("orderSide.set('buy'); orderSheetOpen = true");
		expect(source).toContain("orderSide.set('sell'); orderSheetOpen = true");
		expect(source).toContain('<MobileOrderSheet bind:open={orderSheetOpen} />');

		expect(sheet).toContain("import OrderTicket from '$lib/components/OrderTicket.svelte'");
		expect(sheet).toContain('<OrderTicket />');
		expect(sheet).toContain('max-height: 90dvh');
		expect(sheet).toContain('role="dialog"');
		expect(sheet).toContain('ontouchend={onTouchEnd}');
	});

	test('mobile order entry does not create a second execution path', async () => {
		const sheet = await Bun.file(new URL('./components/MobileOrderSheet.svelte', import.meta.url)).text();
		expect(sheet).not.toContain('placeOrder(');
		expect(sheet).not.toContain('fetch(');
		expect(sheet).not.toContain('mock');
	});
});
