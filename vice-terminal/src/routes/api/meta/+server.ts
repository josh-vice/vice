import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { hyperliquidPublicNetwork, hyperliquidTradingNetwork } from '$lib/hl/network';

/**
 * Diagnostics-safe build/version metadata.
 *
 * Deliberately exposes only non-sensitive identity: app name, semantic version,
 * and the live network. It never returns the vault path, key material, agent
 * addresses, signer details, or any environment variable VALUE. Client/browser
 * diagnostics and the runtime verifier read this to confirm which build they
 * are talking to without leaking internals.
 */
export const GET: RequestHandler = async () =>
	json({
		name: 'Vice Terminal',
		version: '1.0.0',
		testnet: hyperliquidTradingNetwork.isTestnet,
		network: hyperliquidTradingNetwork.network,
		publicNetwork: hyperliquidPublicNetwork.network,
		publicTestnet: hyperliquidPublicNetwork.isTestnet,
		tradingNetwork: hyperliquidTradingNetwork.network
	});
