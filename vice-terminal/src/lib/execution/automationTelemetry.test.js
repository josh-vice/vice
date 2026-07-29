import { describe, expect, test } from 'bun:test';
import { get } from 'svelte/store';
import { automationTriggerTelemetry, recordAutomationTriggerOutcome, resetAutomationTriggerTelemetryForTest } from './automationTelemetry.ts';

describe('local automation trigger telemetry', () => {
	test('records only bounded source/outcome counts and its runtime disclosure', () => {
		resetAutomationTriggerTelemetryForTest();
		recordAutomationTriggerOutcome('syntheticPair', 'fired', 10);
		recordAutomationTriggerOutcome('syntheticPair', 'paused', 11);
		recordAutomationTriggerOutcome('time', 'missed', 12);
		const telemetry = get(automationTriggerTelemetry);
		expect(telemetry).toMatchObject({ schemaVersion: 1, runtime: 'browser', persistenceClass: 'deviceLocal', updatedAt: 12 });
		expect(telemetry.counts.syntheticPair).toEqual({ fired: 1, paused: 1, missed: 0 });
		expect(telemetry.counts.time).toEqual({ fired: 0, paused: 0, missed: 1 });
		const serialized = JSON.stringify(telemetry);
		expect(serialized).not.toContain('marketKey');
		expect(serialized).not.toContain('threshold');
		expect(serialized).not.toContain('walletAddress');
		expect(serialized).not.toContain('orderId');
	});
});
