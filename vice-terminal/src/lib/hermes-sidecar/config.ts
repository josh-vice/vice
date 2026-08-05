/**
 * hermes-sidecar — config.ts
 *
 * Single source of truth for sidecar configuration. Reads from the env shim
 * (`globalThis.__viceEnv`, set by index.ts) and process.env. Fail-closed:
 * the default network is testnet, mainnet requires an explicit ACK, and a
 * missing auth token refuses to bind.
 */
import { resolveHyperliquidNetwork } from '../hl/networkPolicy';

export const SIDECAR_VERSION = '0.2.0';

type ViceEnv = Record<string, string | undefined>;

function env(): ViceEnv {
	return (globalThis as { __viceEnv?: ViceEnv }).__viceEnv ?? {};
}

export interface SidecarConfig {
	version: string;
	port: number;
	token: string;
	network: 'testnet' | 'mainnet';
	isTestnet: boolean;
	account: string | null;
	killSwitch: boolean;
	builderAddress: string | null;
	builderEnabled: boolean;
	advancedOrdersCertified: boolean;
}

export function loadConfig(): SidecarConfig {
	const e = env();
	const token = process.env.VICE_SIDECAR_TOKEN ?? '';
	if (!token) {
		throw new Error(
			'VICE_SIDECAR_TOKEN is required — the Hermes plugin_api shim always provides one. Refusing to bind without auth.'
		);
	}

	const resolved = resolveHyperliquidNetwork({
		network: e.VITE_HL_NETWORK,
		legacyTestnet: e.VITE_HL_TESTNET,
		mainnetAck: e.VITE_HL_MAINNET_ACK
	});

	const account = resolveAccount(resolved.network, e);

	return {
		version: SIDECAR_VERSION,
		port: Number(process.env.VICE_SIDECAR_PORT ?? '8787'),
		token,
		network: resolved.network,
		isTestnet: resolved.isTestnet,
		account,
		killSwitch: e.VITE_HL_TRADING_KILL_SWITCH === 'true',
		builderAddress: e.VITE_HL_BUILDER_ADDRESS?.trim() || null,
		builderEnabled: e.VITE_HL_ENABLE_BUILDER_REVENUE === 'true',
		advancedOrdersCertified: e.VITE_HL_CERTIFIED_ADVANCED_ORDERS === 'true'
	};
}

function resolveAccount(network: string, e: ViceEnv): string | null {
	const explicit = e.VICE_HL_ACCOUNT_ADDRESS?.trim();
	if (explicit) return explicit;
	// Dev convenience: on TESTNET only, read the ADDRESS (never the key) from
	// the funded evidence wallet so the read-only dashboard has an account to
	// show. Production always passes VICE_HL_ACCOUNT_ADDRESS explicitly.
	if (network === 'testnet') {
		try {
			const home = process.env.HOME ?? process.env.USERPROFILE;
			if (!home) return null;
			const owner = JSON.parse(
				require('node:fs').readFileSync(`${home}/.vice-testnet/owner.json`, 'utf8')
			);
			if (typeof owner?.address === 'string' && owner.address.startsWith('0x')) {
				return owner.address;
			}
		} catch {
			/* no local evidence wallet — account stays null */
		}
	}
	return null;
}
