import { resolveHyperliquidNetwork, resolveHyperliquidPublicNetwork } from './networkPolicy';

/** Read-only market data network. Defaults to mainnet for realistic live feeds. */
export const hyperliquidPublicNetwork = resolveHyperliquidPublicNetwork({
	network: import.meta.env.VITE_HL_PUBLIC_NETWORK
});

/** Account, execution, and private-state network. Defaults to the guarded testnet. */
export const hyperliquidTradingNetwork = resolveHyperliquidNetwork({
	network: import.meta.env.VITE_HL_TRADING_NETWORK ?? import.meta.env.VITE_HL_NETWORK,
	legacyTestnet: import.meta.env.VITE_HL_TESTNET,
	mainnetAck: import.meta.env.VITE_HL_MAINNET_ACK
});

/** Legacy alias retained for execution/account modules during the split. */
export const hyperliquidNetwork = hyperliquidTradingNetwork;
