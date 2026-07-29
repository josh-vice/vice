import { describe, expect, test } from 'bun:test';
import { assertNoUnresolvedExecutionCommands, beginExecutionCommand, clearExecutionJournal, finishExecutionCommand, loadExecutionJournal, unresolvedExecutionCommands } from './commandJournal';

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
});
