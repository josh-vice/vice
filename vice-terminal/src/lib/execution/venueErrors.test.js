import { describe, expect, test } from 'bun:test';
import { parseVenueError } from './venueErrors.ts';

describe('US-002 semantic venue errors', () => {
	test('classifies deterministic order rejection without suggesting retry', () => {
		const result = parseVenueError('Order rejected: insufficient margin');
		expect(result.code).toBe('insufficient_margin');
		expect(result.retryable).toBe(false);
	});

	test('classifies transport failures as reconcilable retry candidates', () => {
		const result = parseVenueError(new Error('network timeout while sending exchange action'));
		expect(result.code).toBe('network');
		expect(result.retryable).toBe(true);
	});
});
