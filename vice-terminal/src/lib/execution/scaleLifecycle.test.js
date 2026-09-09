import { describe, expect, test } from 'bun:test';

describe('US-004 Scale lifecycle surface', () => {
	test('routes Scale through a persisted child-order state machine', async () => {
		const orders = await Bun.file(new URL('../hl/orders.ts', import.meta.url)).text();
		const scale = await Bun.file(new URL('./scale.ts', import.meta.url)).text();
		const jobs = await Bun.file(new URL('./algoJobs.ts', import.meta.url)).text();
		expect(orders).toContain("import('$lib/execution/scale')");
		expect(orders).toContain('startScale');
		for (const token of ['LocalScaleJob', 'childOrderIds', 'filledSize', 'pendingScaleCommandId', 'resumePersistedScales', 'recoverPendingScaleDispatch']) expect(`${scale}\n${jobs}`).toContain(token);
	});

	test('validates Scale inputs before persisting a runnable job', async () => {
		const scale = await Bun.file(new URL('./scale.ts', import.meta.url)).text();
		expect(scale).toContain("import { buildScaleLevels } from './scaleMath'");
		expect(scale).toContain('buildScaleLevels(params.startPrice, params.endPrice, params.size, params.levels, params.skew);');
		expect(scale.indexOf('buildScaleLevels(params.startPrice')).toBeLessThan(scale.indexOf('const job: LocalScaleJob'));
	});
});
