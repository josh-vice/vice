import { describe, expect, test } from 'bun:test';

const navbar = await Bun.file(new URL('./Navbar.svelte', import.meta.url)).text();
const stores = await Bun.file(new URL('../stores.ts', import.meta.url)).text();

describe('major EVM wallet connection surface', () => {
	test('supports EIP-6963 discovery, legacy providers, and serialized selection', () => {
		expect(stores).toContain('discoverWalletProviders');
		expect(stores).toContain('requestWalletAccounts');
		expect(stores).toContain('walletConnectInFlight');
		expect(stores).toContain('walletConnectGeneration');
		expect(navbar).toContain('Choose EVM wallet');
		expect(navbar).toContain('EIP-6963 wallets are supported');
	});

	test('shows actionable wallet errors instead of silently returning', () => {
		expect(stores).toContain('No EVM wallet found');
		expect(navbar).toContain('role="alert"');
		expect(navbar).toContain('walletError');
	});
});
