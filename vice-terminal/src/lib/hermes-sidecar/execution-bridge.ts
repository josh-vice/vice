/**
 * hermes-sidecar — execution-bridge.ts
 *
 * Thin singleton adapter between HTTP transport and the certified
 * LocalExecutionClient. The sidecar never reimplements order signing,
 * cloid generation, journal writes, or venue dispatch — it holds a
 * reference to the certified client (or null/locked) and forwards.
 *
 * Injectability is deliberate: unit tests install a mock client so
 * happy-path route coverage never hits the network. Production boot
 * leaves the default (the real localExecution singleton) in place.
 *
 * Contract for unlock (t_11eb1513):
 *   setExecutionClient(client)  — after successful vault unlock + initialize
 *   clearExecutionClient()      — on lock / failed unlock (reverts to default)
 *   getExecutionClient()        — current client (default = localExecution)
 */
import type { EIP1193Provider } from 'viem';
import type { MarketDescriptor, Order } from '../types';
import type { ExecutionAck, NativeOrderIntent } from '../execution/client';
import { localExecution } from '../execution/localExecution';

/** Minimal surface the sidecar transport needs from the certified client. */
export interface ExecutionBridgeClient {
	isReady(): boolean;
	lock(): void;
	placeOrder(market: MarketDescriptor, intent: NativeOrderIntent): Promise<ExecutionAck>;
	cancelOrder(market: MarketDescriptor, orderId: string): Promise<ExecutionAck>;
	/** Optional: present on the real LocalExecutionClient; mocks may omit. */
	initialize?(
		provider: EIP1193Provider,
		address: `0x${string}`,
		options?: { approveBuilder?: boolean }
	): Promise<void>;
	/** Optional: present on the real LocalExecutionClient; mocks may omit. */
	modifyOrder?(market: MarketDescriptor, order: Order, newPrice: number): Promise<ExecutionAck>;
}

let override: ExecutionBridgeClient | null = null;

/** Register the initialized client after a successful unlock. Pass null to clear. */
export function setExecutionClient(client: ExecutionBridgeClient | null): void {
	override = client;
}

/** Drop any override so subsequent calls use the default localExecution. */
export function clearExecutionClient(): void {
	override = null;
}

/**
 * Active client. When no override is set, returns the certified
 * `localExecution` singleton — production path is always the real boundary.
 */
export function getExecutionClient(): ExecutionBridgeClient {
	return override ?? localExecution;
}

/** True only when the active client reports ready (vault unlocked + exchange live). */
export function isBridgeReady(): boolean {
	return getExecutionClient().isReady();
}

/** Lock the active client (clears exchange handle; vault stays on disk). */
export function bridgeLock(): void {
	getExecutionClient().lock();
}

/**
 * Place through the certified client. Throws if locked — callers map the
 * error into the sidecar's structured `{ ok:false, error }` response.
 */
export async function bridgePlaceOrder(
	market: MarketDescriptor,
	intent: NativeOrderIntent
): Promise<ExecutionAck> {
	const client = getExecutionClient();
	if (!client.isReady()) {
		throw new Error('Secure trading is locked. Unlock the agent vault first.');
	}
	return client.placeOrder(market, intent);
}

/** Cancel a single venue order through the certified client. */
export async function bridgeCancelOrder(
	market: MarketDescriptor,
	orderId: string
): Promise<ExecutionAck> {
	const client = getExecutionClient();
	if (!client.isReady()) {
		throw new Error('Secure trading is locked. Unlock the agent vault first.');
	}
	return client.cancelOrder(market, orderId);
}

/**
 * Modify a resting order's price through the certified client. The client
 * must expose modifyOrder (real LocalExecutionClient does; a mock that omits
 * it fails closed with a clear error rather than a silent no-op).
 */
export async function bridgeModifyOrder(
	market: MarketDescriptor,
	order: Order,
	newPrice: number
): Promise<ExecutionAck> {
	const client = getExecutionClient();
	if (!client.isReady()) {
		throw new Error('Secure trading is locked. Unlock the agent vault first.');
	}
	if (typeof client.modifyOrder !== 'function') {
		throw new Error('Execution client does not support modify; the active boundary is stale.');
	}
	return client.modifyOrder(market, order, newPrice);
}
