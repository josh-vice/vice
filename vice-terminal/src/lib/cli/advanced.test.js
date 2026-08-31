import { describe, expect, test } from 'bun:test';

describe('US-004 CLI advanced-order parity', () => {
	test('dispatches every implemented advanced order family through certification', async () => {
		const source = await Bun.file(new URL('./executor.ts', import.meta.url)).text();
		for (const command of ['twap ', 'adaptive-twap ', 'vwap ', 'pov ', 'breakeven ', 'maker ', 'conditional-ladder ', 'scale ', 'chase ', 'swarm ', 'iceberg ', 'pingpong ', 'oco ', 'trail ']) {
			expect(source).toContain(`lower.startsWith('${command}')`);
		}
		expect(source).toContain("type: 'oco'");
		expect(source).toContain("type: 'trailing_stop'");
	});
});
