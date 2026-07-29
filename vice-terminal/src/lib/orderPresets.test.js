import { describe, expect, test } from 'bun:test';
import { get } from 'svelte/store';
import {
	advancedConfig,
	applyOrderPreset,
	deleteOrderPreset,
	ioc,
	orderLeverage,
	orderPresets,
	orderPrice,
	orderSide,
	orderSize,
	orderType,
	postOnly,
	reduceOnly,
	saveOrderPreset,
	walletAddress
} from './stores';

describe('US-004 account-scoped order presets', () => {
	test('round-trips order intent locally and preserves POST/IOC safety', () => {
		const storage = new Map();
		globalThis.localStorage = {
			getItem: (key) => storage.get(key) ?? null,
			setItem: (key, value) => storage.set(key, value),
			removeItem: (key) => storage.delete(key)
		};
		walletAddress.set('0x0000000000000000000000000000000000000001');
		orderType.set('scale');
		orderSide.set('sell');
		orderPrice.set(123.45);
		orderSize.set(2.5);
		orderLeverage.set(5);
		reduceOnly.set(true);
		postOnly.set(true);
		ioc.set(false);
		advancedConfig.set({ scaleLevels: 7, scaleStartPrice: 120, scaleEndPrice: 130 });

		const saved = saveOrderPreset('  scale setup  ');
		expect(saved.ok).toBe(true);
		const preset = get(orderPresets)[0];
		expect(preset.name).toBe('scale setup');
		expect(preset.advancedConfig.scaleLevels).toBe(7);

		orderType.set('market');
		orderSide.set('buy');
		postOnly.set(false);
		applyOrderPreset(preset);
		expect(get(orderType)).toBe('scale');
		expect(get(orderSide)).toBe('sell');
		expect(get(orderSize)).toBe(2.5);
		expect(get(postOnly)).toBe(true);
		expect(get(ioc)).toBe(false);

		deleteOrderPreset(preset.id);
		expect(get(orderPresets)).toHaveLength(0);
		walletAddress.set(null);
		orderPresets.set([]);
	});
});
