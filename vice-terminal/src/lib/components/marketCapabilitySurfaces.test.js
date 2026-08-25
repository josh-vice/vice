import { describe, expect, test } from 'bun:test';

describe('market capability surfaces', () => {
	test('watchlist presents outcomes as a prediction bucket without META rows', async () => {
		const source = await Bun.file(new URL('./MarketWatchlist.svelte', import.meta.url)).text();
		const grouping = await Bun.file(new URL('../marketWatchlist.ts', import.meta.url)).text();
		expect(grouping).toContain("label: 'Prediction outcomes · metadata only'");
		expect(source).not.toContain('>META</span>');
	});

	test('mobile order sheet routes outcomes to the read-only panel', async () => {
		const source = await Bun.file(new URL('./MobileOrderSheet.svelte', import.meta.url)).text();
		expect(source).toContain('PredictionMarketPanel');
		expect(source).toContain("$selectedMarket?.kind === 'outcome'");
	});

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
