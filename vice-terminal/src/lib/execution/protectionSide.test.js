import { describe, expect, test } from 'bun:test';
import { ocoExitSide } from './ocoState.ts';

describe('protective exit direction', () => {
	test('uses the opposite side of the protected entry position', () => {
		expect(ocoExitSide('buy')).toBe('sell');
		expect(ocoExitSide('sell')).toBe('buy');
	});

	test('trailing and break-even submit the derived exit side', async () => {
		const trailing = await Bun.file(new URL('./trailing.ts', import.meta.url)).text();
		const breakEven = await Bun.file(new URL('./breakEven.ts', import.meta.url)).text();
		expect(trailing).toContain('ocoExitSide(job.side) === \'buy\'');
		expect(breakEven).toContain('ocoExitSide(job.side) === \'buy\'');
	});
});
