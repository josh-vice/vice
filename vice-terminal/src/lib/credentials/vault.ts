import type { VenueEnvironment } from '$lib/venue/adapter';
import type { VenueId } from '$lib/venue/identity';
import type {
	CredentialInput,
	EncryptedVaultV1,
	NewVenueAccount,
	SavedVenueAccount,
	TradingPermission
} from './types';

export const VAULT_STORAGE_KEY = 'vice.cex-vault.v1';
export const MAX_SAVED_ACCOUNTS = 16;
export const MAX_LABEL_LENGTH = 40;
export const MAX_CREDENTIAL_LENGTH = 256;

const VAULT_VERSION = 1 as const;
const PBKDF2_ITERATIONS = 600_000;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const ADDITIONAL_DATA = 'vice-cex-vault:v1';

const VENUE_IDS: ReadonlySet<VenueId> = new Set([
	'hyperliquid',
	'binance',
	'bybit',
	'blofin',
	'lighter',
	'nado',
	'blofinDex'
]);
const VENUE_ENVIRONMENTS: ReadonlySet<VenueEnvironment> = new Set(['demo', 'testnet', 'production']);

interface StoredVaultAccount {
	metadata: SavedVenueAccount;
	credentials: CredentialInput;
}

type PersistedVaultAccount = SavedVenueAccount & { credentials: CredentialInput };

interface VaultPayloadV1 {
	version: 1;
	accounts: PersistedVaultAccount[];
}

type CryptoWithWebcrypto = Crypto & { webcrypto?: Crypto };
type UnknownRecord = Record<string, unknown>;

let unlockedKey: CryptoKey | null = null;
let unlockedPassphrase: Uint8Array | null = null;
let unlockedAccounts: Map<string, StoredVaultAccount> | null = null;
let vaultSession = 0;
let operationTail: Promise<void> = Promise.resolve();

function isRecord(value: unknown): value is UnknownRecord {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function webCrypto(): Crypto {
	const runtime = globalThis as typeof globalThis & { crypto?: CryptoWithWebcrypto };
	const candidate = runtime.crypto;
	if (candidate && candidate.subtle && typeof candidate.getRandomValues === 'function') return candidate;

	// Some test runtimes expose the Web Crypto implementation as a namespace
	// object's `webcrypto` property instead of installing it globally.
	const fallback = candidate?.webcrypto;
	if (fallback) return fallback;

	throw new Error('Web Crypto API is unavailable');
}

function storage(): Storage {
	const candidate = (globalThis as typeof globalThis & { localStorage?: Storage }).localStorage;
	if (!candidate) throw new Error('Vault storage is unavailable');
	return candidate;
}

function characterLength(value: string): number {
	return Array.from(value).length;
}

function boundedString(value: unknown, field: string, maximum: number): string {
	if (typeof value !== 'string') throw new Error(`${field} must be a string`);
	const length = characterLength(value);
	if (length < 1 || length > maximum) {
		throw new Error(`${field} must contain between 1 and ${maximum} characters`);
	}
	return value;
}

function trimmedBoundedString(value: unknown, field: string, maximum: number): string {
	return boundedString(typeof value === 'string' ? value.trim() : value, field, maximum);
}

function isVenueId(value: unknown): value is VenueId {
	return typeof value === 'string' && VENUE_IDS.has(value as VenueId);
}

function isVenueEnvironment(value: unknown): value is VenueEnvironment {
	return typeof value === 'string' && VENUE_ENVIRONMENTS.has(value as VenueEnvironment);
}

function normalizePermissions(value: unknown): TradingPermission[] {
	if (!Array.isArray(value)) throw new Error('permissions must be an array');
	const permissions: TradingPermission[] = [];
	for (const permission of value) {
		if (typeof permission === 'string' && permission.toLowerCase() === 'transfer') {
			throw new Error('TRANSFER permission is not allowed in the vault');
		}
		if (permission !== 'read' && permission !== 'trade') {
			throw new Error('Vault permissions must be read or trade');
		}
		if (permissions.includes(permission)) throw new Error('Vault permissions cannot contain duplicates');
		permissions.push(permission);
	}
	return permissions;
}

function normalizeMetadata(value: unknown): Omit<SavedVenueAccount, 'id' | 'createdAt' | 'updatedAt'> {
	if (!isRecord(value)) throw new Error('Vault account metadata is invalid');
	if (!isVenueId(value.venue)) throw new Error('Vault account venue is invalid');
	if (!isVenueEnvironment(value.environment)) throw new Error('Vault account environment is invalid');
	return {
		venue: value.venue,
		label: trimmedBoundedString(value.label, 'label', MAX_LABEL_LENGTH),
		environment: value.environment,
		permissions: normalizePermissions(value.permissions)
	};
}

function normalizeCredentials(value: unknown): CredentialInput {
	if (!isRecord(value)) throw new Error('Vault credentials are invalid');
	return {
		apiKey: trimmedBoundedString(value.apiKey, 'apiKey', MAX_CREDENTIAL_LENGTH),
		secret: boundedString(value.secret, 'secret', MAX_CREDENTIAL_LENGTH),
		passphrase: trimmedBoundedString(value.passphrase, 'passphrase', MAX_CREDENTIAL_LENGTH)
	};
}

function rootPassphraseBytes(value: unknown): Uint8Array {
	if (typeof value !== 'string' || value.length === 0) throw new Error('Vault passphrase is required');
	return new TextEncoder().encode(value);
}

function bytesToBase64(bytes: Uint8Array): string {
	let binary = '';
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary);
}

