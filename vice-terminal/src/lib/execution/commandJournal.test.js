import { describe, expect, test } from 'bun:test';
import { assertNoUnresolvedExecutionCommands, beginExecutionCommand, clearExecutionJournal, exportExecutionAudit, finishExecutionCommand, loadExecutionJournal, replayExecutionAudit, replayStoredExecutionAudit, unresolvedExecutionCommands } from './commandJournal';

const configuredNetwork = process.env.VITE_HL_TRADING_NETWORK?.trim().toLowerCase() === 'mainnet' ? 'mainnet' : 'testnet';
const oppositeNetwork = configuredNetwork === 'mainnet' ? 'testnet' : 'mainnet';
const journalKey = (account) => `vice.execution.journal.v1:${configuredNetwork}:${account.toLowerCase()}`;

describe('US-002 durable execution journal', () => {
	test('persists pending and uncertain order outcomes across reloads', () => {
		const values = new Map();
		globalThis.localStorage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
		const entry = { commandId: 'cmd-1', network: 'testnet', account: '0xABC', sequence: 4, kind: 'place', cloids: ['0x01'], venueOrderIds: [] };
		beginExecutionCommand(entry);
		expect(unresolvedExecutionCommands('0xabc')).toHaveLength(1);
		finishExecutionCommand('0xabc', 'cmd-1', { status: 'uncertain', venueOrderIds: [], error: 'lost ack' });
		expect(loadExecutionJournal('0xabc')[0].status).toBe('uncertain');
		expect(() => assertNoUnresolvedExecutionCommands('0xabc')).toThrow('Trading is paused');
		finishExecutionCommand('0xabc', 'cmd-1', { status: 'reconciled', venueOrderIds: ['17'] });
		expect(() => assertNoUnresolvedExecutionCommands('0xabc')).not.toThrow();
		expect(unresolvedExecutionCommands('0xabc')).toHaveLength(0);
		expect(loadExecutionJournal('0xabc')[0].venueOrderIds).toEqual(['17']);
		clearExecutionJournal('0xabc');
	});

	test('journals schedule-cancel outcomes as safety-critical mutations', () => {
		const values = new Map();
		globalThis.localStorage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
		beginExecutionCommand({ commandId: 'deadman-1', network: 'testnet', account: '0x456', sequence: 1, kind: 'scheduleCancel', cloids: [], venueOrderIds: [] });
		finishExecutionCommand('0x456', 'deadman-1', { status: 'uncertain', venueOrderIds: [], error: 'transport failure' });
		expect(unresolvedExecutionCommands('0x456')[0].kind).toBe('scheduleCancel');
		clearExecutionJournal('0x456');
	});

	test('bounds journal retention to the most recent commands', () => {
		const values = new Map();
		globalThis.localStorage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
		for (let sequence = 1; sequence <= 125; sequence += 1) {
			beginExecutionCommand({ commandId: `cmd-${sequence}`, network: 'testnet', account: '0xDEF', sequence, kind: 'place', cloids: [`0x${sequence.toString(16)}`], venueOrderIds: [] });
		}
		const entries = loadExecutionJournal('0xdef');
		expect(entries).toHaveLength(100);
		expect(entries[0].commandId).toBe('cmd-26');
		clearExecutionJournal('0xdef');
	});

	test('retains target identity needed to reconcile modify and cancel after restart', () => {
		const values = new Map();
		globalThis.localStorage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
		beginExecutionCommand({ commandId: 'cancel-1', network: 'testnet', account: '0x123', sequence: 1, kind: 'cancel', cloids: [], targetOrderId: '99', venueOrderIds: [] });
		beginExecutionCommand({ commandId: 'modify-1', network: 'testnet', account: '0x123', sequence: 2, kind: 'modify', cloids: [], targetOrderId: '100', targetPrice: '101.25', targetField: 'triggerPx', venueOrderIds: [] });
		const entries = loadExecutionJournal('0x123');
		expect(entries.map((entry) => [entry.kind, entry.targetOrderId, entry.targetPrice, entry.targetField])).toEqual([
			['cancel', '99', undefined, undefined],
			['modify', '100', '101.25', 'triggerPx']
		]);
		clearExecutionJournal('0x123');
	});

	test('skips malformed exported journal entries and rejects malformed replay fields', () => {
		const malformed = { commandId: 'bad', network: 'testnet', sequence: 1, kind: 'place', cloids: [], venueOrderIds: [], status: 'accepted', updatedAt: 1 };
		expect(() => exportExecutionAudit('0xabc', [malformed])).not.toThrow();
		expect(exportExecutionAudit('0xabc', [malformed]).entries).toEqual([]);
		const replay = replayExecutionAudit({
			schema: 1,
			kind: 'vice.execution-audit',
			network: 'testnet',
			account: '0xabc',
			entries: [{ commandId: 'bad-field', sequence: 1, kind: 'modify', cloids: [], targetPrice: 100, status: 'accepted', venueOrderIds: [], updatedAt: 1 }]
		});
		expect(replay.valid).toBe(false);
		expect(replay.finalState).toBe('invalid');
	});

	test('replays raw local journal identity before sanitization', () => {
		const values = new Map();
		globalThis.localStorage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
		values.set(journalKey('0xabc'), JSON.stringify([
			{ commandId: 'wrong-network', network: oppositeNetwork, account: '0xabc', sequence: 1, kind: 'place', cloids: ['0x1'], status: 'accepted', venueOrderIds: [], updatedAt: 1 }
		]));
		const replay = replayStoredExecutionAudit('0xabc');
		expect(replay.valid).toBe(false);
		expect(replay.finalState).toBe('invalid');
		expect(replay.errors.join(' ')).toContain('invalid identity');
		clearExecutionJournal('0xabc');
	});

	test('reports malformed stored journal JSON instead of treating it as clean', () => {
		const values = new Map();
		globalThis.localStorage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
		values.set(journalKey('0xabc'), '{');
		const replay = replayStoredExecutionAudit('0xabc');
		expect(replay).toMatchObject({ valid: false, finalState: 'invalid', entriesReplayed: 0 });
		expect(replay.errors).toContain('Stored execution journal is invalid JSON');
		clearExecutionJournal('0xabc');
	});

	test('reports a non-array stored journal payload as invalid', () => {
		const values = new Map();
		globalThis.localStorage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
		values.set(journalKey('0xabc'), '{}');
		const replay = replayStoredExecutionAudit('0xabc');
		expect(replay).toMatchObject({ valid: false, finalState: 'invalid', entriesReplayed: 0 });
		expect(replay.errors).toContain('Stored execution journal must be an array');
		clearExecutionJournal('0xabc');
	});

	test('replays exported lifecycle state without mutating storage', () => {
		const audit = {
			schema: 1,
			kind: 'vice.execution-audit',
			network: 'testnet',
			account: '0xabc',
			entries: [
				{ commandId: 'place-1', sequence: 1, kind: 'place', cloids: ['0x1'], status: 'accepted', venueOrderIds: ['17'], updatedAt: 1 },
				{ commandId: 'place-2', sequence: 2, kind: 'place', cloids: ['0x2'], status: 'uncertain', venueOrderIds: [], updatedAt: 2 },
				{ commandId: 'place-3', sequence: 3, kind: 'place', cloids: ['0x3'], status: 'reconciled', venueOrderIds: ['18'], updatedAt: 3 }
			]
		};
		const replay = replayExecutionAudit(audit);
		expect(replay).toMatchObject({
			valid: true,
			finalState: 'unresolved',
			entriesReplayed: 3,
			accepted: 1,
			rejected: 0,
			unknown: 1,
			reconciled: 1,
			unresolvedCommandIds: ['place-2'],
			errors: []
		});
	});

	test('replays TWAP cancellation records with their target identity', () => {
		const replay = replayExecutionAudit({
			schema: 1,
			kind: 'vice.execution-audit',
			network: 'testnet',
			account: '0xabc',
			entries: [{ commandId: 'twap-cancel', sequence: 1, kind: 'cancel', cloids: [], targetTwapId: 7, status: 'accepted', venueOrderIds: ['7'], updatedAt: 1 }]
		});
		expect(replay).toMatchObject({ valid: true, finalState: 'clean', entriesReplayed: 1, accepted: 1 });
	});

	test('reports duplicate and out-of-sequence audit records', () => {
		const replay = replayExecutionAudit({
			schema: 1,
			kind: 'vice.execution-audit',
			network: 'testnet',
			account: '0xabc',
			entries: [
				{ commandId: 'duplicate', sequence: 2, kind: 'place', cloids: ['0x1'], status: 'accepted', venueOrderIds: [], updatedAt: 1 },
				{ commandId: 'duplicate', sequence: 1, kind: 'place', cloids: ['0x2'], status: 'rejected', venueOrderIds: [], updatedAt: 2 }
			]
		});
		expect(replay.valid).toBe(false);
		expect(replay.finalState).toBe('invalid');
		expect(replay.errors.join(' ')).toContain('duplicates commandId');
		expect(replay.errors.join(' ')).toContain('out of sequence');
	});
	test('rejects distinct audit records sharing a sequence', () => {
		const replay = replayExecutionAudit({
			schema: 1,
			kind: 'vice.execution-audit',
			network: 'testnet',
			account: '0xabc',
			entries: [
				{ commandId: 'place-1', sequence: 1, kind: 'place', cloids: ['0x1'], status: 'accepted', venueOrderIds: [], updatedAt: 1 },
				{ commandId: 'place-2', sequence: 1, kind: 'place', cloids: ['0x2'], status: 'accepted', venueOrderIds: [], updatedAt: 2 }
			]
		});
		expect(replay.valid).toBe(false);
		expect(replay.finalState).toBe('invalid');
		expect(replay.errors.join(' ')).toContain('duplicates sequence');
	});

});
