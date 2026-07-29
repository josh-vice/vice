import { describe, expect, test } from 'bun:test';

describe('local execution partial-acceptance boundary', () => {
	test('uses the same unresolved outcome classification for place and scale batches', async () => {
		const source = await Bun.file(new URL('./localExecution.ts', import.meta.url)).text();
		expect(source.match(/classifyVenueResponse\(error, orderIds, orders\.length\)/g)?.length).toBe(2);
		expect(source).toContain('status: outcome.status');
		expect(source).toContain('outcome.uncertain');
	});
});