function base64ToBytes(value: unknown, field: string): Uint8Array {
	if (typeof value !== 'string' || value.length === 0) throw new Error(`Invalid vault ${field}`);
	try {
		const binary = atob(value);
		return Uint8Array.from(binary, (character) => character.charCodeAt(0));
	} catch {
		throw new Error(`Invalid vault ${field}`);
	}
}

function deriveKey(api: Crypto, passphrase: Uint8Array, salt: Uint8Array): Promise<CryptoKey> {
	return api.subtle
		.importKey('raw', passphrase as unknown as BufferSource, 'PBKDF2', false, ['deriveKey'])
		.then((material) =>
			api.subtle.deriveKey(
				{
					name: 'PBKDF2',
					hash: 'SHA-256',
					iterations: PBKDF2_ITERATIONS,
					salt: salt as unknown as BufferSource
				},
				material,
				{ name: 'AES-GCM', length: 256 },
				false,
				['encrypt', 'decrypt']
			)
		);
}

function additionalData(): Uint8Array {
	return new TextEncoder().encode(ADDITIONAL_DATA);
}

function encryptPayload(
	accounts: Map<string, StoredVaultAccount>,
	passphrase: Uint8Array
): Promise<{ record: EncryptedVaultV1; key: CryptoKey }> {
	const api = webCrypto();
	const salt = api.getRandomValues(new Uint8Array(SALT_LENGTH));
	const iv = api.getRandomValues(new Uint8Array(IV_LENGTH));
	const passphraseCopy = new Uint8Array(passphrase);
	const plaintext = new TextEncoder().encode(
		JSON.stringify({
			version: VAULT_VERSION,
			accounts: Array.from(accounts.values(), ({ metadata, credentials }) => ({
				...metadata,
				permissions: [...metadata.permissions],
				credentials: { ...credentials }
			}))
		} satisfies VaultPayloadV1)
	);

	return deriveKey(api, passphraseCopy, salt)
		.then(async (key) => {
			try {
				const ciphertext = await api.subtle.encrypt(
					{
						name: 'AES-GCM',
						iv: iv as unknown as BufferSource,
						additionalData: additionalData() as unknown as BufferSource
					},
					key,
					plaintext as unknown as BufferSource
				);
				return {
					record: {
						version: VAULT_VERSION,
						salt: bytesToBase64(salt),
						iv: bytesToBase64(iv),
						ciphertext: bytesToBase64(new Uint8Array(ciphertext))
					},
					key
				};
			} finally {
				plaintext.fill(0);
			}
		})
		.finally(() => passphraseCopy.fill(0));
}

function readEncryptedRecord(): {
	record: EncryptedVaultV1;
	salt: Uint8Array;
	iv: Uint8Array;
	ciphertext: Uint8Array;
} {
	let parsed: unknown;
	try {
		const raw = storage().getItem(VAULT_STORAGE_KEY);
		if (raw === null) throw new Error('Vault record not found');
		parsed = JSON.parse(raw);
	} catch (error) {
		if (error instanceof Error && /vault/i.test(error.message)) throw error;
		throw new Error('Invalid vault record');
	}

	if (!isRecord(parsed)) throw new Error('Invalid vault record');
	if (parsed.version !== VAULT_VERSION) throw new Error('Unsupported vault version');

	const salt = base64ToBytes(parsed.salt, 'salt');
	const iv = base64ToBytes(parsed.iv, 'iv');
	const ciphertext = base64ToBytes(parsed.ciphertext, 'ciphertext');
	if (salt.length !== SALT_LENGTH) throw new Error('Invalid vault salt');
	if (iv.length !== IV_LENGTH) throw new Error('Invalid vault IV');
	if (ciphertext.length < 16) throw new Error('Invalid vault ciphertext');

	return {
		record: {
			version: VAULT_VERSION,
			salt: parsed.salt as string,
			iv: parsed.iv as string,
			ciphertext: parsed.ciphertext as string
		},
		salt,
		iv,
		ciphertext
	};
}

