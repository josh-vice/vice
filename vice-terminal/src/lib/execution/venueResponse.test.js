import { describe, expect, test } from 'bun:test';
import { venueError, venueIds } from './venueResponse.ts';

function response(statuses) {
	return { response: { data: { statuses } } };
}

describe('venue response helpers', () => {
	test('extracts resting and filled order ids while ignoring errors', () => {
		expect(venueIds(response([{ resting: { oid: 7 } }, { filled: { oid: 8 } }, { error: 'bad' }, 'waiting']))).toEqual(['7', '8']);
	});

	test('normalizes the first venue error', () => {
		expect(venueError(response([{ error: 'Order would cross the spread' }]))).toContain('cross');
		expect(venueError(response([{ resting: { oid: 7 } }]))).toBeUndefined();
	});
});
