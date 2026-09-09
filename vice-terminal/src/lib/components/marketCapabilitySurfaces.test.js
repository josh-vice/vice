import { describe, expect, test } from 'bun:test';

describe('market capability surfaces', () => {

	test('chart and terminal stats consume the selected market capability profile', async () => {
		const chart = await Bun.file(new URL('./Chart.svelte', import.meta.url)).text();
		const workspace = await Bun.file(new URL('./TerminalWorkspace.svelte', import.meta.url)).text();
		expect(chart).toContain('marketCapabilities');
		expect(workspace).toContain('marketCapabilities');
	});

	test('bottom account controls are gated by market capabilities', async () => {
		const source = await Bun.file(new URL('./BottomPanel.svelte', import.meta.url)).text();
		expect(source).toContain('marketCapabilities');
		expect(source).toContain('supportsPositionLifecycle');
	});
});