function timestamp(value: unknown, field: string): number {
	if (!Number.isSafeInteger(value) || (value as number) < 0) {
		throw new Error(`Invalid vault ${field}`);
	}
	return value as number;
}

function accountId(value: unknown): string {
	if (typeof value !== 'string' || value.length === 0 || value.length > 128) {
		throw new Error('Invalid vault account id');
	}
	return value;
}

function parsePayload(plaintext: Uint8Array): Map<string, StoredVaultAccount> {
	let parsed: unknown;
	try {
		parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(plaintext));
	} catch {
		throw new Error('Invalid vault payload');
	}
	if (!isRecord(parsed) || parsed.version !== VAULT_VERSION || !Array.isArray(parsed.accounts)) {
		throw new Error('Invalid vault payload');
	}
	if (parsed.accounts.length > MAX_SAVED_ACCOUNTS) throw new Error('Vault account maximum exceeded');

	const accounts = new Map<string, StoredVaultAccount>();
	for (const value of parsed.accounts) {
		if (!isRecord(value)) throw new Error('Invalid vault account');
		const id = accountId(value.id);
		if (accounts.has(id)) throw new Error('Duplicate vault account id');
		const metadata = normalizeMetadata(value);
		const createdAt = timestamp(value.createdAt, 'createdAt');
		const updatedAt = timestamp(value.updatedAt, 'updatedAt');
		accounts.set(id, {
			metadata: { id, ...metadata, createdAt, updatedAt },
			credentials: normalizeCredentials(value.credentials)
		});
	}
	return accounts;
}

async function decryptPayload(
	record: { salt: Uint8Array; iv: Uint8Array; ciphertext: Uint8Array },
	passphrase: Uint8Array
): Promise<{ accounts: Map<string, StoredVaultAccount>; key: CryptoKey }> {
	const api = webCrypto();
	const key = await deriveKey(api, passphrase, record.salt);
	const plaintext = new Uint8Array(
		await api.subtle.decrypt(
			{
				name: 'AES-GCM',
				iv: record.iv as unknown as BufferSource,
				additionalData: additionalData() as unknown as BufferSource
			},
			key,
			record.ciphertext as unknown as BufferSource
		)
	);
	try {
		return { accounts: parsePayload(plaintext), key };
	} finally {
		plaintext.fill(0);
	}
}

function writeEncryptedRecord(record: EncryptedVaultV1): void {
	try {
		storage().setItem(VAULT_STORAGE_KEY, JSON.stringify(record));
	} catch {
		throw new Error('Vault storage write failed');
	}
}

function cloneMetadata(metadata: SavedVenueAccount): SavedVenueAccount {
	return { ...metadata, permissions: [...metadata.permissions] };
}

function cloneAccount(account: StoredVaultAccount): StoredVaultAccount {
	return {
		metadata: cloneMetadata(account.metadata),
		credentials: { ...account.credentials }
	};
}

function cloneAccounts(accounts: Map<string, StoredVaultAccount>): Map<string, StoredVaultAccount> {
	return new Map(Array.from(accounts, ([id, account]) => [id, cloneAccount(account)]));
}

function unlockedState(): {
	key: CryptoKey;
	passphrase: Uint8Array;
	accounts: Map<string, StoredVaultAccount>;
	session: number;
} {
	if (!unlockedKey || !unlockedPassphrase || !unlockedAccounts) throw new Error('Vault is locked');
	return {
		key: unlockedKey,
		passphrase: unlockedPassphrase,
		accounts: unlockedAccounts,
		session: vaultSession
	};
}

function assertCurrentSession(session: number): void {
	if (session !== vaultSession) throw new Error('Vault was locked during the operation');
}

function enqueue<T>(operation: () => Promise<T>): Promise<T> {
	const next = operationTail.then(operation, operation);
	operationTail = next.then(
		() => undefined,
		() => undefined
	);
	return next;
}

function opaqueId(accounts: Map<string, StoredVaultAccount>): string {
	const api = webCrypto();
	for (let attempt = 0; attempt < 8; attempt += 1) {
		const id = typeof api.randomUUID === 'function'
			? api.randomUUID()
			: bytesToBase64(api.getRandomValues(new Uint8Array(16))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/u, '');
		if (!accounts.has(id)) return id;
	}
	throw new Error('Unable to allocate an opaque vault account id');
}

function unlockError(error: unknown): Error {
	if (error instanceof Error && /vault|locked/i.test(error.message)) return error;
	return new Error('Unable to unlock vault');
}

