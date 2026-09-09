import { WebSocketTransport, SubscriptionClient, HttpTransport, InfoClient } from '@nktkas/hyperliquid';
import { hyperliquidPublicNetwork, hyperliquidTradingNetwork } from './network';
import { getSdkReconnectionDelayMs } from './reliability';

const WS_RECONNECT_OPTIONS = {
	maxRetries: Infinity,
	connectionTimeout: 10_000,
	reconnectionDelay: getSdkReconnectionDelayMs
} as const;

function websocketOptions(isTestnet: boolean) {
	return { isTestnet, reconnect: WS_RECONNECT_OPTIONS };
}

let publicTransport: WebSocketTransport | null = null;
let publicSubClient: SubscriptionClient | null = null;
// Hyperliquid L2 frames do not carry the requested nSigFigs. Keeping books on
// their own socket prevents a same-coin grouping request from being confused
// with context/trade subscriptions and is a prerequisite for any worker move.
let publicBookTransport: WebSocketTransport | null = null;
let publicBookSubClient: SubscriptionClient | null = null;
let publicInfoClient: InfoClient | null = null;
let tradingTransport: WebSocketTransport | null = null;
let tradingSubClient: SubscriptionClient | null = null;
let tradingInfoClient: InfoClient | null = null;

export function getPublicTransport(): WebSocketTransport {
	if (!publicTransport) {
		publicTransport = new WebSocketTransport(websocketOptions(hyperliquidPublicNetwork.isTestnet));
	}
	return publicTransport;
}

export function getPublicSubscriptionClient(): SubscriptionClient {
	if (!publicSubClient) {
		publicSubClient = new SubscriptionClient({ transport: getPublicTransport() });
	}
	return publicSubClient;
}

export function getPublicBookTransport(): WebSocketTransport {
	if (!publicBookTransport) {
		publicBookTransport = new WebSocketTransport(websocketOptions(hyperliquidPublicNetwork.isTestnet));
	}
	return publicBookTransport;
}

export function getPublicBookSubscriptionClient(): SubscriptionClient {
	if (!publicBookSubClient) {
		publicBookSubClient = new SubscriptionClient({ transport: getPublicBookTransport() });
	}
	return publicBookSubClient;
}

export function getPublicInfoClient(): InfoClient {
	if (!publicInfoClient) {
		publicInfoClient = new InfoClient({ transport: new HttpTransport({ isTestnet: hyperliquidPublicNetwork.isTestnet }) });
	}
	return publicInfoClient;
}

export function getTradingTransport(): WebSocketTransport {
	if (!tradingTransport) {
		tradingTransport = new WebSocketTransport(websocketOptions(hyperliquidTradingNetwork.isTestnet));
	}
	return tradingTransport;
}

export function getTradingSubscriptionClient(): SubscriptionClient {
	if (!tradingSubClient) {
		tradingSubClient = new SubscriptionClient({ transport: getTradingTransport() });
	}
	return tradingSubClient;
}

export function getTradingInfoClient(): InfoClient {
	if (!tradingInfoClient) {
		tradingInfoClient = new InfoClient({ transport: new HttpTransport({ isTestnet: hyperliquidTradingNetwork.isTestnet }) });
	}
	return tradingInfoClient;
}

export async function closeHlClients(): Promise<void> {
	const transports = [publicTransport, publicBookTransport, tradingTransport]
		.filter((candidate): candidate is WebSocketTransport => candidate !== null);
	await Promise.allSettled(transports.map((candidate) => candidate.close?.()));
	publicTransport = null;
	publicSubClient = null;
	publicBookTransport = null;
	publicBookSubClient = null;
	publicInfoClient = null;
	tradingTransport = null;
	tradingSubClient = null;
	tradingInfoClient = null;
}
