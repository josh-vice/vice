/**
 * hermes-sidecar — index.ts (entry)
 *
 * Order matters: the env shim plugin must be registered and `__viceEnv`
 * populated BEFORE any src/lib module evaluates, because several modules
 * resolve config at import time (e.g. hl/network exports `hyperliquidNetwork`).
 * The device-local vault shims (file-backed localStorage + window.isSecureContext)
 * must also be installed before the certified execution modules evaluate.
 * Dynamic import of the server guarantees that ordering.
 */
import './env-plugin';
import { installVaultShims } from './vault';

// A long-lived sidecar must never die to a stray async rejection (Bun's
// default is process exit). Certified gates still guard trading; the safety
// net exists so one transient venue error can't take the terminal down.
process.on('unhandledRejection', (reason) => {
	console.error('[hermes-sidecar] unhandled rejection (surviving):', reason);
});
process.on('uncaughtException', (error) => {
	console.error('[hermes-sidecar] uncaught exception (surviving):', error);
});

// Device-local vault storage must exist before any src/lib execution module
// evaluates (agentVault, commandIdentity, commandJournal read localStorage).
installVaultShims();

const VITE_MAP: Record<string, string> = {
	VITE_HL_NETWORK: 'VICE_HL_NETWORK',
	VITE_HL_TESTNET: 'VICE_HL_TESTNET',
	VITE_HL_MAINNET_ACK: 'VICE_HL_MAINNET_ACK',
	VITE_HL_TRADING_KILL_SWITCH: 'VICE_HL_TRADING_KILL_SWITCH',
	VITE_HL_BUILDER_ADDRESS: 'VICE_HL_BUILDER_ADDRESS',
	VITE_HL_ENABLE_BUILDER_REVENUE: 'VICE_HL_ENABLE_BUILDER_REVENUE',
	VITE_HL_REFERRAL_CODE: 'VICE_HL_REFERRAL_CODE',
	VITE_HL_CERTIFIED_ADVANCED_ORDERS: 'VICE_HL_CERTIFIED_ADVANCED_ORDERS',
	VITE_HL_CERTIFIED_OCO: 'VICE_HL_CERTIFIED_OCO',
	VICE_HL_ACCOUNT_ADDRESS: 'VICE_HL_ACCOUNT_ADDRESS'
};

const viceEnv: Record<string, string | undefined> = {};
for (const [viteName, envName] of Object.entries(VITE_MAP)) {
	const value = process.env[envName];
	if (value !== undefined) viceEnv[viteName] = value;
}

(globalThis as { __viceEnv?: Record<string, string | undefined> }).__viceEnv = viceEnv;

const { startServer } = await import('./server');
await startServer();