export function isVaultUnlocked(): boolean {
	return unlockedKey !== null && unlockedPassphrase !== null && unlockedAccounts !== null;
}

export function lockVault(): void {
	vaultSession += 1;
	if (unlockedAccounts) unlockedAccounts.clear();
	unlockedAccounts = null;
	unlockedKey = null;
	if (unlockedPassphrase) unlockedPassphrase.fill(0);
	unlockedPassphrase = null;
}

export function listSavedAccounts(): SavedVenueAccount[] {
	if (!unlockedAccounts) return [];
	return Array.from(unlockedAccounts.values(), ({ metadata }) => cloneMetadata(metadata));
}

export function createVault(rootPassphrase: string): Promise<void> {
	lockVault();
	const session = vaultSession;
	return enqueue(async () => {
		const passphrase = rootPassphraseBytes(rootPassphrase);
		let retained = false;
		try {
			const accounts = new Map<string, StoredVaultAccount>();
			const encrypted = await encryptPayload(accounts, passphrase);
			assertCurrentSession(session);
			writeEncryptedRecord(encrypted.record);
			unlockedKey = encrypted.key;
			unlockedPassphrase = passphrase;
			unlockedAccounts = accounts;
			retained = true;
		} finally {
			if (!retained) passphrase.fill(0);
		}
	});
}

export function unlockVault(rootPassphrase: string): Promise<void> {
	lockVault();
	const session = vaultSession;
	return enqueue(async () => {
		const passphrase = rootPassphraseBytes(rootPassphrase);
		let retained = false;
		try {
			const encrypted = readEncryptedRecord();
			const decrypted = await decryptPayload(encrypted, passphrase);
			assertCurrentSession(session);
			// Install key state only after authenticated decryption succeeds.
			unlockedKey = decrypted.key;
			unlockedPassphrase = passphrase;
			unlockedAccounts = decrypted.accounts;
			retained = true;
		} catch (error) {
			if (session === vaultSession) {
				if (unlockedAccounts) unlockedAccounts.clear();
				unlockedAccounts = null;
				unlockedKey = null;
			}
			throw unlockError(error);
		} finally {
			if (!retained) passphrase.fill(0);
		}
	});
}

export function addAccount(metadata: NewVenueAccount, credentials: CredentialInput): Promise<SavedVenueAccount> {
	return enqueue(async () => {
		const state = unlockedState();
		const normalizedMetadata = normalizeMetadata(metadata);
		const normalizedCredentials = normalizeCredentials(credentials);
		if (state.accounts.size >= MAX_SAVED_ACCOUNTS) {
			throw new Error(`Vault supports a maximum of ${MAX_SAVED_ACCOUNTS} accounts`);
		}

		const id = opaqueId(state.accounts);
		const now = Date.now();
		const saved: SavedVenueAccount = {
			id,
			...normalizedMetadata,
			createdAt: now,
			updatedAt: now
		};
		const nextAccounts = cloneAccounts(state.accounts);
		nextAccounts.set(id, { metadata: saved, credentials: normalizedCredentials });
		let committed = false;
		try {
			const encrypted = await encryptPayload(nextAccounts, state.passphrase);
			assertCurrentSession(state.session);
			writeEncryptedRecord(encrypted.record);
			unlockedKey = encrypted.key;
			unlockedAccounts = nextAccounts;
			state.accounts.clear();
			committed = true;
			return cloneMetadata(saved);
		} finally {
			if (!committed) nextAccounts.clear();
		}
	});
}

export function deleteAccount(id: string): Promise<void> {
	return enqueue(async () => {
		const state = unlockedState();
		if (typeof id !== 'string' || id.length === 0 || !state.accounts.has(id)) {
			throw new Error('Vault account not found');
		}

		const nextAccounts = cloneAccounts(state.accounts);
		nextAccounts.delete(id);
		let committed = false;
		try {
			const encrypted = await encryptPayload(nextAccounts, state.passphrase);
			assertCurrentSession(state.session);
			writeEncryptedRecord(encrypted.record);
			unlockedKey = encrypted.key;
			unlockedAccounts = nextAccounts;
			state.accounts.clear();
			committed = true;
		} finally {
			if (!committed) nextAccounts.clear();
		}
	});
}

export async function withUnlockedCredentials<T>(
	id: string,
	callback: (credentials: CredentialInput) => T | PromiseLike<T>
): Promise<T> {
	if (typeof callback !== 'function') throw new Error('Vault credential callback is required');
	const state = unlockedState();
	const account = state.accounts.get(id);
	if (!account) throw new Error('Vault account not found');
	return callback({ ...account.credentials });
}
