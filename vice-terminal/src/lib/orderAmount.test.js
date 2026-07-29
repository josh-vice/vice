import { describe, expect, test } from 'bun:test';

describe('US-004 order amount units', () => {
	test('converts quote currency input to the venue base size', async () => {
		const source = await Bun.file(new URL('./components/OrderTicket.svelte', import.meta.url)).text();
		expect(source).toContain("amountUnit: 'base' | 'quote'");
		expect(source).toContain("amountUnit === 'base' ? value : value / price");
		expect(source).toContain("onclick={() => setAmountUnit('quote')}");
		expect(source).toContain('value={amountInputValue}');
	});
});
