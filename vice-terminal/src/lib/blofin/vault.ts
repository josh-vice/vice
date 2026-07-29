import { assertAccountRef, type AccountRef } from '$lib/venue/identity';

const VERSION = 1;
const ITERATIONS = 210_000;
const INDEX_PREFIX = `vice.blofin.credentials.index.v${VERSION}`;

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export type BlofinEnvironment = 'demo' | 'live';
export type BlofinPermission = 'READ' | 'TRADE';

export interface BlofinCredentials {
	apiKey: string;
	secretKey: string;
	passphrase: string;
	permissions: BlofinPermission[];
}

interface StoredRecord {
	version: 1;
	environment: BlofinEnvironment;
	keyFingerprint: string;
	ciphertext: string;
	iv: string;
	salt: string;
}

function bytesToBase64(bytes: Uint8Array): string {
	let binary = '';
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
	const binary = atob(value);
	return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function storageOrThrow(storage?: StorageLike): StorageLike {
	if (storage) return storage;
	if (typeof localStorage === 'undefined') throw new Error('Device-local credential storage is unavailable');
	return localStorage;
}

function validate(credentials: BlofinCredentials): void {
	if (credentials.apiKey.trim().length === 0 || credentials.secretKey.trim().length === 0 || credentials.passphrase.trim().length === 0) {
		throw new Error('BloFin API key, secret, and passphrase are required');
	}
	if (credentials.permissions.length === 0 || credentials.permissions.some((permission) => permission !== 'READ' && permission !== 'TRADE')) {
		throw new Error('BloFin credentials may declare only READ and TRADE permissions; TRANSFER is never accepted');
	}
}

async function deriveKey(unlockPhrase: string, salt: Uint8Array): Promise<CryptoKey> {
	if (unlockPhrase.length < 12) throw new Error('Use an unlock phrase of at least 12 characters');
	const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(unlockPhrase), 'PBKDF2', false, ['deriveKey']);
	return crypto.subtle.deriveKey(
		{ name: 'PBKDF2', hash: 'SHA-256', salt: salt as unknown as BufferSource, iterations: ITERATIONS },
		material,
		{ name: 'AES-GCM', length: 256 },
		false,
		['encrypt', 'decrypt']
	);
}

/** A short, one-way local reference; never a substitute for a venue account ID. */
export async function blofinKeyFingerprint(apiKey: string): Promise<string> {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(apiKey));
	return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('').slice(0, 24);
}

function storageKey(environment: BlofinEnvironment, keyFingerprint: string): string {
	return `vice.blofin.credentials.v${VERSION}:${environment}:${keyFingerprint}`;
}

function indexKey(environment: BlofinEnvironment): string {
	return `${INDEX_PREFIX}:${environment}`;
}

function validFingerprint(value: unknown): value is string {
	return typeof value === 'string' && /^[a-f0-9]{24}$/.test(value);
}

/** Creates an environment-scoped, non-secret account reference for local routing. */
export function blofinAccountRef(environment: BlofinEnvironment, keyFingerprint: string): AccountRef {
	if (!validFingerprint(keyFingerprint)) throw new Error('BloFin credential identity is invalid');
	return assertAccountRef({
		accountKey: `blofin:${environment}:${keyFingerprint}`,
		venue: 'blofin',
		credentialRef: keyFingerprint,
		accountMode: `futures:${environment}`
	});
}

function storedFingerprints(target: StorageLike, environment: BlofinEnvironment): string[] {
	try {
		const parsed = JSON.parse(target.getItem(indexKey(environment)) ?? '[]') as unknown;
		if (!Array.isArray(parsed)) return [];
		return [...new Set(parsed.filter(validFingerprint))].sort();
	} catch {
		return [];
	}
}

function saveFingerprints(target: StorageLike, environment: BlofinEnvironment, fingerprints: string[]): void {
	const next = [...new Set(fingerprints.filter(validFingerprint))].sort();
	if (next.length === 0) target.removeItem(indexKey(environment));
	else target.setItem(indexKey(environment), JSON.stringify(next));
}

/** Lists only non-secret key fingerprints stored by this device and environment. */
export function listBlofinCredentialFingerprints(environment: BlofinEnvironment, storage?: StorageLike): string[] {
	return storedFingerprints(storageOrThrow(storage), environment);
}

/** Stores only AES-GCM ciphertext; neither the secret nor the unlock phrase enters Vice infrastructure. */
export async function saveBlofinCredentials(
	environment: BlofinEnvironment,
	credentials: BlofinCredentials,
	unlockPhrase: string,
	storage?: StorageLike
): Promise<{ keyFingerprint: string }> {
	validate(credentials);
	const target = storageOrThrow(storage);
	const salt = crypto.getRandomValues(new Uint8Array(16));
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const key = await deriveKey(unlockPhrase, salt);
	const plaintext = JSON.stringify({ ...credentials, permissions: [...new Set(credentials.permissions)].sort() });
	const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext));
	const keyFingerprint = await blofinKeyFingerprint(credentials.apiKey);
	const record: StoredRecord = { version: VERSION, environment, keyFingerprint, ciphertext: bytesToBase64(new Uint8Array(encrypted)), iv: bytesToBase64(iv), salt: bytesToBase64(salt) };
	// The index deliberately contains only a one-way fingerprint. If indexing
	// fails, remove the new ciphertext rather than leaving an unreachable key.
	target.setItem(storageKey(environment, keyFingerprint), JSON.stringify(record));
	try {
		saveFingerprints(target, environment, [...storedFingerprints(target, environment), keyFingerprint]);
	} catch (error) {
		target.removeItem(storageKey(environment, keyFingerprint));
		throw error;
	}
	return { keyFingerprint };
}

export async function unlockBlofinCredentials(
	environment: BlofinEnvironment,
	keyFingerprint: string,
	unlockPhrase: string,
	storage?: StorageLike
): Promise<BlofinCredentials> {
	const target = storageOrThrow(storage);
	let record: StoredRecord | null = null;
	try { record = JSON.parse(target.getItem(storageKey(environment, keyFingerprint)) ?? 'null') as StoredRecord | null; } catch { /* invalid local record is not usable */ }
	if (!record || record.version !== VERSION || record.environment !== environment || record.keyFingerprint !== keyFingerprint) {
		throw new Error('BloFin credentials are not available on this device');
	}
	try {
		const key = await deriveKey(unlockPhrase, base64ToBytes(record.salt));
		const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: base64ToBytes(record.iv) as unknown as BufferSource }, key, base64ToBytes(record.ciphertext) as unknown as BufferSource);
		const credentials = JSON.parse(new TextDecoder().decode(plaintext)) as BlofinCredentials;
		validate(credentials);
		if (await blofinKeyFingerprint(credentials.apiKey) !== keyFingerprint) throw new Error('Encrypted BloFin credential identity check failed');
		return credentials;
	} catch (error) {
		throw new Error(error instanceof Error && error.message.startsWith('BloFin') ? error.message : 'BloFin credentials could not be unlocked');
	}
}

export function removeBlofinCredentials(environment: BlofinEnvironment, keyFingerprint: string, storage?: StorageLike): void {
	if (!validFingerprint(keyFingerprint)) throw new Error('BloFin credential identity is invalid');
	const target = storageOrThrow(storage);
	target.removeItem(storageKey(environment, keyFingerprint));
	saveFingerprints(target, environment, storedFingerprints(target, environment).filter((fingerprint) => fingerprint !== keyFingerprint));
}
