import { describe, expect, test } from 'bun:test';

describe('Chase restart dispatch surface', () => {
	test('persists a child command before placement and recovers it from the journal', async () => {
		const source = await Bun.file(new URL('./chase.ts', import.meta.url)).text();
		expect(source).toContain('pendingChildCommandId: crypto.randomUUID()');
		expect(source).toContain('commandId: dispatching.pendingChildCommandId');
		expect(source).toContain('recoverPendingChildDispatch');
		expect(source).toContain('resumePersistedChases');
	});
});
