import { describe, expect, test } from 'bun:test';

describe('native Vice Suite links port', () => {
	test('preserves every legacy community destination and adds first-party Suite navigation', async () => {
		const source = await Bun.file(new URL('./NativeSuiteLinksPort.svelte', import.meta.url)).text();
		for (const token of ['/trade', '/hub', '/scanner', '/gallery', 'https://vicesuite.com/pricebots', 'https://vicesuite.com/chartbot', 'https://liqtheory.com/', 'https://discord.gg/LiquidityTheory', 'nativeWidgetPorts.vSuite', 'data-testid="native-suite-links-port"', 'no market feed, account, signer, order, telemetry, or execution path']) expect(source).toContain(token);
		for (const token of ['fetch(', 'WebSocket', 'placeOrder(', 'cancelOrder(']) expect(source).not.toContain(token);
	});
});
