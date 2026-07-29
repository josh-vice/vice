import { beforeEach, describe, expect, test } from 'bun:test';
import { get } from 'svelte/store';
import { privacyMode, setPrivacyMode } from './privacyMode';

beforeEach(() => {
	const storage = new Map();
	globalThis.localStorage = {
		getItem: (key) => storage.get(key) ?? null,
		setItem: (key, value) => storage.set(key, value),
		removeItem: (key) => storage.delete(key)
	};
	privacyMode.set(false);
});

describe('US-012 privacy mode', () => {
	test('changes only a local display preference', () => {
		setPrivacyMode(true);
		expect(get(privacyMode)).toBe(true);
		setPrivacyMode(false);
		expect(get(privacyMode)).toBe(false);
	});
});
