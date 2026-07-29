import { describe, expect, test } from 'bun:test';
import { validateCheckedInCompetitiveMatrix, validateCompetitiveMatrix } from './competitive-matrix.mjs';

describe('Insilico competitive matrix', () => {
	test('validates the checked-in benchmark', async () => {
		expect(await validateCheckedInCompetitiveMatrix()).toEqual([]);
	});

	test('rejects an unsupported green claim', () => {
		const errors = validateCompetitiveMatrix({ schemaVersion: 1, lastIndexed: '2026-07-29', capabilities: [{ id: 'x', sourceUrl: 'https://example.com', viceStories: ['US-001'], status: 'exceeds', nextGate: 'none' }] });
		expect(errors).toContain('x: green status requires direct evidence');
	});
});
