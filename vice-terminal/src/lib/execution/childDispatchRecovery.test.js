import { describe, expect, test } from 'bun:test';
import { recoverPendingChildDispatch } from './childDispatchRecovery.ts';

const job = { pendingChildCommandId: 'child-command', childOrderIds: ['10'], status: 'running', updatedAt: 1 };
const entry = (status, venueOrderIds = [], error) => ({ commandId: 'child-command', network: 'testnet', account: '0xabc', sequence: 1, kind: 'place', cloids: [], status, venueOrderIds, error, updatedAt: 1 });

describe('single-child dispatch restart recovery', () => {
	test('adopts exactly one journaled child instead of sending a replacement', () => {
		const recovered = recoverPendingChildDispatch(job, [entry('accepted', ['11'])]);
		expect(recovered).toMatchObject({ pendingChildCommandId: undefined, currentOrderId: '11', childOrderIds: ['10', '11'], status: 'running' });
	});

	test('pauses every incomplete or ambiguous journal result', () => {
		for (const journal of [[], [entry('pending')], [entry('uncertain')], [entry('accepted', ['11', '12'])]]) {
			const recovered = recoverPendingChildDispatch(job, journal);
			expect(recovered).toMatchObject({ pendingChildCommandId: 'child-command', status: 'paused' });
		}
	});

	test('does not retry a journaled rejection', () => {
		const recovered = recoverPendingChildDispatch(job, [entry('rejected', [], 'venue rejected child')]);
		expect(recovered).toMatchObject({ pendingChildCommandId: undefined, status: 'failed', error: 'venue rejected child' });
	});
});
