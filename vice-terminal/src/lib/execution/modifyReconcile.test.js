import { describe, expect, test } from 'bun:test';
import { reconcileModifyPostState, venuePriceEqual } from './modifyReconcile.ts';

describe('US-002 modify post-state reconciliation (gate3 four-phase repair)', () => {
	test('reconciles an APPLIED modify by the deterministic cloid and returns the NEW oid', () => {
		const outcome = reconcileModifyPostState({
			modifyCloid: '0x0000000000000000000000000000000a01',
			targetField: 'limitPx',
			targetPrice: '53847',
			oldOrderId: '57729181987',
			orders: [
				{ oid: 57729185690, cloid: '0x0000000000000000000000000000000a01', limitPx: '53847.0', isTrigger: false },
				{ oid: 57729181987, cloid: '0x0000000000000000000000000000000a00', limitPx: '57015.0', isTrigger: false }
			]
		});
		// The modify replaced the order with a NEW oid; the journal must record
		// that new oid, not the stale original.
		expect(outcome).toMatchObject({ status: 'applied', orderId: '57729185690', price: '53847' });
	});

	test('reconciles an APPLIED trigger modify against the authoritative triggerPx', () => {
		const outcome = reconcileModifyPostState({
			modifyCloid: '0x0000000000000000000000000000000b01',
			targetField: 'triggerPx',
			targetPrice: '62083',
			oldOrderId: '57729181987',
			orders: [
				{ oid: 57729190001, cloid: '0x0000000000000000000000000000000b01', limitPx: '62083.0', triggerPx: '62083.0', isTrigger: true },
				{ oid: 57729181987, cloid: '0x0000000000000000000000000000000b00', limitPx: '62083.0', triggerPx: '62083.0', isTrigger: true }
			]
		});
		expect(outcome).toMatchObject({ status: 'applied', orderId: '57729190001' });
	});

	test('reproduces the OLD reconcile-by-limitPx mismatch: ".0" venue suffix no longer mis-reads as rejected', () => {
		// The venue canonicalizes integer BTC prices as "53847.0" while the local
		// format is "53847". Raw string equality (the old bug) would classify an
		// APPLIED modify as rejected. The normalized comparator must return true.
		expect(venuePriceEqual('53847.0', '53847')).toBe(true);
		expect(venuePriceEqual('62083.0', '62083')).toBe(true);
		expect(venuePriceEqual('0.012346', '0.012346')).toBe(true);
		// And it must still reject genuinely different prices.
		expect(venuePriceEqual('57015.0', '53847.0')).toBe(false);
		expect(venuePriceEqual(undefined, '53847')).toBe(false);
	});

	test('rejects a modify deterministically when the original order is still resting unchanged', () => {
		const outcome = reconcileModifyPostState({
			modifyCloid: '0x0000000000000000000000000000000c01',
			targetField: 'limitPx',
			targetPrice: '53847',
			oldOrderId: '57729181987',
			// The modify cloid is absent and the original order remains at the OLD
			// price -> the venue did not apply the change. Deterministic rejection.
			orders: [{ oid: 57729181987, cloid: '0x0000000000000000000000000000000c00', limitPx: '57015.0', isTrigger: false }]
		});
		expect(outcome).toMatchObject({ status: 'rejected', orderId: '57729181987' });
	});

	test('keeps a lost-ack modify unresolved (uncertain) when neither cloid nor original is visible', () => {
		const outcome = reconcileModifyPostState({
			modifyCloid: '0x0000000000000000000000000000000d01',
			targetField: 'limitPx',
			targetPrice: '53847',
			oldOrderId: '57729181987',
			orders: []
		});
		expect(outcome.status).toBe('uncertain');
		expect(outcome.reason).toMatch(/authoritative projection/);
	});

	test('never records the stale original oid as an accepted venue order id', () => {
		const outcome = reconcileModifyPostState({
			modifyCloid: '0x0000000000000000000000000000000e01',
			targetField: 'limitPx',
			targetPrice: '53847',
			oldOrderId: '57729181987',
			orders: [{ oid: 57729190002, cloid: '0x0000000000000000000000000000000e01', limitPx: '53847.0', isTrigger: false }]
		});
		expect(outcome.status).toBe('applied');
		expect(outcome.orderId).not.toBe('57729181987');
	});
});
