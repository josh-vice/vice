import { afterAll, describe, expect, test } from 'bun:test';
import { discoverWalletProviders, requestWalletAccounts } from './walletProviders.ts';

const originalWindow = globalThis.window;
const listeners = new Map();
const legacy = { request: async ({ method }) => method === 'eth_requestAccounts' ? ['0x0000000000000000000000000000000000000001'] : [] , isMetaMask: true };
const announced = { request: async ({ method }) => method === 'eth_requestAccounts' ? ['0x0000000000000000000000000000000000000002'] : [] };

globalThis.window = {
	ethereum: { providers: [legacy], isMetaMask: true },
	addEventListener(type, listener) {
		const current = listeners.get(type) ?? [];
		current.push(listener);
		listeners.set(type, current);
	},
	removeEventListener(type, listener) {
		listeners.set(type, (listeners.get(type) ?? []).filter((candidate) => candidate !== listener));
	},
	dispatchEvent(event) {
		if (event.type === 'eip6963:requestProvider') {
			for (const listener of listeners.get('eip6963:announceProvider') ?? []) listener(new CustomEvent('eip6963:announceProvider', { detail: { provider: announced, info: { name: 'Rabby', rdns: 'io.rabby' } } }));
		}
		return true;
	}
};

afterAll(() => { globalThis.window = originalWindow; });

describe('EVM wallet provider discovery', () => {
	test('discovers EIP-6963 wallets and legacy injected providers without duplication', async () => {
		const wallets = await discoverWalletProviders(0);
		expect(wallets.map((wallet) => wallet.name)).toEqual(['Rabby', 'MetaMask']);
		expect(new Set(wallets.map((wallet) => wallet.provider)).size).toBe(2);
	});

	test('requests accounts through the selected EIP-1193 provider', async () => {
		expect(await requestWalletAccounts(announced)).toEqual(['0x0000000000000000000000000000000000000002']);
	});
});

	test('rejects malformed account values before account activation', async () => {
		const malformed = { request: async () => ['not-an-address'] };
		await expect(requestWalletAccounts(malformed)).rejects.toThrow('invalid EVM account list');
	});