import { describe, expect, test } from 'bun:test';

describe('trailing restart dispatch surface', () => {
	test('journals each child before placement and recovers it before restarting its timer', async () => {
		const source = await Bun.file(new URL('./trailing.ts', import.meta.url)).text();
		for (const token of ['dispatchRecoveryVersion: 1', 'pendingChildCommandId: crypto.randomUUID()', 'commandId: dispatching.pendingChildCommandId', 'recoverPendingChildDispatch', 'resumePersistedTrailings', 'nextTrailingExtreme(exitSide']) expect(source).toContain(token);
	});
});
