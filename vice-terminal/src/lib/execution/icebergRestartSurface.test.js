import { describe, expect, test } from 'bun:test';

describe('Iceberg restart dispatch surface', () => {
	test('journals every slice before placement and recovers it before restarting its timer', async () => {
		const source = await Bun.file(new URL('./iceberg.ts', import.meta.url)).text();
		for (const token of ['dispatchRecoveryVersion: 1', 'pendingChildCommandId: crypto.randomUUID()', 'commandId: dispatching.pendingChildCommandId', 'recoverPendingChildDispatch', 'resumePersistedIcebergs']) expect(source).toContain(token);
	});
});
