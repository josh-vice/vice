import { resolveHyperliquidNetwork } from './networkPolicy';

export const hyperliquidNetwork = resolveHyperliquidNetwork({
	network: import.meta.env.VITE_HL_NETWORK,
	legacyTestnet: import.meta.env.VITE_HL_TESTNET,
	mainnetAck: import.meta.env.VITE_HL_MAINNET_ACK
});
