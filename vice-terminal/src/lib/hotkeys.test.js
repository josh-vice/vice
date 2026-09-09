import { describe, expect, test } from 'bun:test';
import { actionForHotkey, DEFAULT_HOTKEYS, hotkeyFromEvent, setHotkeyBinding } from './hotkeys';

describe('US-012 hotkey routing', () => {
	test('uses a canonical modifier key and maps only configured actions', () => {
		expect(hotkeyFromEvent({ key: 'K', metaKey: true, ctrlKey: false, altKey: false })).toBe('mod+k');
		expect(hotkeyFromEvent({ key: '1', metaKey: false, ctrlKey: false, altKey: true })).toBe('alt+1');
		expect(actionForHotkey(DEFAULT_HOTKEYS, 'b')).toBe('buy');
		expect(actionForHotkey(DEFAULT_HOTKEYS, 'alt+1')).toBe('time1m');
		expect(actionForHotkey(DEFAULT_HOTKEYS, 'a')).toBe('armClick');
		expect(actionForHotkey(DEFAULT_HOTKEYS, 'alt+t')).toBe('focusTicket');
		expect(new Set(Object.values(DEFAULT_HOTKEYS)).size).toBe(Object.keys(DEFAULT_HOTKEYS).length);
		expect(actionForHotkey(DEFAULT_HOTKEYS, 'x')).toBeNull();
	});

	test('rejects a conflicting saved binding', () => {
		globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
		expect(setHotkeyBinding('sell', 'b')).toMatchObject({ ok: false });
	});
});
