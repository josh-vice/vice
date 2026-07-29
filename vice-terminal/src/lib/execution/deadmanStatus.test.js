import { describe, expect, test } from 'bun:test';

describe('US-004 dead-man visibility', () => {
	test('exposes armed, clearing, and uncertain venue state instead of only a configured duration', async () => {
		const stores = await Bun.file(new URL('../stores.ts', import.meta.url)).text();
		const execution = await Bun.file(new URL('./localExecution.ts', import.meta.url)).text();
		const panel = await Bun.file(new URL('../components/BottomPanel.svelte', import.meta.url)).text();
		for (const state of ['arming', 'armed', 'clearing', 'uncertain']) expect(stores).toContain(`'${state}'`);
		expect(execution).toContain("deadmanStatus.set('armed')");
		expect(execution).toContain("deadmanStatus.set('uncertain')");
		expect(panel).toContain('$deadmanStatus.toUpperCase()');
	});
});
