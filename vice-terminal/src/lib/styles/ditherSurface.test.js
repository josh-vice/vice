import { describe, expect, test } from 'bun:test';

async function source(relativePath) {
	return Bun.file(new URL(relativePath, import.meta.url)).text();
}

describe('US-012 dither presentation boundary', () => {
	test('keeps the design language CSS-only and non-interactive', async () => {
		const css = await source('./dither.css');
		for (const token of ['.dither-25', '.dither-50', '.dither-75', '.dither-rule', '.dither-stale', 'pointer-events: none', 'mask-image']) expect(css).toContain(token);
		expect(css).not.toContain('@keyframes');
	});

	test('keeps dither as a visible reinforcement on chart, book, and tape', async () => {
		const [chart, book, tape] = await Promise.all([
			source('../components/Chart.svelte'),
			source('../components/OrderBook.svelte'),
			source('../components/RecentTrades.svelte')
		]);
		expect(chart).toContain('dither-overlay');
		expect(chart).toContain('data-feed-status');
		expect(book).toContain('class:dither-stale');
		expect(book).toContain('dither-fade-l');
		expect(tape).toContain('class:dither-stale');
		expect(tape).toContain('healthLabel($marketDataStatus)');
	});
});
