/**
 * hermes-sidecar — provider.ts
 *
 * Device-local EIP-1193 provider shim. The certified execution boundary
 * (`localExecution.initialize`) expects a wallet provider that answers
 * `eth_accounts`, `personal_sign`, `eth_signTypedData_v4`, and `eth_chainId`
 * (via viem's JSON-RPC account transport). In the browser that is MetaMask;
 * in the sidecar it is this shim, backed by the DEVICE-LOCAL main key
 * (testnet evidence wallet at ~/.vice-testnet/owner.json, mode 600).
 *
 * Security contract (plan §2.3):
 *   - The main key is read into this process only; it is never returned by
 *     any route, never logged, never serialized to the renderer.
 *   - The agent vault record (PBKDF2 210k) is the ONLY credential store; the
 *     renderer receives public addresses only.
 *   - Mainnet fails closed: without an explicit device-local main key the
 *     unlock route refuses to sign (the desktop plugin has no external wallet
 *     until the G2 mainnet gate).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { isAddress, verifyMessage, type Address, type EIP1193Provider, type Hex } from 'viem';
import { privateKeyToAccount, type PrivateKeyAccount } from 'viem/accounts';
import { hyperliquidNetwork } from '$lib/hl/network';

/** Resolve HOME at call time so tests can isolate with a temp HOME. */
function evidenceWalletFile(): string {
	const home = process.env.HOME ?? process.env.USERPROFILE ?? homedir();
	return join(home, '.vice-testnet', 'owner.json');
}

export class ProviderUnavailableError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ProviderUnavailableError';
	}
}

/**
 * Load the device-local main account. TESTNET ONLY by design: the desktop
 * plugin has no external wallet, so the only main key that exists on this
 * device is the funded testnet evidence wallet. Mainnet unlock fails closed
 * until a real wallet integration passes the G2 gate.
 */
export function loadDeviceLocalMainKey(): PrivateKeyAccount {
	if (!hyperliquidNetwork.isTestnet) {
		throw new ProviderUnavailableError(
			'Mainnet unlock requires a connected wallet; the sidecar holds no mainnet key material (G2 gate).'
		);
	}
	let record: { privateKey?: string };
	try {
		record = JSON.parse(readFileSync(evidenceWalletFile(), 'utf8')) as { privateKey?: string };
	} catch (error) {
		throw new ProviderUnavailableError(
			`Testnet evidence wallet is unavailable (${evidenceWalletFile()}): ${error instanceof Error ? error.message : String(error)}`
		);
	}
	if (typeof record.privateKey !== 'string' || !record.privateKey.startsWith('0x')) {
		throw new ProviderUnavailableError('Testnet evidence wallet has no readable private key.');
	}
	return privateKeyToAccount(record.privateKey as Hex);
}

/** EIP-712 chain id the evidence harness used (proven on testnet). */
function chainIdForNetwork(): Hex {
	return hyperliquidNetwork.isTestnet ? '0x1' : '0x1';
}

/**
 * Build an EIP-1193 provider that signs with `mainKey` locally. It answers
 * exactly the methods the certified boundary asks of a wallet; anything else
 * fails closed.
 */
export function createLocalProvider(mainKey: PrivateKeyAccount, mainAddress: Address): EIP1193Provider {
	return {
		request: async ({ method, params }: { method: string; params?: unknown[] }) => {
			switch (method) {
				case 'eth_accounts':
					return [mainAddress];
				case 'eth_chainId':
					return chainIdForNetwork();
				case 'personal_sign': {
					const [message] = params as [Hex];
					return mainKey.signMessage({ message });
				}
				case 'eth_signTypedData_v4':
				case 'eth_signTypedData': {
					const [, data] = params as [Address, string];
					return mainKey.signTypedData(JSON.parse(data) as Parameters<PrivateKeyAccount['signTypedData']>[0]);
				}
				default:
					throw new Error(`[hermes-sidecar] provider method not supported: ${method}`);
			}
		},
		on: () => () => undefined
	} as unknown as EIP1193Provider;
}

/**
 * Sign a one-time unlock challenge with the device-local main key and verify
 * that the recovered address matches the expected account. This is the
 * EIP-1193 proof-of-possession step: plugin_api mints the challenge, the
 * sidecar signs it, and the recovered signer must equal the account the
 * dashboard is showing.
 */
export async function signAndVerifyChallenge(
	challenge: string,
	expectedAddress: string
): Promise<{ mainKey: PrivateKeyAccount; mainAddress: Address; signature: Hex }> {
	if (!challenge || challenge.length < 16) {
		throw new ProviderUnavailableError('Unlock challenge is missing or too short.');
	}
	if (!isAddress(expectedAddress)) {
		throw new ProviderUnavailableError('Unlock address is invalid.');
	}
	const mainKey = loadDeviceLocalMainKey();
	const mainAddress = mainKey.address;
	if (mainAddress.toLowerCase() !== expectedAddress.toLowerCase()) {
		throw new ProviderUnavailableError(
			`Device-local key account ${mainAddress} does not match requested unlock account ${expectedAddress}.`
		);
	}
	const signature = await mainKey.signMessage({ message: challenge });
	const verified = await verifyMessage({ address: mainAddress, message: challenge, signature });
	if (!verified) {
		throw new ProviderUnavailableError('Unlock challenge signature verification failed.');
	}
	return { mainKey, mainAddress, signature };
}
