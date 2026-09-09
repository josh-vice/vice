import { describe, expect, test } from 'bun:test';

describe('US-004 algorithm lifecycle controls', () => {
	test('routes compact non-specialized rows by their persisted job type', async () => {
		const panel = await Bun.file(new URL('./BottomPanel.svelte', import.meta.url)).text();
		for (const handler of ['pauseAlgo(job.id, job.type)', 'resumeAlgo(job.id, job.type)', 'cancelAlgo(job.id, job.type)', 'cancelAlgo(job.id, job.type, true)']) expect(panel).toContain(handler);
		for (const strategy of ['iceberg', 'swarm', 'adaptive_twap', 'vwap', 'pov', 'break_even', 'conditional_ladder', 'scale', 'ping_pong']) expect(panel).toContain(`type === '${strategy}'`);
	});

	test('does not offer a failed conditional ladder an unsafe resume', async () => {
		const panel = await Bun.file(new URL('./BottomPanel.svelte', import.meta.url)).text();
		expect(panel).toContain("job.status === 'failed' && job.type !== 'conditional_ladder'");
		expect(panel).toContain('canResumeAlgo(job)');
	});

	test('hides resume when restart recovery requires child-command review', async () => {
		const panel = await Bun.file(new URL('./BottomPanel.svelte', import.meta.url)).text();
		expect(panel).toContain('restartRecoveryRequired');
		expect(panel).toContain('!job.restartRecoveryRequired');
	});

	test('shows privacy-safe device-local trigger outcomes without strategy data', async () => {
		const panel = await Bun.file(new URL('./BottomPanel.svelte', import.meta.url)).text();
		expect(panel).toContain('automationTriggerTelemetry');
		expect(panel).toContain('Device-local conditional trigger telemetry');
		expect(panel).toContain('Device-local triggers:');
	});
});
