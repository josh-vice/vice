import { describe, expect, test } from 'bun:test';

describe('local execution account boundary', () => {
	test('revalidates the displayed wallet account before every signed mutation family', async () => {
		const source = await Bun.file(new URL('./localExecution.ts', import.meta.url)).text();
		expect(source).toContain('private provider: EIP1193Provider | null = null;');
		expect(source).toContain('this.provider = provider;');
		expect(source).toContain('await this.assertCurrentAccount();');
		expect(source).toContain('private async assertCurrentAccount(): Promise<void>');
		expect(source).toContain('await assertProviderAccount(this.provider, this.mainAddress);');

		for (const method of ['placeOrder', 'cancelOrder', 'placeTwap', 'cancelTwap', 'armDeadman', 'clearDeadman', 'placeScale', 'modifyOrder']) {
			const start = source.indexOf(`async ${method}`);
			const end = source.indexOf('\n\tasync ', start + 1);
			expect(start).toBeGreaterThanOrEqual(0);
			expect(source.slice(start, end < 0 ? source.length : end)).toContain('await this.assertCurrentAccount();');
		}
	});

	test('successful cancel acknowledgements preserve the cancelled venue order id', async () => {
		const source = await Bun.file(new URL('./localExecution.ts', import.meta.url)).text();
		const start = source.indexOf('async cancelOrder(');
		const end = source.indexOf('\n\tasync placeTwap(', start);
		const block = source.slice(start, end);
		expect(block).toContain('return this.ack(commandId, sequence, receiveUs, sendUs, true, [orderId], undefined, false, outcome.reconciled);');
	});
});
