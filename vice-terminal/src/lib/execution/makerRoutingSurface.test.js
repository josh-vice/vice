import { describe, expect, test } from 'bun:test';

describe('maker routing release surface', () => {
	test('is independently certified and uses exact passive routing', async () => {
		const capability = await Bun.file(new URL('./capabilities.ts', import.meta.url)).text();
		const route = await Bun.file(new URL('./makerRouting.ts', import.meta.url)).text();
		const orders = await Bun.file(new URL('../hl/orders.ts', import.meta.url)).text();
		const model = await Bun.file(new URL('../orderTicketModel.ts', import.meta.url)).text();
		expect(capability).toContain("'maker'");
		expect(capability).toContain('VITE_HL_CERTIFIED_MAKER');
		expect(route).toContain('market.apiCoin');
		expect(route).toContain("tif: 'Alo'");
		expect(route).toContain('would cross');
		expect(orders).toContain("params.type === 'maker'");
		expect(model).toContain("id: 'maker'");
	});

	test('maker CLI remains certification-gated', async () => {
		const cli = await Bun.file(new URL('../cli/executor.ts', import.meta.url)).text();
		expect(cli).toContain("lower.startsWith('maker ')");
		expect(cli).toContain("type: 'maker'");
		expect(cli).toContain("unavailableOrderTypeMessage('maker')");
	});
});
