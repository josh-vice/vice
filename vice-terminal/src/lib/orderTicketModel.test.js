import { describe, expect, test } from 'bun:test';
import {
	ORDER_TYPE_GROUPS,
	QUICK_ORDER_TYPES,
	SIZE_PRESETS,
	persistenceClass
} from './orderTicketModel.ts';

describe('order ticket model', () => {
	test('keeps the canonical quick-order catalog', () => {
		expect(QUICK_ORDER_TYPES.map((type) => type.id)).toEqual(['limit', 'market', 'stop', 'bracket']);
		expect(SIZE_PRESETS).toEqual([10, 25, 50, 75, 100]);
	});

	test('preserves grouped advanced order types', () => {
		expect(ORDER_TYPE_GROUPS.map((group) => group.group)).toEqual(['Basic', 'Conditional', 'Advanced']);
		expect(ORDER_TYPE_GROUPS.flatMap((group) => group.types).map((type) => type.id)).toContain('trailing_stop');
	});

	test('classifies venue-native and device-local persistence', () => {
		expect(persistenceClass('limit').local).toBe(false);
		expect(persistenceClass('twap').label).toBe('Venue-native');
		expect(persistenceClass('trailing_stop').local).toBe(true);
	});
});
