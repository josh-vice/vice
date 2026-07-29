import { describe, expect, test } from 'bun:test';
import { recoverPendingScaleDispatch } from './scaleDispatchRecovery.ts';

const job = {
	pendingScaleCommandId: 'scale-command',
	childOrderIds: ['11'],
	status: 'running',
	updatedAt: 1
};

function entry(status, venueOrderIds = [], error) {
	return {
		commandId: 'scale-command', network: 'testnet', account: '0xabc', sequence: 1,
		kind: 'scale', cloids: [], status, venueOrderIds, error, updatedAt: 1
	};
}

describe('Scale dispatch restart recovery', () => {
	test('adopts exact journal children instead of resending an accepted Scale batch', () => {
		const recovered = recoverPendingScaleDispatch(job, [entry('reconciled', ['11', '12'])]);
		expect(recovered).toMatchObject({ pendingScaleCommandId: undefined, childOrderIds: ['11', '12'], status: 'running' });
	});

	test('pauses a missing, pending, or uncertain dispatch record without clearing it', () => {
		for (const journal of [[], [entry('pending')], [entry('uncertain')]]) {
			const recovered = recoverPendingScaleDispatch(job, journal);
			expect(recovered.status).toBe('paused');
			expect(recovered.pendingScaleCommandId).toBe('scale-command');
			expect(recovered.error).toContain('dispatch');
		}
	});

	test('does not retry a journaled rejection', () => {
		const recovered = recoverPendingScaleDispatch(job, [entry('rejected', [], 'venue rejected Scale')]);
		expect(recovered).toMatchObject({ pendingScaleCommandId: undefined, status: 'failed', error: 'venue rejected Scale' });
	});
});
