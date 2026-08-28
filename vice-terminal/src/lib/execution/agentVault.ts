import { ExchangeClient, HttpTransport, InfoClient } from '@nktkas/hyperliquid';
import type { AbstractWallet } from '@nktkas/hyperliquid/signing';
import { createWalletClient, custom, isAddress, type Address, type EIP1193Provider, type Hex } from 'viem';
import { generatePrivateKey, privateKeyToAccount, type PrivateKeyAccount } from 'viem/accounts';
import { hyperliquidNetwork } from '$lib/hl/network';
import {
	ENABLEMENT_STEP_DETAIL,
	noopEnablementReporter,
	type EnablementReporter
} from './enablement';

const VERSION = 1;
const AGENT_NAME = 'Vice Terminal';
const PBKDF2_ITERATIONS = 210_000;

interface AgentRecord {
	version: 1;
	mainAddress: Address;
	agentAddress: Address;
	ciphertext: string;
	iv: string;
	salt: string;
}

export interface AgentSession {
	mainAddress: Address;
	agent: PrivateKeyAccount;
}

function isTestnet(): boolean {
	return hyperliquidNetwork.isTestnet;
}

function storageKey(mainAddress: Address): string {
	return `vice.hl.agent.v${VERSION}:${isTestnet() ? 'testnet' : 'mainnet'}:${mainAddress.toLowerCase()}`;
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

function challenge(mainAddress: Address): string {
	return [
		'Vice Terminal local agent encryption key',
		'',
		`Account: ${mainAddress.toLowerCase()}`,
		`Network: ${isTestnet() ? 'Hyperliquid Testnet' : 'Hyperliquid Mainnet'}`,
		`Version: ${VERSION}`,
		'',
		'This signature only unlocks an encrypted key stored on this device. It does not place an order.'
	].join('\n');
}

async function requestUnlockSignature(provider: EIP1193Provider, mainAddress: Address): Promise<Hex> {
	return (await provider.request({
		method: 'personal_sign',
		params: [challenge(mainAddress), mainAddress] as never
	})) as Hex;
}

async function deriveEncryptionKey(signature: Hex, salt: Uint8Array): Promise<CryptoKey> {
	const material = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(signature.toLowerCase()),
		'PBKDF2',
		false,
		['deriveKey']
	);
	return crypto.subtle.deriveKey(
		{ name: 'PBKDF2', hash: 'SHA-256', salt: salt as unknown as BufferSource, iterations: PBKDF2_ITERATIONS },
		material,
		{ name: 'AES-GCM', length: 256 },
		false,
		['encrypt', 'decrypt']
	);
}

async function encryptPrivateKey(privateKey: Hex, signature: Hex): Promise<Pick<AgentRecord, 'ciphertext' | 'iv' | 'salt'>> {
	const salt = crypto.getRandomValues(new Uint8Array(16));
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const key = await deriveEncryptionKey(signature, salt);
	const ciphertext = await crypto.subtle.encrypt(
		{ name: 'AES-GCM', iv },
		key,
		new TextEncoder().encode(privateKey)
	);
	return {
		ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
		iv: bytesToBase64(iv),
		salt: bytesToBase64(salt)
	};
}

async function decryptPrivateKey(record: AgentRecord, signature: Hex): Promise<Hex> {
	const key = await deriveEncryptionKey(signature, base64ToBytes(record.salt));
	const plaintext = await crypto.subtle.decrypt(
		{ name: 'AES-GCM', iv: base64ToBytes(record.iv) as unknown as BufferSource },
		key,
		base64ToBytes(record.ciphertext) as unknown as BufferSource
	);
	return new TextDecoder().decode(plaintext) as Hex;
}

function readRecord(mainAddress: Address): AgentRecord | null {
	try {
		const parsed = JSON.parse(localStorage.getItem(storageKey(mainAddress)) ?? 'null') as AgentRecord | null;
		return parsed?.version === VERSION && parsed.mainAddress.toLowerCase() === mainAddress.toLowerCase()
			? parsed
			: null;
	} catch {
		return null;
	}
}

function writeRecord(record: AgentRecord): void {
	localStorage.setItem(storageKey(record.mainAddress), JSON.stringify(record));
}

function mainWallet(provider: EIP1193Provider, mainAddress: Address): AbstractWallet {
	return createWalletClient({ account: mainAddress, transport: custom(provider) }) as unknown as AbstractWallet;
}

function ownerExchange(provider: EIP1193Provider, mainAddress: Address): ExchangeClient {
	return new ExchangeClient({
		transport: new HttpTransport({ isTestnet: isTestnet() }),
		wallet: mainWallet(provider, mainAddress)
	});
}


export function assertConnectedAccount(accounts: string[], expected: string): void {
	if (!accounts.some((account) => account.toLowerCase() === expected.toLowerCase())) {
		throw new Error('The connected wallet account changed; secure trading remains locked.');
	}
}

/** Re-read the provider immediately before a master-wallet mutation. */
export async function assertProviderAccount(
	provider: EIP1193Provider,
	expected: string,
	onPhase?: EnablementReporter
): Promise<void> {
	if (onPhase)
		onPhase({
			kind: 'step',
			step: 'verifying-wallet',
			detail: ENABLEMENT_STEP_DETAIL['verifying-wallet']
		});
	const accounts = (await provider.request({ method: 'eth_accounts' })) as string[];
	assertConnectedAccount(accounts, expected);
}

export async function unlockOrCreateAgent(
	provider: EIP1193Provider,
	address: string,
	onPhase?: EnablementReporter
): Promise<AgentSession> {
	const report = onPhase ?? noopEnablementReporter;
	if (!isAddress(address)) throw new Error('Connected wallet returned an invalid address');
	if (!window.isSecureContext) throw new Error('Secure local agent storage requires HTTPS or localhost');

	const mainAddress = address as Address;
	await assertProviderAccount(provider, mainAddress, report);
	report({
		kind: 'step',
		step: 'checking-authority',
		detail: ENABLEMENT_STEP_DETAIL['checking-authority']
	});
	const signature = await requestUnlockSignature(provider, mainAddress);
	report({
		kind: 'step',
		step: 'approval-submitted',
		detail: ENABLEMENT_STEP_DETAIL['approval-submitted']
	});
	let record = readRecord(mainAddress);
	let agent: PrivateKeyAccount;

	if (record) {
		const privateKey = await decryptPrivateKey(record, signature);
		agent = privateKeyToAccount(privateKey);
		if (agent.address.toLowerCase() !== record.agentAddress.toLowerCase()) {
			throw new Error('Encrypted agent identity check failed');
		}
	} else {
		const privateKey = generatePrivateKey();
		agent = privateKeyToAccount(privateKey);
		const encrypted = await encryptPrivateKey(privateKey, signature);
		record = {
			version: VERSION,
			mainAddress,
			agentAddress: agent.address,
			...encrypted
		};

		await assertProviderAccount(provider, mainAddress);
		await ownerExchange(provider, mainAddress).approveAgent({ agentAddress: agent.address, agentName: AGENT_NAME });
		writeRecord(record);
	}
	return { mainAddress, agent };
}
