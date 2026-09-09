import { describe, expect, test } from 'bun:test';
import { venueCancelOutcome, venueError, venueIds, venueResponseHasAcceptedPendingStatuses } from './venueResponse.ts';

function response(statuses) {
	return { response: { data: { statuses } } };
}

describe('venue response helpers', () => {
	test('extracts resting and filled order ids while ignoring errors', () => {
		expect(venueIds(response([{ resting: { oid: 7 } }, { filled: { oid: 8 } }, { error: 'bad' }, 'waiting']))).toEqual(['7', '8']);
	});

	test('recognizes normalTpsl pending child statuses as accepted', () => {
		expect(venueResponseHasAcceptedPendingStatuses(response([
			{ resting: { oid: 7 } }, 'waitingForFill', 'waitingForTrigger'
		]), 3, ['7'])).toBe(true);
		expect(venueResponseHasAcceptedPendingStatuses(response([
			{ resting: { oid: 7 } }, { error: 'bad' }, 'waitingForFill'
		]), 3, ['7'])).toBe(false);
	});

	test('normalizes the first venue error', () => {
		expect(venueError(response([{ error: 'Order would cross the spread' }]))).toContain('cross');
		expect(venueError(response([{ resting: { oid: 7 } }]))).toBeUndefined();
	});

	test('treats raced filled or already-cancelled targets as reconciled', () => {
		expect(venueCancelOutcome({ response: { data: { statuses: ['success'] } } })).toEqual({ accepted: true, reconciled: false });
		expect(venueCancelOutcome({ response: { data: { statuses: [{ error: 'Order was never placed, already canceled, or filled. asset=3' }] } } })).toEqual({ accepted: true, reconciled: true });
		expect(venueCancelOutcome({ response: { data: { statuses: [{ error: 'Cannot cancel an order' }] } } })).toMatchObject({ accepted: false, reconciled: false });
		expect(venueCancelOutcome({})).toMatchObject({ accepted: false, reconciled: false, uncertain: true });
		expect(venueCancelOutcome({ response: { data: { statuses: ['unexpected'] } } })).toMatchObject({ accepted: false, reconciled: false, uncertain: true });
	});
});
