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

	test('rejects an outdated matrix source date that would imply a stale parity claim', () => {
		const errors = validateCompetitiveMatrix(
			{ schemaVersion: 1, lastIndexed: '2020-01-01', capabilities: [{ id: 'x', sourceUrl: 'https://example.com', viceStories: ['US-001'], status: 'behind', nextGate: 'none' }] },
			new Date('2026-08-03T12:00:00Z')
		);
		expect(errors.join(' ')).toContain('outdated source date');
	});

	test('rejects a green row without a current verification date', () => {
		const errors = validateCompetitiveMatrix(
			{ schemaVersion: 1, lastIndexed: '2026-08-01', capabilities: [{ id: 'x', sourceUrl: 'https://example.com', viceStories: ['US-001'], status: 'meets', evidence: 'measured', nextGate: 'none' }] },
			new Date('2026-08-03T12:00:00Z')
		);
		expect(errors).toContain('x: green status requires a current verificationDate within 30 days');
	});

	test('accepts a green row with direct evidence and a current verification date', () => {
		const errors = validateCompetitiveMatrix(
			{ schemaVersion: 1, lastIndexed: '2026-08-01', capabilities: [{ id: 'x', sourceUrl: 'https://example.com', viceStories: ['US-001'], status: 'meets', evidence: 'measured', verificationDate: '2026-08-01', nextGate: 'none' }] },
			new Date('2026-08-03T12:00:00Z')
		);
		expect(errors).toEqual([]);
	});
});
