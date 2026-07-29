import { describe, expect, test } from 'bun:test';

describe('Ping-Pong restart dispatch surface', () => {
	test('journals each alternating child before placement and recovers it before restart', async () => {
		const source = await Bun.file(new URL('./pingPong.ts', import.meta.url)).text();
		for (const token of ['dispatchRecoveryVersion: 1', 'pendingChildCommandId: crypto.randomUUID()', 'commandId: dispatching.pendingChildCommandId', 'recoverPendingChildDispatch', 'resumePersistedPingPongs']) expect(source).toContain(token);
	});
});
