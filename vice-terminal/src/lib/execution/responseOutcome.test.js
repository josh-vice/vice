import { describe, expect, test } from 'bun:test';
import { classifyVenueResponse } from './responseOutcome';

describe('batched venue response safety', () => {
	test('blocks on partial acceptance instead of reporting a clean rejection', () => {
		const result = classifyVenueResponse('one child rejected', ['1001'], 3);
		expect(result).toEqual({
			status: 'uncertain',
			accepted: false,
			uncertain: true,
			error: 'Partial venue acceptance (1/3); one child rejected'
		});
	});

	test('treats a non-error short response as uncertain', () => {
		const result = classifyVenueResponse(undefined, ['1001'], 2);
		expect(result.status).toBe('uncertain');
		expect(result.uncertain).toBe(true);
	});

	test('keeps a complete rejection deterministic and retry-free', () => {
		expect(classifyVenueResponse('insufficient margin', [], 2)).toEqual({
		status: 'rejected',
		accepted: false,
		uncertain: false,
		error: 'insufficient margin'
		});
	});

	test('accepts only a complete successful response', () => {
		expect(classifyVenueResponse(undefined, ['1001', '1002'], 2)).toEqual({
			status: 'accepted',
			accepted: true,
			uncertain: false
		});
	});
});
