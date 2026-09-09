import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { hyperliquidPublicNetwork, hyperliquidTradingNetwork } from '$lib/hl/network';

export const GET: RequestHandler = async () => json({
	tradingMode: 'local-encrypted-agent',
	serverSigning: false,
	custody: 'browser-only-encrypted-agent',
	testnet: hyperliquidTradingNetwork.isTestnet,
	network: hyperliquidTradingNetwork.network,
	publicNetwork: hyperliquidPublicNetwork.network
});
