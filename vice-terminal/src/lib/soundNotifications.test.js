import { beforeEach, describe, expect, test } from 'bun:test';
import { get } from 'svelte/store';
import { loadSoundPreference, setSoundMuted, soundMuted } from './soundNotifications';

beforeEach(() => {
	const storage = new Map();
	globalThis.localStorage = {
		getItem: (key) => storage.get(key) ?? null,
		setItem: (key, value) => storage.set(key, value),
		removeItem: (key) => storage.delete(key)
	};
	soundMuted.set(true);
});

describe('US-008 local sound controls', () => {
	test('defaults to mute and persists only the mute preference', async () => {
		expect(loadSoundPreference()).toBe(true);
		await setSoundMuted(false);
		expect(get(soundMuted)).toBe(false);
		await setSoundMuted(true);
		expect(get(soundMuted)).toBe(true);
	});
});
