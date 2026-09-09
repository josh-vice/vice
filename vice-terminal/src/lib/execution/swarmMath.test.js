import { describe, expect, test } from 'bun:test';
import { buildSwarmPrices } from './swarmMath';

describe('US-004 swarm ladder', () => {
	test('builds monotonic post-only intent prices around the center', () => {
		expect(buildSwarmPrices('buy', 100, 2, 3)).toEqual([98, 99, 100]);
		expect(buildSwarmPrices('sell', 100, 2, 3)).toEqual([100, 101, 102]);
	});
	test('rejects unsafe parameters', () => {
		expect(() => buildSwarmPrices('buy', 0, 2, 3)).toThrow();
		expect(() => buildSwarmPrices('buy', 100, 0, 3)).toThrow();
		expect(() => buildSwarmPrices('buy', 100, 2, 101)).toThrow();
	});
});
