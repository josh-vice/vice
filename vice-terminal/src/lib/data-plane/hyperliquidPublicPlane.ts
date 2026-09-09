import type { HyperliquidNetwork } from '$lib/hl/networkPolicy';
import { isPublicPlaneEvent, type PublicPlaneEvent, type PublicPlaneRequest } from './protocol';

type PlanePort = {
	postMessage(message: PublicPlaneRequest): void;
	onmessage: ((event: MessageEvent<unknown>) => void) | null;
	start?: () => void;
	close?: () => void;
};

export type PublicPlaneSession = { setTrades(coin?: string): void; setCandle(coin?: string, interval?: string): void; stop(): void };

/** Start one origin-wide worker when supported, with a dedicated-worker fallback. */
export function startHyperliquidPublicPlane(
	network: HyperliquidNetwork,
	onEvent: (event: PublicPlaneEvent) => void
): PublicPlaneSession {
	if (typeof Worker === 'undefined') throw new Error('Browser workers are unavailable');
	let dedicated: Worker | null = null;
	let port: PlanePort;
	if (typeof SharedWorker !== 'undefined') {
		const shared = new SharedWorker(new URL('./hyperliquid-public.worker.ts', import.meta.url), { type: 'module', name: 'vice-hl-public' });
		port = shared.port;
	} else {
		dedicated = new Worker(new URL('./hyperliquid-public.worker.ts', import.meta.url), { type: 'module', name: 'vice-hl-public' });
		port = dedicated;
	}
	port.onmessage = (event) => {
		if (isPublicPlaneEvent(event.data) && event.data.network === network) onEvent(event.data);
	};
	port.start?.();
	port.postMessage({ type: 'connect', network });
	return {
		setTrades(coin?: string) {
			port.postMessage(coin ? { type: 'setTrades', coin } : { type: 'setTrades' });
		},
		setCandle(coin?: string, interval?: string) {
			port.postMessage(coin && interval ? { type: 'setCandle', coin, interval } : { type: 'setCandle' });
		},
		stop() {
			port.postMessage({ type: 'disconnect' });
			port.onmessage = null;
			port.close?.();
			dedicated?.terminate();
		}
	};
}
