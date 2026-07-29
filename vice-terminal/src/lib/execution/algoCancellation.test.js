import { describe, expect, test } from 'bun:test';
import { cancelAlgoChildren } from './algoCancellation';

describe('US-004 child cancellation safety', () => {
	test('requires every known child cancellation to be confirmed', async () => {
		const seen = [];
		const result = await cancelAlgoChildren(['11', undefined, '12'], async (id) => {
			seen.push(id);
			return { ok: id !== '12', error: id === '12' ? 'venue timeout' : undefined };
		});
		expect(seen).toEqual(['11', '12']);
		expect(result).toEqual({ ok: false, error: 'venue timeout' });
	});

	test('does not transmit for absent child IDs', async () => {
		let calls = 0;
		await expect(cancelAlgoChildren([undefined], async () => { calls += 1; return { ok: true }; })).resolves.toEqual({ ok: true });
		expect(calls).toBe(0);
	});
});
