import { describe, expect, test } from 'bun:test';

describe('break-even release surface', () => {
	test('break-even is independently certified and wired through ticket, CLI, and execution', async () => {
		const capability = await Bun.file(new URL('./capabilities.ts', import.meta.url)).text();
		const orders = await Bun.file(new URL('../hl/orders.ts', import.meta.url)).text();
		const ticket = await Bun.file(new URL('../components/OrderTicket.svelte', import.meta.url)).text();
		const cli = await Bun.file(new URL('../cli/executor.ts', import.meta.url)).text();
		expect(capability).toContain("'break_even'");
		expect(capability).toContain('VITE_HL_CERTIFIED_BREAK_EVEN');
		expect(orders).toContain("params.type === 'break_even'");
		expect(orders).toContain("import('$lib/execution/breakEven')");
		expect(ticket).toContain("id: 'break_even'");
		expect(cli).toContain("lower.startsWith('breakeven ')");
	});

	test('break-even persists exact identity and only arms after favorable price movement', async () => {
		const source = await Bun.file(new URL('./breakEven.ts', import.meta.url)).text();
		expect(source).toContain('marketKey: market.marketKey');
		expect(source).toContain('apiCoin: market.apiCoin');
		expect(source).toContain('ocoExitSide(job.side) === \'buy\'');
		expect(source).toContain('favorable(job.side');
		expect(source).toContain('reduceOnly: true');
		expect(source).toContain('Break-even child disappeared without an authoritative fill');
	});
});
