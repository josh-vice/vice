/**
 * Device pairing and cross-device envelope contracts for the user-controlled
 * runner. This module validates FORMAT and fail-closed rules only; the actual
 * end-to-end encryption is performed by Web Crypto in the browser at runtime.
 * Nothing here ever persists, transmits, or derives credential material.
 */

export interface PairingRecord {
	/** Trimmed, non-blank device identifier chosen by the user. */
	deviceId: string;
	/** Fingerprint of the device's E2E envelope key; never the key itself. */
	keyFingerprint: string;
	pairedAtMs: number;
	lastSeenMs: number;
	/** Bumped on every revocation so old epochs fail closed. */
	epoch: number;
	revoked: boolean;
}

export interface EncryptedEnvelope {
	schema: 1;
	kind: 'vice.pairing-envelope';
	version: 1;
	deviceId: string;
	/** base64url ciphertext; never empty and never a plaintext payload. */
	ciphertext: string;
	/** base64url nonce for the envelope key. */
	iv: string;
	/** Which key fingerprint can decrypt this envelope. */
	keyFingerprint: string;
	createdAtMs: number;
	expiresAtMs: number;
}

const ENVELOPE_KIND = 'vice.pairing-envelope';
/** Top-level keys that would defeat the relay-cannot-read property. */
const FORBIDDEN_PLAINTEXT_KEYS = ['accountKey', 'secret', 'mnemonic', 'privateKey', 'strategy', 'balances'];

function isBase64Url(value: string): boolean {
	return /^[A-Za-z0-9_-]+$/.test(value);
}

export function assertPairingRecord(record: PairingRecord, field = 'pairing'): PairingRecord {
	if (!record || typeof record !== 'object') throw new Error(`${field} must be an object`);
	if (record.deviceId.trim().length === 0 || record.deviceId !== record.deviceId.trim()) {
		throw new Error(`${field} requires a trimmed non-blank deviceId`);
	}
	if (record.keyFingerprint.trim().length < 16) {
		throw new Error(`${field} requires a key fingerprint of at least 16 characters`);
	}
	if (!Number.isFinite(record.pairedAtMs) || record.pairedAtMs < 0) {
		throw new Error(`${field} requires a non-negative pairedAtMs`);
	}
	if (!Number.isFinite(record.lastSeenMs) || record.lastSeenMs < 0) {
		throw new Error(`${field} requires a non-negative lastSeenMs`);
	}
	if (!Number.isSafeInteger(record.epoch) || record.epoch < 0) {
		throw new Error(`${field} requires a non-negative integer epoch`);
	}
	if (typeof record.revoked !== 'boolean') throw new Error(`${field} requires an explicit revoked flag`);
	return record;
}

export function assertEncryptedEnvelope(envelope: EncryptedEnvelope): EncryptedEnvelope {
	if (!envelope || typeof envelope !== 'object') throw new Error('envelope must be an object');
	if (envelope.schema !== 1 || envelope.kind !== ENVELOPE_KIND || envelope.version !== 1) {
		throw new Error('envelope has an unsupported schema or kind');
	}
	if (envelope.deviceId.trim().length === 0) throw new Error('envelope requires a deviceId');
	if (!isBase64Url(envelope.ciphertext) || envelope.ciphertext.length < 16) {
		throw new Error('envelope requires a non-empty base64url ciphertext');
	}
	if (!isBase64Url(envelope.iv) || envelope.iv.length < 8) {
		throw new Error('envelope requires a base64url nonce');
	}
	if (envelope.keyFingerprint.trim().length < 16) {
		throw new Error('envelope requires a key fingerprint');
	}
	if (!Number.isFinite(envelope.createdAtMs) || !Number.isFinite(envelope.expiresAtMs)) {
		throw new Error('envelope requires finite timestamps');
	}
	if (envelope.expiresAtMs <= envelope.createdAtMs) {
		throw new Error('envelope must expire after it was created');
	}
	const secrets = FORBIDDEN_PLAINTEXT_KEYS.filter((key) => Object.prototype.hasOwnProperty.call(envelope, key));
	if (secrets.length > 0) {
		throw new Error(`envelope must not carry plaintext ${secrets.join(', ')}`);
	}
	return envelope;
}

export function pairingIsFresh(record: PairingRecord, now: number, maxPairingAgeMs: number): boolean {
	assertPairingRecord(record);
	if (record.revoked) return false;
	if (!Number.isFinite(now) || now < 0) throw new Error('runner requires a valid now');
	if (!Number.isFinite(maxPairingAgeMs) || maxPairingAgeMs <= 0) {
		throw new Error('runner requires a positive maxPairingAgeMs');
	}
	if (now - record.lastSeenMs > maxPairingAgeMs) return false;
	return now >= record.pairedAtMs;
}

export function revokePairing(record: PairingRecord, now: number): PairingRecord {
	assertPairingRecord(record);
	return { ...record, revoked: true, epoch: record.epoch + 1, lastSeenMs: now };
}

export function envelopeExpired(envelope: EncryptedEnvelope, now: number): boolean {
	assertEncryptedEnvelope(envelope);
	return now > envelope.expiresAtMs;
}
