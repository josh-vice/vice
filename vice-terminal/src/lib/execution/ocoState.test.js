import { describe, expect, test } from 'bun:test';
import { ocoExitSide, reconcileOcoChildren } from './ocoState';

describe('US-004 OCO reconciliation', () => {
	test('uses the opposing side for both exit children', () => {
		expect(ocoExitSide('buy')).toBe('sell');
		expect(ocoExitSide('sell')).toBe('buy');
	});
	test('keeps both children active while both are open', () => {
		expect(reconcileOcoChildren({ takeProfitOpen: true, stopLossOpen: true, takeProfitFilled: false, stopLossFilled: false })).toEqual({ state: 'active' });
	});
	test('cancels the sibling after one authoritative fill', () => {
		expect(reconcileOcoChildren({ takeProfitOpen: false, stopLossOpen: true, takeProfitFilled: true, stopLossFilled: false })).toEqual({ state: 'complete', cancel: 'stopLoss' });
	});
	test('pauses on unexplained child disappearance', () => {
		expect(reconcileOcoChildren({ takeProfitOpen: false, stopLossOpen: true, takeProfitFilled: false, stopLossFilled: false }).state).toBe('paused');
	});
});
