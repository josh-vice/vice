import { describe, expect, test } from 'bun:test';
import { candleCountdown, candleFrames, formatCountdown, utcClock } from './candleCountdown';

describe('US-014 native candle close countdown', () => {
	test('uses UTC-aligned hourly, daily, and Monday weekly boundaries', () => {
		const start = Date.parse('2025-01-06T00:00:00.000Z'); // Monday
		expect(candleCountdown(candleFrames[0], start + 30 * 60_000)).toMatchObject({ labelledRemaining: '00:30:00', progress: 0.5 });
		expect(candleCountdown(candleFrames[2], start + 12 * 60 * 60_000)).toMatchObject({ labelledRemaining: '12:00:00', progress: 0.5 });
		expect(candleCountdown(candleFrames[3], start)).toMatchObject({ labelledRemaining: '7d 00:00:00', progress: 0 });
	});

	test('formats an injected UTC clock without a market or feed dependency', () => {
		expect(formatCountdown(-1)).toBe('00:00:00');
		expect(utcClock(Date.parse('2025-01-06T12:34:56.000Z'))).toBe('12:34:56');
	});
});
