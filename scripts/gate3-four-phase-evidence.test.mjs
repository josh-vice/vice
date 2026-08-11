import { describe, expect, test } from 'bun:test';
import { GATE3_PHASES, validateGate3FourPhaseEvidence } from './gate3-four-phase-evidence.mjs';

const phase = (name) => ({ phase: name, oid: 1001 });

const valid = {
	schemaVersion: 1,
	kind: 'gate3-basic-four-phase',
	network: 'testnet',
	scope: 'core BTC; browser-local signing; low notional (0.001 BTC)',
	uncertainOutcomes: 0,
	duplicateOrders: 0,
	phases: GATE3_PHASES.map(phase),
	phasesPassed: 4,
	phasesTotal: 4,
	venueOrderIds: ['1001', '1002', '1003', '1004'],
	cleanup: { verified: true }
};

describe('gate3 four-phase evidence boundary', () => {
	test('accepts a complete four-phase manifest', () => {
		expect(validateGate3FourPhaseEvidence(valid)).toEqual(valid);
	});

	for (const [field, bad] of [
		['uncertainOutcomes', 1],
		['duplicateOrders', 1],
		['phasesPassed', 3],
		['phasesTotal', 3]
	]) {
		test(`rejects ${field}`, () => {
			expect(() => validateGate3FourPhaseEvidence({ ...valid, [field]: bad })).toThrow();
		});
	}

	test('rejects a missing phase', () => {
		expect(() => validateGate3FourPhaseEvidence({ ...valid, phases: GATE3_PHASES.slice(0, 3).map(phase) })).toThrow('missing phase');
	});

	test('rejects an unverified cleanup end state', () => {
		expect(() => validateGate3FourPhaseEvidence({ ...valid, cleanup: { verified: false } })).toThrow('clean end state');
	});

	test('rejects key material in the manifest', () => {
		expect(() => validateGate3FourPhaseEvidence({ ...valid, privateKey: '0xdeadbeef' })).toThrow('key material');
	});

	test('rejects a non-testnet or wrong-kind manifest', () => {
		expect(() => validateGate3FourPhaseEvidence({ ...valid, network: 'mainnet' })).toThrow('testnet');
		expect(() => validateGate3FourPhaseEvidence({ ...valid, kind: 'nope' })).toThrow('kind');
	});
});
