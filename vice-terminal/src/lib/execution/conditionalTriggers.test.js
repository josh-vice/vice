import { describe, expect, test } from 'bun:test';
import { evaluateConditionalTrigger, pauseConditionalTrigger } from './conditionalTriggers.ts';

const price = (value, live = true) => ({ nowMs: 1, price: { marketKey: 'hl:BTC', value, live } });

describe('conditional trigger engine', () => {
	test('arms price triggers before a live edge, then fires exactly once', () => {
		const trigger = { type: 'priceCross', marketKey: 'hl:BTC', comparator: 'atOrAbove', threshold: 100 };
		const armed = evaluateConditionalTrigger(trigger, undefined, price(99));
		expect(armed.action).toBe('armed');
		const fired = evaluateConditionalTrigger(trigger, armed.state, price(100));
		expect(fired.action).toBe('fired');
		expect(evaluateConditionalTrigger(trigger, fired.state, price(101)).action).toBe('fired');
	});

	test('never fires a cached price and reports a crossing during staleness as missed', () => {
		const trigger = { type: 'priceCross', marketKey: 'hl:BTC', comparator: 'atOrAbove', threshold: 100 };
		const armed = evaluateConditionalTrigger(trigger, undefined, price(99));
		const paused = evaluateConditionalTrigger(trigger, armed.state, price(99, false));
		expect(paused.action).toBe('paused');
		const missed = evaluateConditionalTrigger(trigger, paused.state, price(101));
		expect(missed.action).toBe('missed');
		expect(missed.reason).toContain('stale');
	});

	test('requires a new completed live candle and rejects duplicates', () => {
		const trigger = { type: 'candleClose', marketKey: 'hl:BTC', interval: '1m', comparator: 'atOrBelow', threshold: 90 };
		const first = evaluateConditionalTrigger(trigger, undefined, { nowMs: 1, candle: { marketKey: 'hl:BTC', interval: '1m', close: 89, volume: 10, closedAtMs: 60_000, complete: true, live: true } });
		expect(first.action).toBe('armed');
		expect(evaluateConditionalTrigger(trigger, first.state, { nowMs: 2, candle: { marketKey: 'hl:BTC', interval: '1m', close: 89, volume: 10, closedAtMs: 60_000, complete: true, live: true } }).action).toBe('pending');
		expect(evaluateConditionalTrigger(trigger, first.state, { nowMs: 3, candle: { marketKey: 'hl:BTC', interval: '1m', close: 89, volume: 10, closedAtMs: 120_000, complete: true, live: true } }).action).toBe('fired');
	});

	test('re-arms after a stale candle without applying its cached close', () => {
		const trigger = { type: 'candleVolume', marketKey: 'hl:BTC', interval: '1m', comparator: 'atOrAbove', threshold: 100 };
		const armed = evaluateConditionalTrigger(trigger, undefined, { nowMs: 1, candle: { marketKey: 'hl:BTC', interval: '1m', close: 100, volume: 10, closedAtMs: 60_000, complete: true, live: true } });
		const paused = evaluateConditionalTrigger(trigger, armed.state, { nowMs: 2, candle: { marketKey: 'hl:BTC', interval: '1m', close: 100, volume: 1_000, closedAtMs: 120_000, complete: true, live: false } });
		expect(paused.action).toBe('paused');
		expect(evaluateConditionalTrigger(trigger, paused.state, { nowMs: 3, candle: { marketKey: 'hl:BTC', interval: '1m', close: 100, volume: 1_000, closedAtMs: 120_000, complete: true, live: true } }).action).toBe('armed');
	});

	test('does not backfill time triggers after they were due before arming or during a clock outage', () => {
		const trigger = { type: 'time', fireAtMs: 100 };
		expect(evaluateConditionalTrigger(trigger, undefined, { nowMs: 100, clockLive: true }).action).toBe('missed');
		const armed = evaluateConditionalTrigger(trigger, undefined, { nowMs: 99, clockLive: true });
		const paused = evaluateConditionalTrigger(trigger, armed.state, { nowMs: 99, clockLive: false });
		expect(evaluateConditionalTrigger(trigger, paused.state, { nowMs: 101, clockLive: true }).action).toBe('missed');
	});

	test('requires exact, live pair identities before a synthetic trigger can fire', () => {
		const trigger = { type: 'syntheticPair', leftMarketKey: 'hl:BTC', rightMarketKey: 'hl:ETH', operation: 'ratio', comparator: 'atOrAbove', threshold: 2 };
		const invalid = evaluateConditionalTrigger(trigger, undefined, { nowMs: 1, pair: { leftMarketKey: 'BTC', leftValue: 200, leftLive: true, rightMarketKey: 'hl:ETH', rightValue: 100, rightLive: true } });
		expect(invalid.action).toBe('invalid');
		const armed = evaluateConditionalTrigger(trigger, undefined, { nowMs: 1, pair: { leftMarketKey: 'hl:BTC', leftValue: 190, leftLive: true, rightMarketKey: 'hl:ETH', rightValue: 100, rightLive: true } });
		expect(armed.action).toBe('armed');
		expect(evaluateConditionalTrigger(trigger, armed.state, { nowMs: 2, pair: { leftMarketKey: 'hl:BTC', leftValue: 200, leftLive: true, rightMarketKey: 'hl:ETH', rightValue: 100, rightLive: true } }).action).toBe('fired');
	});

	test('allows a signed spread threshold but never a non-finite spread', () => {
		const trigger = { type: 'syntheticPair', leftMarketKey: 'hl:BTC', rightMarketKey: 'hl:ETH', operation: 'spread', comparator: 'atOrAbove', threshold: -10 };
		const armed = evaluateConditionalTrigger(trigger, undefined, { nowMs: 1, pair: { leftMarketKey: 'hl:BTC', leftValue: 80, leftLive: true, rightMarketKey: 'hl:ETH', rightValue: 100, rightLive: true } });
		expect(armed.action).toBe('armed');
		expect(evaluateConditionalTrigger(trigger, armed.state, { nowMs: 2, pair: { leftMarketKey: 'hl:BTC', leftValue: 95, leftLive: true, rightMarketKey: 'hl:ETH', rightValue: 100, rightLive: true } }).action).toBe('fired');
		expect(evaluateConditionalTrigger(trigger, undefined, { nowMs: 3, pair: { leftMarketKey: 'hl:BTC', leftValue: Number.NaN, leftLive: true, rightMarketKey: 'hl:ETH', rightValue: 100, rightLive: true } }).action).toBe('invalid');
	});

	test('preserves terminal trigger decisions when paused', () => {
		expect(pauseConditionalTrigger({ status: 'fired' }, 1).status).toBe('fired');
		expect(pauseConditionalTrigger({ status: 'missed' }, 1).status).toBe('missed');
	});
});
