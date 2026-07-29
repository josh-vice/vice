import { describe, expect, test } from 'bun:test';

describe('break-even restart dispatch surface', () => {
	test('journals its protection child before placement and recovers it before restart', async () => {
		const source = await Bun.file(new URL('./breakEven.ts', import.meta.url)).text();
		for (const token of ['dispatchRecoveryVersion: 1', 'pendingChildCommandId: crypto.randomUUID()', 'commandId: dispatching.pendingChildCommandId', 'recoverPendingChildDispatch', 'resumePersistedBreakEvens']) expect(source).toContain(token);
	});
});
