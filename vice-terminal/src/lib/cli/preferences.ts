import { get, writable, type Writable } from 'svelte/store';
import { hyperliquidNetwork } from '$lib/hl/network';

export type CliPreferences = { aliases: Record<string, string>; variables: Record<string, string> };

const STORAGE_KEY = `vice.cli-preferences.v1:${hyperliquidNetwork.network}`;
const EMPTY: CliPreferences = { aliases: {}, variables: {} };
const NAME = /^[a-z][a-z0-9_-]{0,31}$/i;
const MAX_ENTRIES = 32;
const MAX_VALUE_LENGTH = 256;

export const cliPreferences: Writable<CliPreferences> = writable(EMPTY);
let loaded = false;

function validMap(value: unknown): value is Record<string, string> {
	return value !== null && typeof value === 'object' && Object.entries(value).every(([key, item]) => NAME.test(key) && typeof item === 'string' && item.length > 0 && item.length <= MAX_VALUE_LENGTH);
}

function persist(value: CliPreferences): void {
	if (typeof localStorage === 'undefined') return;
	try { localStorage.setItem(STORAGE_KEY, JSON.stringify(value)); } catch { /* local convenience only */ }
}

export function loadCliPreferences(): CliPreferences {
	if (loaded) return get(cliPreferences);
	loaded = true;
	if (typeof localStorage === 'undefined') return EMPTY;
	try {
		const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
		const value = validMap(parsed?.aliases) && validMap(parsed?.variables) ? { aliases: parsed.aliases, variables: parsed.variables } : EMPTY;
		cliPreferences.set(value);
		return value;
	} catch { return EMPTY; }
}

function update(change: (current: CliPreferences) => CliPreferences): void {
	const next = change(loadCliPreferences());
	cliPreferences.set(next);
	persist(next);
}

export function setCliPreference(kind: keyof CliPreferences, name: string, value: string): string | null {
	if (!NAME.test(name)) return 'Names must start with a letter and use letters, digits, _ or -';
	if (!value.trim() || value.length > MAX_VALUE_LENGTH) return `Values must be 1–${MAX_VALUE_LENGTH} characters`;
	const current = loadCliPreferences()[kind];
	if (!Object.hasOwn(current, name) && Object.keys(current).length >= MAX_ENTRIES) return `Maximum ${MAX_ENTRIES} ${kind} reached`;
	update((existing) => ({ ...existing, [kind]: { ...existing[kind], [name]: value.trim() } }));
	return null;
}

export function deleteCliPreference(kind: keyof CliPreferences, name: string): boolean {
	const current = loadCliPreferences()[kind];
	if (!Object.hasOwn(current, name)) return false;
	update((existing) => {
		const next = { ...existing[kind] };
		delete next[name];
		return { ...existing, [kind]: next };
	});
	return true;
}

export function expandCliInput(input: string): { value: string } | { error: string } {
	const { aliases, variables } = loadCliPreferences();
	const [first, ...rest] = input.trim().split(/\s+/);
	let value = aliases[first] ? `${aliases[first]}${rest.length ? ` ${rest.join(' ')}` : ''}` : input.trim();
	let replacements = 0;
	value = value.replace(/\$([a-z][a-z0-9_-]*)/gi, (_, name) => {
		replacements += 1;
		return variables[name] ?? `$${name}`;
	});
	if (replacements > MAX_ENTRIES) return { error: 'Too many variable expansions' };
	if (value.length > MAX_VALUE_LENGTH) return { error: `Expanded command exceeds ${MAX_VALUE_LENGTH} characters` };
	return { value };
}
