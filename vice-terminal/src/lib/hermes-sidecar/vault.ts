/**
 * hermes-sidecar — vault.ts
 *
 * Device-local storage shim for the CERTIFIED execution modules. The browser
 * execution boundary reads/writes `localStorage` (agentVault encrypted record,
 * command journal, sequence) and checks `window.isSecureContext`. Bun has
 * neither, so this module installs:
 *
 *   - globalThis.localStorage  -> JSON file at <stateDir>/vault.json
 *   - globalThis.window        -> { isSecureContext: true }
 *
 * The vault file lives in `~/.vice-hermes/` (mode 700 dir, 600 file) per the
 * approved plan §2.3. Only the encrypted record and journal bytes are stored;
 * no key material is ever serialized in the clear. This is transport glue, not
 * a second credential store — the certified modules keep all crypto.
 *
 * MUST be imported before any src/lib execution module evaluates.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync, statSync, chmodSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const VAULT_DIR = process.env.VICE_HERMES_DIR ?? join(homedir(), '.vice-hermes');
const VAULT_FILE = join(VAULT_DIR, 'vault.json');
// The vault shares the file with the non-secret market-catalog cache
// (certified hl/markets writes it through the same localStorage shim). The
// catalog is ~2MB of public data; secrets stay tiny and encrypted. Cap at a
// generous bound so a healthy catalog never makes the vault unloadable.
const MAX_VAULT_BYTES = 16 * 1024 * 1024;

function ensureVaultFile(): void {
	mkdirSync(VAULT_DIR, { recursive: true, mode: 0o700 });
	try {
		chmodSync(VAULT_DIR, 0o700);
	} catch {
		/* best effort */
	}
	if (!existsSync(VAULT_FILE)) {
		writeFileSync(VAULT_FILE, '{}', { mode: 0o600 });
	}
	try {
		chmodSync(VAULT_FILE, 0o600);
	} catch {
		/* best effort */
	}
}

interface VaultStore {
	data: Record<string, string>;
	loaded: boolean;
}

const store: VaultStore = { data: {}, loaded: false };

function load(): void {
	if (store.loaded) return;
	ensureVaultFile();
	try {
		const raw = readFileSync(VAULT_FILE, 'utf8');
		if (raw.length > MAX_VAULT_BYTES) {
			throw new Error(`vault exceeds ${MAX_VAULT_BYTES} bytes; refusing to load`);
		}
		const parsed = JSON.parse(raw) as Record<string, unknown>;
		store.data = {};
		for (const [key, value] of Object.entries(parsed)) {
			if (typeof value === 'string') store.data[key] = value;
		}
	} catch (error) {
		// A corrupt vault must fail closed for signing, but a read-only sidecar
		// should still boot. Persist nothing until the first explicit write,
		// which re-initializes the file.
		console.error('[hermes-sidecar] vault load failed; starting empty:', error);
		store.data = {};
	}
	store.loaded = true;
}

function persist(): void {
	ensureVaultFile();
	try {
		writeFileSync(VAULT_FILE, JSON.stringify(store.data, null, 2), { mode: 0o600 });
	} catch (error) {
		console.error('[hermes-sidecar] vault persist failed:', error);
	}
}

function localStorageShim(): Storage {
	load();
	return {
		get length(): number {
			return Object.keys(store.data).length;
		},
		clear(): void {
			store.data = {};
			persist();
		},
		getItem(key: string): string | null {
			load();
			return Object.prototype.hasOwnProperty.call(store.data, key) ? store.data[key] : null;
		},
		key(index: number): string | null {
			load();
			return Object.keys(store.data)[index] ?? null;
		},
		removeItem(key: string): void {
			load();
			if (Object.prototype.hasOwnProperty.call(store.data, key)) {
				delete store.data[key];
				persist();
			}
		},
		setItem(key: string, value: string): void {
			load();
			store.data[key] = String(value);
			persist();
		}
	};
}

/** Install the device-local storage shims. The sidecar is the authority on
 * its own storage: force-replace whatever a prior module may have left on
 * globalThis (some lib tests install throwaway localStorage mocks), with
 * configurable/writable so tests that delete or swap it afterwards still work. */
export function installVaultShims(): void {
	const g = globalThis as unknown as {
		localStorage?: Storage;
		window?: { isSecureContext?: boolean };
	};
	try {
		Object.defineProperty(g, 'localStorage', {
			value: localStorageShim(),
			configurable: true,
			writable: true,
			enumerable: true
		});
	} catch {
		(g as { localStorage?: Storage }).localStorage = localStorageShim();
	}
	if (!g.window) {
		g.window = { isSecureContext: true };
	} else {
		g.window.isSecureContext = true;
	}
}

export function vaultLocation(): string {
	return VAULT_FILE;
}
