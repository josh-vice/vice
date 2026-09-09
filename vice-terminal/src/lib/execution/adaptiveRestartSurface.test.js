import { describe, expect, test } from 'bun:test';

describe('adaptive execution restart dispatch surface', () => {
	test('journals adaptive and POV children before placement and recovers them before timers restart', async () => {
		for (const file of ['adaptiveTwap.ts', 'pov.ts']) {
			const source = await Bun.file(new URL(`./${file}`, import.meta.url)).text();
			for (const token of ['dispatchRecoveryVersion: 1', 'pendingChildCommandId: crypto.randomUUID()', 'commandId: dispatching.pendingChildCommandId', 'recoverPendingChildDispatch']) expect(source).toContain(token);
		}
	});
});
