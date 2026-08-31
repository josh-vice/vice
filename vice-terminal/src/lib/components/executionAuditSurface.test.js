import { describe, expect, test } from 'bun:test';

describe('local execution audit export surface', () => {
	test('requires a live private account and exports only through a local browser download', async () => {
		const panel = await Bun.file(new URL('./BottomPanel.svelte', import.meta.url)).text();
		for (const token of ['exportExecutionAudit', 'replayStoredExecutionAudit', 'executionTelemetry', 'execution-lifecycle-telemetry', 'if (!privateStateLive || !$walletAddress) return', 'URL.createObjectURL', "type: 'application/json'", 'Export audit', 'Replay audit', 'no private key, signature, request body, or venue error text']) expect(panel).toContain(token);
		expect(panel).not.toContain('fetchExecutionAudit');
		expect(panel).not.toContain('sendBeacon');
	});
});
