import { describe, expect, test } from 'bun:test';
import { recoverPendingSwarmDispatch } from './swarmDispatchRecovery.ts';

const job = { pendingChildCommandId: 'slice', pendingChildIndex: 2, childOrderIds: ['10', '11'], slicesPlaced: 2, slicesTotal: 4, status: 'running', updatedAt: 1 };
const entry = (status, venueOrderIds = [], error) => ({ commandId: 'slice', network: 'testnet', account: '0xabc', sequence: 1, kind: 'place', cloids: [], status, venueOrderIds, error, updatedAt: 1 });

describe('sequential Swarm dispatch restart recovery', () => {
	test('adopts the exact journaled slice and requires explicit continuation for remaining slices', () => {
		const recovered = recoverPendingSwarmDispatch(job, [entry('accepted', ['12'])]);
		expect(recovered).toMatchObject({ pendingChildCommandId: undefined, slicesPlaced: 3, childOrderIds: ['10', '11', '12'], status: 'paused' });
	});

	test('pauses ambiguity and fails a journaled rejection without replacement', () => {
		for (const journal of [[], [entry('pending')], [entry('accepted', ['12', '13'])]]) expect(recoverPendingSwarmDispatch(job, journal).status).toBe('paused');
		expect(recoverPendingSwarmDispatch(job, [entry('rejected', [], 'venue rejected')])).toMatchObject({ status: 'failed', error: 'venue rejected' });
	});
});
