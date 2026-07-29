import { describe, expect, test } from 'bun:test';
import { validateMainnetEvidence } from './mainnet-evidence.mjs';

const valid = {
	schemaVersion: 1,
	network: 'testnet',
	pilot: { allowlisted: true, lowNotional: true },
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
});
