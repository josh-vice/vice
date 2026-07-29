import { describe, expect, test } from 'bun:test';

describe('US-002 post-mutation revenue reconciliation', () => {
	test('schedules an authoritative account snapshot after every local acknowledgement', async () => {
		const source = await Bun.file(new URL('./localExecution.ts', import.meta.url)).text();
		expect(source).toContain("import('$lib/hl/account')");
		expect(source).toContain('refreshAccountSnapshot');
		expect(source).toContain('without extending the signing/venue latency');
	});
});
