import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { hyperliquidNetwork } from '$lib/hl/network';

export const GET: RequestHandler = async () => json({
	tradingMode: 'local-encrypted-agent',
	serverSigning: false,
	custody: 'browser-only-encrypted-agent',
	testnet: hyperliquidNetwork.isTestnet,
	network: hyperliquidNetwork.network
});
