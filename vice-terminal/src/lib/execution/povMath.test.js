import { describe, expect, test } from 'bun:test';
import { participationSlice, publicVolume } from './povMath';

describe('POV public-volume sizing', () => {
	const trades = [
		{ id: '1', price: 100, size: 2, side: 'buy', timestamp: 1 },
		{ id: '2', price: 100, size: 3, side: 'sell', timestamp: 2 }
	];

	test('uses only the configured public trade window', () => {
		expect(publicVolume(trades, 1)).toBe(2);
		expect(publicVolume(trades, 2)).toBe(5);
	});

	test('caps each child by participation and remaining size', () => {
		expect(participationSlice(10, trades, 0.2, 2)).toBe(1);
		expect(participationSlice(0.5, trades, 0.2, 2)).toBe(0.5);
	});
});
