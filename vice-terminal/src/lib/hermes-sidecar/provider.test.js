/**
 * hermes-sidecar — provider.test.js
 *
 * Unit gate for the device-local EIP-1193 provider shim. Verifies the methods
 * the certified boundary asks of a wallet (eth_accounts, personal_sign,
 * eth_signTypedData_v4, eth_chainId) and the challenge sign/verify
 * proof-of-possession flow, WITHOUT touching the network. A throwaway key is
 * written into an isolated temp HOME as the evidence wallet.
 */
import { describe, test, expect, beforeAll } from 'bun:test';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { verifyMessage } from 'viem';
import './env-plugin';

const baseEnv = {
	VITE_HL_NETWORK: 'testnet',
	VITE_HL_TRADING_KILL_SWITCH: 'false'
};
const home = mkdtempSync(join(tmpdir(), 'vice-provider-test-'));
process.env.HOME = home;
globalThis.__viceEnv = { ...baseEnv };

const { createLocalProvider, signAndVerifyChallenge, ProviderUnavailableError } = await import('./provider');

const rawKey = generatePrivateKey();
const key = privateKeyToAccount(rawKey);

beforeAll(() => {
	// Seed the device-local evidence wallet with a throwaway key (temp HOME).
	mkdirSync(join(home, '.vice-testnet'), { recursive: true, mode: 0o700 });
	writeFileSync(
		join(home, '.vice-testnet', 'owner.json'),
		JSON.stringify({ address: key.address, privateKey: rawKey }, null, 2),
		{ mode: 0o600 }
	);
});

describe('hermes-sidecar local provider', () => {
	test('eth_accounts returns the main address', async () => {
		const provider = createLocalProvider(key, key.address);
		const accounts = await provider.request({ method: 'eth_accounts' });
		expect(accounts).toEqual([key.address]);
	});

	test('personal_sign signs and viem verifies', async () => {
		const provider = createLocalProvider(key, key.address);
		const message = 'Vice Terminal local agent encryption key\n\nAccount: test';
		const signature = await provider.request({ method: 'personal_sign', params: [message, key.address] });
		const valid = await verifyMessage({ address: key.address, message, signature });
		expect(valid).toBe(true);
	});

	test('eth_signTypedData_v4 signs an EIP-712 approveAgent-style payload', async () => {
		const provider = createLocalProvider(key, key.address);
		const typed = {
			domain: { name: 'HyperliquidSignTransaction', version: '1', chainId: 1, verifyingContract: '0x0000000000000000000000000000000000000000' },
			types: {
				EIP712Domain: [
					{ name: 'name', type: 'string' },
					{ name: 'version', type: 'string' },
					{ name: 'chainId', type: 'uint256' },
					{ name: 'verifyingContract', type: 'address' }
				],
				'HyperliquidTransaction:ApproveAgent': [
					{ name: 'hyperliquidChain', type: 'string' },
					{ name: 'agentAddress', type: 'address' },
					{ name: 'agentName', type: 'string' },
					{ name: 'nonce', type: 'uint64' }
				]
			},
			primaryType: 'HyperliquidTransaction:ApproveAgent',
			message: {
				hyperliquidChain: 'Testnet',
				agentAddress: key.address,
				agentName: 'Vice Terminal',
				nonce: 1785800000000
			}
		};
		const signature = await provider.request({
			method: 'eth_signTypedData_v4',
			params: [key.address, JSON.stringify(typed)]
		});
		expect(signature).toMatch(/^0x[a-f0-9]{130}$/);
	});

	test('eth_chainId returns a hex chain id', async () => {
		const provider = createLocalProvider(key, key.address);
		const chainId = await provider.request({ method: 'eth_chainId' });
		expect(typeof chainId).toBe('string');
		expect(chainId.startsWith('0x')).toBe(true);
	});

	test('unsupported provider methods fail closed', async () => {
		const provider = createLocalProvider(key, key.address);
		await expect(provider.request({ method: 'eth_sendTransaction' })).rejects.toThrow(/not supported/);
	});
});

describe('hermes-sidecar challenge proof-of-possession', () => {
	test('rejects a too-short challenge', async () => {
		await expect(signAndVerifyChallenge('short', key.address)).rejects.toThrow(/challenge/);
	});

	test('rejects an invalid address', async () => {
		await expect(signAndVerifyChallenge('x'.repeat(32), 'nope')).rejects.toThrow(/invalid/);
	});

	test('rejects a mismatch between device key and requested account', async () => {
		const other = privateKeyToAccount(generatePrivateKey());
		await expect(signAndVerifyChallenge('x'.repeat(32), other.address)).rejects.toThrow(/does not match/);
	});

	test('signs a challenge the device key recovers, returning the main key + address', async () => {
		const challenge = 'one-time-unlock-challenge-0123456789abcdef';
		const result = await signAndVerifyChallenge(challenge, key.address);
		expect(result.mainAddress).toBe(key.address);
		expect(result.mainKey.address).toBe(key.address);
		const valid = await verifyMessage({ address: key.address, message: challenge, signature: result.signature });
		expect(valid).toBe(true);
	});

	test('ProviderUnavailableError is exported for fail-closed callers', () => {
		expect(typeof ProviderUnavailableError).toBe('function');
	});
});
