import { describe, expect, test } from 'bun:test';
import { validateCheckedInCompetitiveMatrix, validateCompetitiveMatrix } from './competitive-matrix.mjs';

const source = { id: 'docs', url: 'https://example.com/docs', accessedAt: '2026-08-01T00:00:00.000Z', sourceKind: 'official-doc', evidenceLevel: 'documented' };
const capability = (status = {}) => ({
	id: 'x',
	category: 'chart',
	benchmarkSources: ['docs'],
	viceStories: ['US-001'],
	viceActionIds: ['chart.design'],
	status: { implemented: false, interactionCertified: false, fundedMainnetCertified: false, mainnetEnabled: false, ...status },
	evidenceIds: ['evidence-x'],
	nextGate: 'capture direct evidence'
});

describe('terminal competitive matrix', () => {
	test('validates the checked-in benchmark', async () => {
		expect(await validateCheckedInCompetitiveMatrix()).toEqual([]);
	});

	test('rejects an unsupported mainnet claim', () => {
		const errors = validateCompetitiveMatrix({ schemaVersion: 2, lastIndexed: '2026-08-01', sources: [source], capabilities: [capability({ mainnetEnabled: true })] }, new Date('2026-08-03T12:00:00Z'));
		expect(errors).toContain('x: mainnetEnabled requires implemented, interactionCertified, and fundedMainnetCertified');
	});

	test('rejects an outdated source date', () => {
		const errors = validateCompetitiveMatrix({ schemaVersion: 2, lastIndexed: '2020-01-01', sources: [source], capabilities: [capability()] }, new Date('2026-08-03T12:00:00Z'));
		expect(errors.join(' ')).toContain('outdated source date');
	});

	test('rejects stale source records', () => {
		const errors = validateCompetitiveMatrix({ schemaVersion: 2, lastIndexed: '2026-08-01', sources: [{ ...source, accessedAt: '2020-01-01T00:00:00.000Z' }], capabilities: [capability()] }, new Date('2026-08-03T12:00:00Z'));
		expect(errors.join(' ')).toContain('source accessedAt must be current');
	});

	test('accepts a fully evidenced capability state', () => {
		const errors = validateCompetitiveMatrix({
			schemaVersion: 2,
			lastIndexed: '2026-08-01',
			sources: [source],
			capabilities: [capability({ implemented: true, interactionCertified: true, fundedMainnetCertified: true, mainnetEnabled: true })]
		}, new Date('2026-08-03T12:00:00Z'));
		expect(errors).toEqual([]);
	});
});
