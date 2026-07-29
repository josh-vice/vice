import { WebSocketTransport, SubscriptionClient, HttpTransport, InfoClient } from '@nktkas/hyperliquid';
import { hyperliquidNetwork } from './network';

let transport: WebSocketTransport | null = null;
let subClient: SubscriptionClient | null = null;
// Hyperliquid L2 frames do not carry the requested nSigFigs. Keeping books on
// their own socket prevents a same-coin grouping request from being confused
// with context/trade subscriptions and is a prerequisite for any worker move.
let bookTransport: WebSocketTransport | null = null;
let bookSubClient: SubscriptionClient | null = null;
let infoClient: InfoClient | null = null;

export function getTransport(): WebSocketTransport {
	if (!transport) {
		transport = new WebSocketTransport({ isTestnet: hyperliquidNetwork.isTestnet });
	}
	return transport;
}

export function getSubscriptionClient(): SubscriptionClient {
	if (!subClient) {
		subClient = new SubscriptionClient({ transport: getTransport() });
	}
	return subClient;
}

/** A dedicated public transport for the selected L2 book subscription. */
export function getBookTransport(): WebSocketTransport {
	if (!bookTransport) {
		bookTransport = new WebSocketTransport({ isTestnet: hyperliquidNetwork.isTestnet });
	}
	return bookTransport;
}

export function getBookSubscriptionClient(): SubscriptionClient {
	if (!bookSubClient) {
		bookSubClient = new SubscriptionClient({ transport: getBookTransport() });
	}
	return bookSubClient;
}

export function getInfoClient(): InfoClient {
	if (!infoClient) {
		infoClient = new InfoClient({ transport: new HttpTransport({ isTestnet: hyperliquidNetwork.isTestnet }) });
	}
	return infoClient;
}

export async function closeHlClients(): Promise<void> {
	const transports = [transport, bookTransport].filter((candidate): candidate is WebSocketTransport => candidate !== null);
	await Promise.allSettled(transports.map((candidate) => candidate.close?.()));
	transport = null;
	subClient = null;
	bookTransport = null;
	bookSubClient = null;
	infoClient = null;
}
