import { describe, expect, test } from 'bun:test';

const source = await Bun.file(new URL('./BlofinCredentialSetup.svelte', import.meta.url)).text();

describe('BloFin local credential rotation surface', () => {
	test('lists non-secret fingerprints and makes local removal distinct from venue revocation', () => {
		for (const token of [
			'listBlofinCredentialFingerprints',
			'removeBlofinCredentials',
			'Stored on this device',
			'Remove local ciphertext',
			'This does not revoke the key at BloFin',
			'Only key fingerprints are listed'
		]) expect(source).toContain(token);
	});
});
