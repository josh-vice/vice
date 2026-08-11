import { describe, expect, test } from 'bun:test';

/**
 * Gate 3 recovery — root-cause repair 1/4 (four basic-order phases).
 * Source-surface regression tests that pin the PRODUCTION contract so the four
 * failure classes (limit-maker reconcile-by-limitPx, stop/stop-limit trigger
 * visibility, modify lost-ack/post-state, duplicate prevention) cannot return.
 */
describe('gate3 four-phase production contract (limit-maker, stop, stop-limit, modify)', () => {
	test('modifyOrder carries a deterministic cloid and reconciles the authoritative post-state', async () => {
		const source = await Bun.file(new URL('./localExecution.ts', import.meta.url)).text();
		const start = source.indexOf('async modifyOrder(');
		const end = source.indexOf('private async orderStatus', start);
		const block = source.slice(start, end);
		// The modify must identify the replacement by a deterministic cloid so the
		// venue post-state can be reconciled by identity after the oid changes.
		expect(block).toContain('const modifyCloid = deterministicCloid(sequence, 0);');
		expect(block).toContain('c: modifyCloid,');
		// Transport ack alone is not venue confirmation: reconcile post-state.
		expect(block).toContain('await this.reconcileModifyPostState(modifyCloid, order.id, targetPrice, isTrigger);');
		// Applied -> record the NEW oid; rejected vs uncertain stay distinct.
		expect(block).toContain("status: 'reconciled', venueOrderIds: [outcome.orderId!]");
		expect(block).toContain("status: 'rejected', venueOrderIds: [outcome.orderId ?? order.id]");
		expect(block).toContain("status: 'uncertain'");
		// The journal records the modify cloid so a browser restart can reconcile
		// by cloid instead of the stale original oid.
		expect(block).toContain("cloids: [modifyCloid]");
	});

	test('persisted modify reconciliation uses the journal cloid and normalized prices, not the stale oid', async () => {
		const source = await Bun.file(new URL('./localExecution.ts', import.meta.url)).text();
		const start = source.indexOf("if (command.kind === 'modify') {");
		const end = source.indexOf('if (unresolvedExecutionCommands', start);
		const block = source.slice(start, end);
		expect(block).toContain('const modifyCloid = command.cloids[0];');
		expect(block).toContain('reconcileModifyPostState({');
		expect(block).toContain('orders: projections[0]');
		// The old raw string-equality price compare must be gone.
		expect(block).not.toContain('String(authoritativePrice) === command.targetPrice');
	});

	test('reconciliation primitive and normalized price comparison live in a shared module', async () => {
		const source = await Bun.file(new URL('./modifyReconcile.ts', import.meta.url)).text();
		expect(source).toContain('export function reconcileModifyPostState(');
		expect(source).toContain('export function venuePriceEqual(');
		expect(source).toContain("status: 'applied'");
		expect(source).toContain("status: 'rejected'");
		expect(source).toContain("status: 'uncertain'");
		// Trigger visibility is authoritative: reconcile against the field that
		// only the frontend (authoritative) representation carries.
		expect(source).toContain("opts.targetField === 'triggerPx' ? replacement.triggerPx : replacement.limitPx");
	});

	test('the production read path already reads triggers through the authoritative frontend projection', async () => {
		const source = await Bun.file(new URL('./localExecution.ts', import.meta.url)).text();
		// allDexOpenOrders must use frontendOpenOrders (authoritative isTrigger /
		// triggerPx / orderType / cloid), not the generic openOrders info-type.
		const start = source.indexOf('private async allDexOpenOrders()');
		const end = source.indexOf('private async findTwap', start);
		const block = source.slice(start, end);
		expect(block).toContain('frontendOpenOrders');
		expect(block).not.toContain("{ type: 'openOrders' }");
	});

	test('modify does not optimistically ack on a bare transport response', async () => {
		const source = await Bun.file(new URL('./localExecution.ts', import.meta.url)).text();
		const start = source.indexOf('async modifyOrder(');
		const end = source.indexOf('private async orderStatus', start);
		const block = source.slice(start, end);
		// The modify still issues exchange.modify, but it must NOT mark accepted
		// from the transport call alone: it reconciles the authoritative
		// post-state first. The old optimistic-ack line is gone.
		expect(block).toContain('await exchange.modify({');
		expect(block).not.toContain("finishExecutionCommand(this.mainAddress!, commandId, { status: 'accepted', venueOrderIds: [order.id] });");
		expect(block).toContain('const outcome = await this.reconcileModifyPostState(modifyCloid, order.id, targetPrice, isTrigger);');
	});
});
