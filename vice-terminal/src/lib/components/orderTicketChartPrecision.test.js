// @ts-nocheck
import { describe, expect, test } from 'bun:test';

describe('US-CT-001 ticket precision contract', () => {
	test('uses the selected market price step for chart-linked price inputs', async () => {
		const source = await Bun.file(new URL('./OrderTicket.svelte', import.meta.url)).text();
		expect(source).toContain("chartPriceStep = priceFormatForMarket($selectedMarket).minMove");
		expect(source).toContain('aria-label="Order price"');
		expect(source).toContain('aria-label="Trigger price"');
		expect(source).toContain('step={chartPriceStep}');
	});
});
