import { describe, expect, test } from 'bun:test';

describe('POV release surface', () => {
	test('POV is catalogued and wired through the execution path', async () => {
		const capability = await Bun.file(new URL('./capabilities.ts', import.meta.url)).text();
		const orders = await Bun.file(new URL('../hl/orders.ts', import.meta.url)).text();
		const cli = await Bun.file(new URL('../cli/executor.ts', import.meta.url)).text();
		const model = await Bun.file(new URL('../orderTicketModel.ts', import.meta.url)).text();
		expect(capability).toContain("'pov'");
		expect(capability).toContain('VITE_HL_CERTIFIED_POV');
		expect(orders).toContain("params.type === 'pov'");
		expect(orders).toContain("import('$lib/execution/pov')");
		expect(model).toContain("id: 'pov'");
		expect(cli).toContain("lower.startsWith('pov ')");
	});

	test('POV persists exact identity and refuses to start without live public flow', async () => {
		const source = await Bun.file(new URL('./pov.ts', import.meta.url)).text();
		expect(source).toContain('marketKey: market.marketKey');
		expect(source).toContain('apiCoin: market.apiCoin');
		expect(source).toContain('POV requires live public trade flow');
		expect(source).toContain('participationSlice');
	});
});
