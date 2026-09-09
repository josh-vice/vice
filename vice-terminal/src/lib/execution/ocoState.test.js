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
	test('does not hide a partial sibling fill behind a complete child', () => {
		const decision = reconcileOcoChildren({ takeProfitOpen: false, stopLossOpen: true, takeProfitFilled: true, stopLossFilled: false, stopLossPartiallyFilled: true });
		expect(decision).toEqual({ state: 'paused', reason: 'Both OCO children traded; reconcile the resulting position' });
	});
	test('pauses when both children report fills or one outcome is unknown', () => {
		expect(reconcileOcoChildren({ takeProfitOpen: false, stopLossOpen: false, takeProfitFilled: true, stopLossFilled: true })).toEqual({ state: 'paused', reason: 'Both OCO children report fills; reconcile the resulting position' });
		expect(reconcileOcoChildren({ takeProfitOpen: true, stopLossOpen: true, takeProfitFilled: false, stopLossFilled: false, stopLossUnknown: true })).toEqual({ state: 'paused', reason: 'An OCO child outcome is unknown; reconcile before changing protection' });
	});
});
