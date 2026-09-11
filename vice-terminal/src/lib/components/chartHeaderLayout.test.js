import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../components/Chart.svelte', import.meta.url), 'utf8');

describe('chart header layout', () => {
	test('keeps market data and chart controls in separate non-overlapping regions', () => {
		const marketContext = source.indexOf('data-testid="chart-header-market-context"');
		const controls = source.indexOf('data-testid="chart-header-controls"');
		const timeframes = source.indexOf('data-testid="chart-header-timeframes"');

		expect(marketContext).toBeGreaterThanOrEqual(0);
		expect(controls).toBeGreaterThan(marketContext);
		expect(timeframes).toBeGreaterThan(controls);
		expect(source).toContain('class="hidden sm:flex flex-col');
		expect(source).toContain('min-w-0 flex flex-wrap items-center');
		expect(source).toContain('overflow-x-auto');
	});
});
