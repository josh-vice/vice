import type { Balance, ChartCandle, Fill, MarketDescriptor, Order, OrderBook, OrderType, Position, RevenueSnapshot, Trade, TwapJob } from '$lib/types';
import type { AccountRef, BookGrouping, DecimalString, EventEnvelope, InstrumentId, VenueCapabilities, VenueId } from './identity';

export type VenuePublicPayload =
	| { kind: 'book'; value: OrderBook }
	| { kind: 'trades'; value: Trade[] }
	| { kind: 'candles'; value: ChartCandle[] }
	| { kind: 'context'; value: MarketDescriptor };
export type VenuePrivatePayload =
	| { kind: 'positions'; value: Position[] }
	| { kind: 'orders'; value: Order[] }
	| { kind: 'fills'; value: Fill[] }
	| { kind: 'twaps'; value: TwapJob[] }
	| { kind: 'balances'; value: Balance[] }
	| { kind: 'revenue'; value: RevenueSnapshot };
export type VenueSubscription = {
	unsubscribe(): Promise<void>;
	readonly failureSignal: AbortSignal;
};
export type VenueOrderIntent = {
	actionId: string;
	account: AccountRef;
	instrument: InstrumentId;
	side: 'buy' | 'sell';
	orderType: OrderType;
	size: DecimalString;
	price?: DecimalString;
	triggerPrice?: DecimalString;
	reduceOnly: boolean;
	clientOrderId: string;
	expiresAt: number;
};
export type VenueAccountSnapshot = {
	positions: Position[];
	orders: Order[];
	fills: Fill[];
	twaps: TwapJob[];
	balances: Balance[];
	revenue: RevenueSnapshot | null;
	capturedAt: number;
};
export type VenueMutationOutcome = {
	status: 'accepted' | 'rejected' | 'uncertain';
	venueOrderIds: string[];
	clientOrderIds: string[];
	errorCategory?: string;
};

export interface VenueAdapter {
	readonly id: VenueId;
	readonly capabilities: VenueCapabilities;
	loadCatalog(signal?: AbortSignal): Promise<InstrumentId[]>;
	subscribePublic(input: { instrument: InstrumentId; channels: readonly VenuePublicPayload['kind'][]; grouping?: BookGrouping }, sink: (event: EventEnvelope<VenuePublicPayload>) => void): Promise<VenueSubscription>;
	fetchAccount(account: AccountRef, signal?: AbortSignal): Promise<VenueAccountSnapshot>;
	subscribePrivate(account: AccountRef, sink: (event: EventEnvelope<VenuePrivatePayload>) => void): Promise<VenueSubscription>;
	place(intent: VenueOrderIntent): Promise<VenueMutationOutcome>;
	cancel(input: { actionId: string; account: AccountRef; instrument: InstrumentId; venueOrderId: string; clientOrderId?: string; expiresAt: number }): Promise<VenueMutationOutcome>;
	modify(input: { actionId: string; account: AccountRef; instrument: InstrumentId; venueOrderId: string; replacement: VenueOrderIntent }): Promise<VenueMutationOutcome>;
}

export const SUPPORTED_VENUES: readonly VenueId[] = ['hyperliquid', 'lighter', 'nado', 'blofin', 'binance'];
export function assertSupportedVenue(venue: VenueId): VenueId {
	if (!SUPPORTED_VENUES.includes(venue)) throw new Error(`Venue ${venue} is not supported by the mainnet adapter contract`);
	return venue;
}
