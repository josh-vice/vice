import { get, writable, type Writable } from 'svelte/store';
import { hyperliquidNetwork } from './hl/network';

const STORAGE_KEY = `vice.privacy-mode.v1:${hyperliquidNetwork.network}`;

export const privacyMode: Writable<boolean> = writable(false);
let loaded = false;

export function loadPrivacyMode(): boolean {
	if (loaded) return get(privacyMode);
	loaded = true;
	if (typeof localStorage === 'undefined') return false;
	try {
		const enabled = localStorage.getItem(STORAGE_KEY) === 'true';
		privacyMode.set(enabled);
		return enabled;
	} catch {
		return false;
	}
}

export function setPrivacyMode(enabled: boolean): void {
	loaded = true;
	privacyMode.set(enabled);
	if (typeof localStorage === 'undefined') return;
	try { localStorage.setItem(STORAGE_KEY, String(enabled)); } catch { /* local preference only */ }
}
