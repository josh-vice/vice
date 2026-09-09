import type { MarketDescriptor, Order, Position, Fill, Balance } from '$lib/types';
import type { AccountRef, EventEnvelope, VenueCapabilities, VenueId } from './identity';
import type { ExecutionAck, NativeOrderIntent } from '$lib/execution/client';

export type VenueEnvironment = 'demo' | 'testnet' | 'production';

export interface VenueSessionRef {
	venue: VenueId;
	environment: VenueEnvironment;
	account: AccountRef | null;
	generation: number;
}

export interface AccountSnapshot {
	account: AccountRef;
	orders: Order[];
	positions: Position[];
	fills: Fill[];
	balances: Balance[];
	receivedAtMs: number;
}

export interface VenueAdapter {
	readonly id: VenueId;
	readonly capabilities: VenueCapabilities;
	loadMarkets(environment: VenueEnvironment, signal: AbortSignal): Promise<MarketDescriptor[]>;
	startPublic(session: VenueSessionRef, market: MarketDescriptor, emit: (event: EventEnvelope<unknown>) => void): Promise<() => Promise<void> | void>;
	readAccount(session: VenueSessionRef, signal: AbortSignal): Promise<AccountSnapshot>;
	startPrivate(session: VenueSessionRef, refresh: () => Promise<void>): Promise<() => Promise<void> | void>;
	place(session: VenueSessionRef, market: MarketDescriptor, intent: NativeOrderIntent): Promise<ExecutionAck>;
	cancel(session: VenueSessionRef, market: MarketDescriptor, orderId: string): Promise<ExecutionAck>;
	amend(session: VenueSessionRef, market: MarketDescriptor, order: Order, price: number): Promise<ExecutionAck>;
}