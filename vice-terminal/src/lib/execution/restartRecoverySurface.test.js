import { describe, expect, test } from 'bun:test';

describe('local strategy restart recovery boundary', () => {
	test('guards restart-unsafe strategies before any persisted timer resumes', async () => {
		const stores = await Bun.file(new URL('../stores.ts', import.meta.url)).text();
		const jobs = await Bun.file(new URL('./algoJobs.ts', import.meta.url)).text();
		expect(stores).toContain('pauseRestartUnsafeLocalAlgoJobs');
		expect(stores.indexOf('pauseRestartUnsafeLocalAlgoJobs')).toBeLessThan(stores.indexOf('resumePersistedChases'));
		for (const token of ["job.type === 'scale'", "job.type === 'conditional_ladder'", "job.type === 'chase'", "['trailing', 'iceberg', 'oco', 'ping_pong', 'swarm', 'break_even', 'adaptive_twap', 'vwap', 'pov']", 'job.dispatchRecoveryVersion === 1']) expect(jobs).toContain(token);
		expect(jobs).toContain('restartRecoveryRequired: true');
	});
});
