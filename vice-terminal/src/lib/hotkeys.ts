export type HotkeyAction = 'buy' | 'sell' | 'size10' | 'size20' | 'size30' | 'size40' | 'size50' | 'size60' | 'size70' | 'size80' | 'size90' | 'time1m' | 'time5m' | 'time15m' | 'time1h' | 'time4h' | 'time1d' | 'armClick' | 'cli' | 'focusChart' | 'focusBook' | 'focusTicket' | 'focusBottom';
export type HotkeyBindings = Record<HotkeyAction, string>;

export const DEFAULT_HOTKEYS: HotkeyBindings = {
	buy: 'b', sell: 's', size10: '1', size20: '2', size30: '3', size40: '4', size50: '5', size60: '6', size70: '7', size80: '8', size90: '9', time1m: 'alt+1', time5m: 'alt+2', time15m: 'alt+3', time1h: 'alt+4', time4h: 'alt+5', time1d: 'alt+6', armClick: 'a', cli: 'mod+k', focusChart: 'alt+c', focusBook: 'alt+b', focusTicket: 'alt+t', focusBottom: 'alt+p'
};
export const HOTKEY_ACTION_IDS: Record<HotkeyAction, string> = Object.fromEntries(
	Object.keys(DEFAULT_HOTKEYS).map((action) => [action, `hotkey.${action}`])
) as Record<HotkeyAction, string>;

const STORAGE_KEY = 'vice.hotkeys.v1';

export function loadHotkeys(): HotkeyBindings {
	if (typeof localStorage === 'undefined') return DEFAULT_HOTKEYS;
	try {
		const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
		const next = { ...DEFAULT_HOTKEYS };
		for (const action of Object.keys(DEFAULT_HOTKEYS) as HotkeyAction[]) {
			if (typeof saved?.[action] === 'string' && saved[action].length > 0 && saved[action].length < 32) next[action] = saved[action].toLowerCase();
		}
		return new Set(Object.values(next)).size === Object.keys(next).length ? next : DEFAULT_HOTKEYS;
	} catch { return DEFAULT_HOTKEYS; }
}

export function isTypingTarget(target: EventTarget | null): boolean {
	const element = target as HTMLElement | null;
	return Boolean(element && (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.tagName === 'SELECT' || element.isContentEditable));
}

export function hotkeyFromEvent(event: Pick<KeyboardEvent, 'key' | 'metaKey' | 'ctrlKey' | 'altKey'>): string {
	return `${event.metaKey || event.ctrlKey ? 'mod+' : ''}${event.altKey ? 'alt+' : ''}${event.key.toLowerCase()}`;
}

export function actionForHotkey(bindings: HotkeyBindings, key: string): HotkeyAction | null {
	return (Object.entries(bindings).find(([, binding]) => binding === key)?.[0] as HotkeyAction | undefined) ?? null;
}

export function setHotkeyBinding(action: HotkeyAction, binding: string): { ok: true; bindings: HotkeyBindings } | { ok: false; error: string } {
	const normalized = binding.trim().toLowerCase();
	if (!normalized || normalized.length > 31) return { ok: false, error: 'Enter one key or modifier combination' };
	const current = loadHotkeys();
	const conflict = (Object.entries(current) as Array<[HotkeyAction, string]>).find(([other, value]) => other !== action && value === normalized);
	if (conflict) return { ok: false, error: `${normalized} is already bound to ${conflict[0]}` };
	const next = { ...current, [action]: normalized };
	if (typeof localStorage !== 'undefined') {
		try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* local preference only */ }
	}
	return { ok: true, bindings: next };
}
