export type HyperliquidNetwork = 'testnet' | 'mainnet';

export const MAINNET_ACK = 'I_ACCEPT_REAL_MAINNET_TRADING';

export function resolveHyperliquidNetwork(input: {
	network?: string;
	legacyTestnet?: string;
	mainnetAck?: string;
}): { network: HyperliquidNetwork; isTestnet: boolean } {
	const requested = input.network?.trim().toLowerCase();
	const network = requested
		? requested
		: input.legacyTestnet === 'false'
			? 'mainnet'
			: 'testnet';
	if (network !== 'testnet' && network !== 'mainnet') throw new Error(`Invalid Hyperliquid network: ${network}`);
	if (network === 'mainnet' && input.mainnetAck !== MAINNET_ACK) {
		throw new Error(`Mainnet is locked. Set VITE_HL_MAINNET_ACK=${MAINNET_ACK} only after testnet release gates pass.`);
	}
	return { network, isTestnet: network === 'testnet' };
}
