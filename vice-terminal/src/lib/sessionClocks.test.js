import { describe, expect, test } from 'bun:test';
import { isSessionOpen, marketSessions, sessionClock } from './sessionClocks';

describe('US-014 native session clocks', () => {
	test('uses declared exchange hours and never calls a weekend open', () => {
		const nyse = marketSessions.find((session) => session.id === 'nyse');
		expect(isSessionOpen('Mon', 9, 30, nyse)).toBe(true);
		expect(isSessionOpen('Mon', 16, 0, nyse)).toBe(false);
		expect(isSessionOpen('Sat', 10, 0, nyse)).toBe(false);
	});

	test('formats one local clock from an injected instant', () => {
		const nyse = marketSessions.find((session) => session.id === 'nyse');
		const clock = sessionClock(nyse, new Date('2025-01-06T15:00:00.000Z'));
		expect(clock).toMatchObject({ city: 'New York', venue: 'NYSE', weekday: 'Mon', time: '10:00:00', open: true });
	});
});
