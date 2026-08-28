import { describe, expect, test } from 'bun:test';
import { validateMainnetEvidence } from './mainnet-evidence.mjs';

const valid = {
	schemaVersion: 2,
	network: 'mainnet',
	commit: 'a'.repeat(40),
	artifact: { commit: 'a'.repeat(40), sha256: 'b'.repeat(64), sizeBytes: 42 },
	lockfileSha256: 'c'.repeat(64),
	policySha256: 'd'.repeat(64),
	captureWindow: { startedAt: '2026-08-01T00:00:00Z', endedAt: '2026-08-01T01:00:00Z' },
	validatorVersion: '2.0.0',
	features: ['limit'],
	actions: ['order.submit'],
	streams: ['hl.book'],
	actionResults: [{ actionId: 'order.submit', status: 'passed', observedAt: '2026-08-01T00:00:00Z', cleanup: true, before: {}, after: {}, venueOrderIds: ['1001'] }],
	cleanup: { zeroOpenOrders: true, zeroUnintendedPositions: true, zeroUnresolvedCommands: true, zeroRunningJobs: true },
	uncertainOutcomes: 0,
	duplicateOrders: 0,
	venueOrderIds: ['1001', '1002'],
	stories: {
		'US-002': { passes: 2, reconnect: true, restart: true },
		'US-003': { passes: 2, reconnect: true, restart: true },
		'US-004': { passes: 2, reconnect: true, restart: true }
	}
};

describe('mainnet funded-evidence boundary', () => {
	test('accepts complete repeated funded story evidence', () => {
		expect(validateMainnetEvidence(valid)).toEqual(valid);
	});

	for (const [field, value] of [['uncertainOutcomes', 1], ['duplicateOrders', 1]]) {
		test(`rejects ${field}`, () => {
			expect(() => validateMainnetEvidence({ ...valid, [field]: value })).toThrow(field.includes('uncertain') ? 'uncertain' : 'duplicate');
		});
	}

	test('rejects a story with only one pass', () => {
		expect(() => validateMainnetEvidence({ ...valid, stories: { ...valid.stories, 'US-004': { passes: 1, reconnect: true, restart: true } } })).toThrow('US-004');
	});
	test('requires exact action, criterion, and stream coverage when certifying a build', () => {
		expect(() => validateMainnetEvidence({ ...valid, criteria: ['US-002-AC-001'] }, { expectedActionIds: ['order.submit'], expectedCriterionIds: ['US-002-AC-002'], expectedStreamIds: ['hl.book'] })).toThrow('criteria missing exact coverage');
		expect(() => validateMainnetEvidence({ ...valid, criteria: ['US-002-AC-002'] }, { expectedActionIds: ['order.submit', 'order.cancel'], expectedCriterionIds: ['US-002-AC-002'], expectedStreamIds: ['hl.book'] })).toThrow('actions missing exact coverage');
		expect(() => validateMainnetEvidence({ ...valid, criteria: ['US-002-AC-002'] }, { expectedActionIds: ['order.submit'], expectedCriterionIds: ['US-002-AC-002'], expectedStreamIds: ['hl.book', 'hl.trades'] })).toThrow('streams missing exact coverage');
	});
});
