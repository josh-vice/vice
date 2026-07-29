import {
	saveBlofinCredentials,
	unlockBlofinCredentials,
	type BlofinCredentials,
	type BlofinEnvironment,
	type BlofinPermission
} from './vault';
import { fetchBlofinPrivateSnapshot } from './private';

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export type BlofinCredentialForm = {
	environment: BlofinEnvironment;
	apiKey: string;
	secretKey: string;
	passphrase: string;
	unlockPhrase: string;
	readPermission: boolean;
	tradePermission: boolean;
};

export type BlofinCredentialSetupResult =
	| { ok: true; keyFingerprint: string; permissions: BlofinPermission[] }
	| { ok: false; error: string };

export type BlofinPrivateVerificationForm = {
	environment: BlofinEnvironment;
	keyFingerprint: string;
	unlockPhrase: string;
};

export type BlofinPrivateVerificationResult =
	| { ok: true; verifiedAt: number; balanceCount: number; positionCount: number; openOrderCount: number }
	| { ok: false; error: string };

function clean(value: string): string {
	return value.trim();
}

/**
 * Convert the explicit local setup form into the vault contract. This is a
 * declaration of the key's venue scopes, not proof that the venue granted
 * them; private-read and funded-demo verification remain separate gates.
 */
export function credentialsFromBlofinForm(form: BlofinCredentialForm): BlofinCredentials {
	if (!form.readPermission) throw new Error('BloFin READ permission is required for account verification');
	const permissions: BlofinPermission[] = ['READ'];
	if (form.tradePermission) permissions.push('TRADE');
	return {
		apiKey: clean(form.apiKey),
		secretKey: clean(form.secretKey),
		passphrase: clean(form.passphrase),
		permissions
	};
}

/** Store credentials locally and return only the non-secret fingerprint. */
export async function submitBlofinCredentialForm(
	form: BlofinCredentialForm,
	storage?: StorageLike
): Promise<BlofinCredentialSetupResult> {
	try {
		const credentials = credentialsFromBlofinForm(form);
		const { keyFingerprint } = await saveBlofinCredentials(form.environment, credentials, form.unlockPhrase, storage);
		return { ok: true, keyFingerprint, permissions: credentials.permissions };
	} catch (error) {
		return { ok: false, error: error instanceof Error ? error.message : 'BloFin credentials could not be saved' };
	}
}

/**
 * Explicit, browser-direct verification of one locally encrypted key. The
 * decrypted credential and full account snapshot stay in this call only; its
 * result intentionally exposes counts rather than private account values.
 */
export async function verifyBlofinPrivateCredentials(
	form: BlofinPrivateVerificationForm,
	storage?: StorageLike,
	options: { fetcher?: typeof fetch; now?: number; nonceFactory?: () => string } = {}
): Promise<BlofinPrivateVerificationResult> {
	try {
		const credentials = await unlockBlofinCredentials(form.environment, form.keyFingerprint, form.unlockPhrase, storage);
		if (!credentials.permissions.includes('READ')) throw new Error('BloFin credentials are missing READ permission');
		const snapshot = await fetchBlofinPrivateSnapshot(credentials, form.environment, { ...options, keyFingerprint: form.keyFingerprint });
		return {
			ok: true,
			verifiedAt: snapshot.fetchedAt,
			balanceCount: snapshot.balances.length,
			positionCount: snapshot.positions.length,
			openOrderCount: snapshot.openOrders.length
		};
	} catch {
		return { ok: false, error: 'BloFin private verification failed. Check the selected device key, unlock phrase, venue permissions, and network.' };
	}
}
