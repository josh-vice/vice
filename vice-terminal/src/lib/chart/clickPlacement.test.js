// @ts-nocheck
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../components/Chart.svelte', import.meta.url), 'utf8');

describe('US-CT-005 Click Placement surface', () => {
	test('exposes explicit armed state, fixed size, selected side, and normalized hover preview', () => {
		expect(source).toContain('flex-wrap items-center justify-between');
		expect(source).toContain('class="inline-flex items-center border border-terminal-green/30');
		expect(source).not.toContain('hidden sm:inline-flex');
		expect(source).toContain('data-testid="chart-designer-toggle"');
		expect(source).toContain('aria-pressed={$designerMode}');
		expect(source).toContain('data-testid="chart-click-placement-toggle"');
		expect(source).toContain('aria-pressed={$clickPlacementMode}');
		expect(source).toContain('data-testid="chart-click-placement-status"');
		expect(source).toContain('RIGHT CLICK TO PLACE');
		expect(source).toContain('SIZE {formatSize($orderSize)}');
		expect(source).toContain('SIDE {clickPlacementSideText}');
		expect(source).toContain('clickPlacementPreviewSide');
	});

	test('keeps touch behavior honest instead of exposing an unsafe tap-to-submit path', () => {
		expect(source).toContain('data-testid="chart-click-placement-touch-note"');
		expect(source).toContain('Desktop right-click required');
		expect(source).toContain('disabled');
		expect(source).toContain('function toggleClickPlacementMode()');
		expect(source).toContain('designerMode.set(false)');
		expect(source).toContain('if ($clickPlacementMode && !draggingOrderId)');
	});
});
