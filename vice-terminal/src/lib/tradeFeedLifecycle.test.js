import { describe, expect, test } from 'bun:test';

const layout = await Bun.file(new URL('../routes/+layout.svelte', import.meta.url)).text();

describe('trade route feed lifecycle', () => {
	test('starts live feeds when SPA navigation enters the terminal', () => {
		expect(layout).toContain('$effect(() => {');
		expect(layout).toContain('if (!isTerminalWorkspace) return;');
		expect(layout).toContain('startPriceUpdates();');
		expect(layout).toContain('return () => stopPriceUpdates();');
		expect(layout).not.toContain("if (page.url.pathname === '/login') return;");
	});
});
