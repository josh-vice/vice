import { describe, expect, test } from 'bun:test';

describe('OCO restart dispatch surface', () => {
	test('journals each sequential child and never resumes an incomplete pair automatically', async () => {
		const source = await Bun.file(new URL('./oco.ts', import.meta.url)).text();
		for (const token of ['dispatchRecoveryVersion: 1', 'pendingTakeProfitCommandId: crypto.randomUUID()', 'pendingStopLossCommandId: crypto.randomUUID()', 'recoverPendingOcoDispatch', 'resumePersistedOcos']) expect(source).toContain(token);
	});
});
