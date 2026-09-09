import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import type { CredentialInput, SavedVenueAccount } from './types';
import {
	MAX_SAVED_ACCOUNTS,
	VAULT_STORAGE_KEY,
	addAccount,
	createVault,
	deleteAccount,
	isVaultUnlocked,
	listSavedAccounts,
	lockVault,
	unlockVault,
	withUnlockedCredentials
} from './vault';

const ROOT_PASSPHRASE = 'vault-root-passphrase';
const CREDENTIALS: CredentialInput = {
	apiKey: ' api-key-123 ',
	secret: 'secret-value  ',
	passphrase: ' blofin-passphrase '
};
const ACCOUNT_METADATA = {
	venue: 'blofin' as const,
	label: ' Demo account ',
	environment: 'demo' as const,
	permissions: ['read', 'trade'] as const
};

const values = new Map<string, string>();
const storage = {
	get length() {
		return values.size;
	},
	clear() {
		values.clear();
	},
	getItem(key: string) {
		return values.get(key) ?? null;
	},
	key(index: number) {
		return [...values.keys()][index] ?? null;
	},
	removeItem(key: string) {
		values.delete(key);
	},
	setItem(key: string, value: string) {
		values.set(key, value);
	}
};

function installStorage(): void {
	(globalThis as typeof globalThis & { localStorage: Storage }).localStorage = storage as Storage;
}

async function createAccount(
	credentials: CredentialInput = CREDENTIALS,
	metadata: typeof ACCOUNT_METADATA = ACCOUNT_METADATA
): Promise<SavedVenueAccount> {
	await createVault(ROOT_PASSPHRASE);
	return addAccount(metadata, credentials);
}

beforeEach(() => {
	lockVault();
	values.clear();
	installStorage();
});

afterEach(() => {
	lockVault();
	values.clear();
});

