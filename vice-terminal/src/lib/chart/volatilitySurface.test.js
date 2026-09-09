import { describe, expect, test } from 'bun:test';

describe('volatility sizing release surface', () => {
	test('keeps volatility sizing behind an independent certification flag', async () => {
		const utility = await Bun.file(new URL('./volatilitySizing.ts', import.meta.url)).text();
		const ticket = await Bun.file(new URL('../components/OrderTicket.svelte', import.meta.url)).text();
		expect(utility).toContain("VITE_HL_CERTIFIED_VOLATILITY_SIZING === 'true'");
		expect(ticket).toContain('volatilitySizingCertified()');
		expect(ticket).toContain('volatilityBasedSize');
	});

	test('volatility sizing uses authenticated chart candles and authoritative account state', async () => {
		const ticket = await Bun.file(new URL('../components/OrderTicket.svelte', import.meta.url)).text();
		expect(ticket).toContain('candles: $chartCandles');
		expect(ticket).toContain('equity: $activeSubaccount.equity');
		expect(ticket).toContain('marginFree: $activeSubaccount.marginFree');
		expect(ticket).toContain('chartDraft.update((draft) => ({ ...draft, stopLoss: result.stop }))');
	});
});
