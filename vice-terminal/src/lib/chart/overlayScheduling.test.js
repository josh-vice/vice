import { describe, expect, test } from 'bun:test';

describe('US-003 chart overlay latency', () => {
	test('uses frame-coalesced overlay scheduling instead of a fixed polling timer', async () => {
		const source = await Bun.file(new URL('../components/Chart.svelte', import.meta.url)).text();
		expect(source).toContain('scheduleOverlayCoordinates');
		expect(source).toContain('requestAnimationFrame');
		expect(source).toContain('subscribeVisibleLogicalRangeChange');
		expect(source).not.toContain('setInterval(updateOverlayCoordinates');
	});
});