describe('browser encrypted credential vault', () => {
	test('round-trips API key, secret, and venue passphrase through the callback boundary', async () => {
		const account = await createAccount();

		expect(account.label).toBe('Demo account');
		expect(account.permissions).toEqual(['read', 'trade']);
		expect(isVaultUnlocked()).toBe(true);
		expect(listSavedAccounts()).toEqual([account]);

		let received: CredentialInput | undefined;
		await withUnlockedCredentials(account.id, (credentials) => {
			received = { ...credentials };
		});

		expect(received).toEqual({
		apiKey: 'api-key-123',
		secret: 'secret-value  ',
		passphrase: 'blofin-passphrase'
		});
	});

	test('persists only an encrypted record and no credential plaintext', async () => {
		await createAccount();
		const persisted = storage.getItem(VAULT_STORAGE_KEY);

		expect(persisted).toBeString();
		expect(persisted).not.toContain('api-key-123');
		expect(persisted).not.toContain('secret-value');
		expect(persisted).not.toContain('blofin-passphrase');
		expect(persisted).not.toContain('Demo account');
	});

	test('wrong vault passphrase fails closed and does not leave an unlocked session', async () => {
		const account = await createAccount();
		lockVault();

		await expect(unlockVault('wrong-root-passphrase')).rejects.toThrow();
		expect(isVaultUnlocked()).toBe(false);
		expect(listSavedAccounts()).toEqual([]);
		await expect(withUnlockedCredentials(account.id, () => undefined)).rejects.toThrow();
	});

	test('uses a unique salt and IV for every encrypted write', async () => {
		await createVault(ROOT_PASSPHRASE);
		const first = JSON.parse(storage.getItem(VAULT_STORAGE_KEY) ?? 'null');
		await addAccount(ACCOUNT_METADATA, CREDENTIALS);
		const second = JSON.parse(storage.getItem(VAULT_STORAGE_KEY) ?? 'null');
		await addAccount({ ...ACCOUNT_METADATA, label: 'Second account' }, { ...CREDENTIALS, apiKey: 'second-key' });
		const third = JSON.parse(storage.getItem(VAULT_STORAGE_KEY) ?? 'null');

		expect(first.salt).not.toBe(second.salt);
		expect(first.iv).not.toBe(second.iv);
		expect(second.salt).not.toBe(third.salt);
		expect(second.iv).not.toBe(third.iv);
	});

	test('lock invalidates the in-memory key and decrypted credentials', async () => {
		const account = await createAccount();
		lockVault();

		expect(isVaultUnlocked()).toBe(false);
		await expect(withUnlockedCredentials(account.id, () => undefined)).rejects.toThrow(/locked/i);
	});

	test('rejects malformed and old-version records without unlocking', async () => {
		values.set(VAULT_STORAGE_KEY, '{not-json');
		await expect(unlockVault(ROOT_PASSPHRASE)).rejects.toThrow(/vault/i);
		expect(isVaultUnlocked()).toBe(false);

		values.set(
			VAULT_STORAGE_KEY,
			JSON.stringify({ version: 0, salt: 'AA==', iv: 'AA==', ciphertext: 'AA==' })
		);
		await expect(unlockVault(ROOT_PASSPHRASE)).rejects.toThrow(/version|vault/i);
		expect(isVaultUnlocked()).toBe(false);
	});

	test('deletes only the selected account and keeps the remaining account usable', async () => {
		await createVault(ROOT_PASSPHRASE);
		const first = await addAccount(ACCOUNT_METADATA, CREDENTIALS);
		const second = await addAccount(
			{ ...ACCOUNT_METADATA, label: 'Second account' },
			{ apiKey: 'second-key', secret: 'second-secret', passphrase: 'second-passphrase' }
		);
		const beforeDelete = storage.getItem(VAULT_STORAGE_KEY);

		await deleteAccount(first.id);

		expect(storage.getItem(VAULT_STORAGE_KEY)).not.toBe(beforeDelete);
		expect(listSavedAccounts().map(({ id }) => id)).toEqual([second.id]);
		await expect(withUnlockedCredentials(first.id, () => undefined)).rejects.toThrow();
		await expect(withUnlockedCredentials(second.id, (credentials) => credentials.apiKey)).resolves.toBe('second-key');
	});

	test('trims label, API key, and venue passphrase but preserves secret bytes', async () => {
		const account = await createAccount();
		await withUnlockedCredentials(account.id, async (credentials) => {
			expect(credentials.apiKey).toBe('api-key-123');
			expect(credentials.passphrase).toBe('blofin-passphrase');
			expect(credentials.secret).toBe('secret-value  ');
		});
	});

	test('enforces label and credential size limits', async () => {
		await createVault(ROOT_PASSPHRASE);
		await expect(
			addAccount({ ...ACCOUNT_METADATA, label: ' ' }, CREDENTIALS)
		).rejects.toThrow(/label/i);
		await expect(
			addAccount({ ...ACCOUNT_METADATA, label: 'x'.repeat(41) }, CREDENTIALS)
		).rejects.toThrow(/label/i);
		await expect(
			addAccount(ACCOUNT_METADATA, { ...CREDENTIALS, apiKey: 'x'.repeat(257) })
		).rejects.toThrow(/apiKey/i);
		await expect(
			addAccount(ACCOUNT_METADATA, { ...CREDENTIALS, secret: '' })
		).rejects.toThrow(/secret/i);
		await expect(
			addAccount(ACCOUNT_METADATA, { ...CREDENTIALS, passphrase: 'x'.repeat(257) })
		).rejects.toThrow(/passphrase/i);
	});

	test(`allows at most ${MAX_SAVED_ACCOUNTS} saved accounts`, async () => {
		await createVault(ROOT_PASSPHRASE);
		for (let index = 0; index < MAX_SAVED_ACCOUNTS; index += 1) {
			await addAccount(
				{ ...ACCOUNT_METADATA, label: `Account ${index + 1}` },
				{ ...CREDENTIALS, apiKey: `key-${index + 1}` }
			);
		}

		expect(listSavedAccounts()).toHaveLength(MAX_SAVED_ACCOUNTS);
		await expect(
			addAccount({ ...ACCOUNT_METADATA, label: 'Too many' }, { ...CREDENTIALS, apiKey: 'overflow-key' })
		).rejects.toThrow(/16|maximum|account/i);
	});

	test('does not represent a TRANSFER permission', async () => {
		await createVault(ROOT_PASSPHRASE);
		await expect(
			addAccount(
				{ ...ACCOUNT_METADATA, permissions: ['read', 'TRANSFER'] as never },
				CREDENTIALS
			)
		).rejects.toThrow(/transfer/i);

		const account = await addAccount(ACCOUNT_METADATA, CREDENTIALS);
		expect(account.permissions).not.toContain('TRANSFER' as never);
	});
});
