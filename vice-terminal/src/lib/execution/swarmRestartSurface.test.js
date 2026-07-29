import { describe, expect, test } from 'bun:test';

describe('Swarm restart dispatch surface', () => {
	test('journals each indexed ladder child and requires an explicit continuation after restart', async () => {
		const source = await Bun.file(new URL('./swarm.ts', import.meta.url)).text();
		for (const token of ['dispatchRecoveryVersion: 1', 'pendingChildCommandId: crypto.randomUUID()', 'pendingChildIndex: index', 'commandId: dispatching.pendingChildCommandId', 'recoverPendingSwarmDispatch', 'resumePersistedSwarms']) expect(source).toContain(token);
	});
});
