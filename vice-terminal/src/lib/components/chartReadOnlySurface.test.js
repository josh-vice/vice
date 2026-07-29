import { expect, test } from 'bun:test';

test('Chart read-only mode excludes chart trading and private overlays', async () => {
	const source = await Bun.file(new URL('./Chart.svelte', import.meta.url)).text();
	for (const token of [
		'export let readOnly = false',
		'privateStateLive = !readOnly',
		'if (readOnly) return;',
		'if (readOnly || !chart || !candlestickSeries) return;',
		'if (readOnly || !$clickPlacementMode || !$selectedMarket)',
		'if (!readOnly && $designerMode)',
		'const price = !readOnly && $clickPlacementMode ? $chartPreviewPrice : null;',
		'{#if !readOnly}',
		"aria-label={readOnly ? 'Read-only price chart' : 'Trading chart'}",
		'Read-only chart · public market data only'
	]) expect(source).toContain(token);
});
