import { describe, expect, test } from 'bun:test';
import { recoverPendingOcoDispatch } from './ocoDispatchRecovery.ts';

const job = { pendingTakeProfitCommandId: 'tp', pendingStopLossCommandId: 'sl', childOrderIds: [], status: 'running', updatedAt: 1 };
const entry = (commandId, status, venueOrderIds = [], error) => ({ commandId, network: 'testnet', account: '0xabc', sequence: 1, kind: 'place', cloids: [], status, venueOrderIds, error, updatedAt: 1 });

describe('sequential OCO dispatch restart recovery', () => {
	test('adopts both exact journaled children without submitting replacements', () => {
		const recovered = recoverPendingOcoDispatch(job, [entry('tp', 'accepted', ['11']), entry('sl', 'reconciled', ['12'])]);
		expect(recovered).toMatchObject({ takeProfitOrderId: '11', stopLossOrderId: '12', childOrderIds: ['11', '12'], status: 'running' });
		expect(recovered).toMatchObject({ pendingTakeProfitCommandId: undefined, pendingStopLossCommandId: undefined });
	});

	test('pauses when either child is missing, unresolved, or ambiguous', () => {
		for (const journal of [[], [entry('tp', 'accepted', ['11'])], [entry('tp', 'accepted', ['11']), entry('sl', 'uncertain')], [entry('tp', 'accepted', ['11']), entry('sl', 'accepted', ['12', '13'])]]) {
			const recovered = recoverPendingOcoDispatch(job, journal);
			expect(recovered.status).toBe('paused');
		}
	});

	test('never retries a journaled rejected child', () => {
		const recovered = recoverPendingOcoDispatch(job, [entry('tp', 'accepted', ['11']), entry('sl', 'rejected', [], 'stop rejected')]);
		expect(recovered).toMatchObject({ takeProfitOrderId: '11', status: 'failed', error: 'stop rejected' });
	});
});
