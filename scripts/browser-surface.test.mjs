import { describe, expect, test } from 'bun:test';

describe('SSR browser-surface smoke boundary', () => {
	test('checks only server-rendered shell hooks', async () => {
		const script = await Bun.file(new URL('./browser-surface.mjs', import.meta.url)).text();
		const page = await Bun.file(new URL('../vice-terminal/src/lib/components/TerminalWorkspace.svelte', import.meta.url)).text();
		for (const hook of ['terminal-shell', 'workspace-host', 'market-data-health']) expect(script).toContain(`data-testid=\"${hook}\"`);
		for (const hydratedOnlyHook of ['trading-chart', 'order-book', 'recent-trades', 'data-candle-count']) expect(script).not.toContain(hydratedOnlyHook);
		expect(script).toContain('BloFin public review policy');
		expect(script).toContain('SSR suite shell');
		expect(script).toContain('SSR Hub shell');
		expect(script).toContain('preserved Hub island');
		expect(script).toContain('SSR Scanner shell');
		expect(script).toContain('SSR Gallery shell');
		expect(script).toContain('SSR native Price port');
		expect(script).toContain('SSR native Top Movers port');
		expect(script).toContain('`${frontend}/hub/native/price`');
		expect(script).toContain('`${frontend}/hub/native/movers`');
		expect(script).toContain('`${frontend}/trade`');
		expect(script).toContain('/review/blofin');
		expect(script).toContain('https://openapi.blofin.com');
		expect(script).toContain('https://demo-trading-openapi.blofin.com');
		expect(page).toContain('data-testid="terminal-shell"');
	});
});
