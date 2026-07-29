import type { InstrumentId } from '$lib/venue/identity';

export interface Market {
	marketKey?: string;
	apiCoin?: string;
	assetId?: number;
	kind?: 'corePerp' | 'hip3Perp' | 'spot' | 'outcome';
	dex?: string | null;
	szDecimals?: number;
	priceDecimals?: number;
	maxLeverage?: number;
	isDelisted?: boolean;
	symbol: string;
	name: string;
	type: 'perp' | 'option' | 'spot';
	underlying?: string;
	strike?: number;
	expiry?: string;
	optionType?: 'call' | 'put';
	lastPrice: number;
	change24h: number;
	changePercent24h: number;
	volume24h: number;
	openInterest?: number;
	fundingRate?: number;
	markPrice?: number;
	indexPrice?: number;
	iv?: number;
}

/**
 * Authoritative Hyperliquid market identity. This is deliberately not an
 * extension of the legacy fixture `Market` shape: execution-facing code must
 * receive every routing field as required data, never as optional fields that
 * can be filled from a display symbol.
 */
export interface MarketDescriptor {
	marketKey: string;
	apiCoin: string;
	assetId: number;
	kind: 'corePerp' | 'hip3Perp' | 'spot' | 'outcome';
	dex: string | null;
	/** Venue-provided token names for labels; never derive routing from symbol text. */
	baseToken: string;
	quoteToken: string;
	szDecimals: number;
	priceDecimals: number;
	maxLeverage?: number;
	isDelisted?: boolean;
	symbol: string;
	name: string;
	type: 'perp' | 'spot';
	lastPrice: number;
	change24h: number;
	changePercent24h: number;
	volume24h: number;
	openInterest?: number;
	fundingRate?: number;
	markPrice?: number;
	indexPrice?: number;
	/** Exact public category from Hyperliquid's perpCategories response. */
	venueCategory?: string;
	/** Venue-supplied prediction-market context. Absent fields were not supplied by the venue. */
	outcome?: {
		outcomeId: number;
		side: number;
		questionName?: string;
		questionDescription?: string;
		outcomeDescription?: string;
		settled?: boolean;
	};
	/** A catalog item may be discoverable before the venue supplies enough terms to trade safely. */
	tradingAvailability?: 'available' | 'metadataOnly';
	tradingUnavailableReason?: string;
	/** Canonical routing identity when complete venue execution terms exist. */
	instrument?: InstrumentId;
}

export interface OrderBookLevel {
	price: number;
	size: number;
	total: number;
	isUserOrder?: boolean;
}

export interface OrderBook {
	bids: OrderBookLevel[];
	asks: OrderBookLevel[];
	spread: number;
	spreadPercent: number;
}

export interface Trade {
	id: string;
	price: number;
	size: number;
	side: 'buy' | 'sell';
	timestamp: number;
}

export interface Position {
	id: string;
	market: string;
	/** Exact venue identity returned by Hyperliquid; required for routing once hydrated. */
	apiCoin?: string;
	marketKey?: string;
	side: 'long' | 'short';
	size: number;
	entryPrice: number;
	markPrice: number;
	liquidationPrice?: number;
	unrealizedPnl: number;
	realizedPnl: number;
	leverage?: number;
	margin?: number;
	delta?: number;
	gamma?: number;
	theta?: number;
	vega?: number;
}

export interface Order {
	id: string;
	clientOrderId?: string;
	market: string;
	/** Exact venue identity returned by Hyperliquid; never infer this from `market`. */
	apiCoin?: string;
	marketKey?: string;
	side: 'buy' | 'sell';
	type: OrderType;
	triggerKind?: 'stop' | 'takeProfit';
	price?: number;
	triggerPrice?: number;
	size: number;
	filled: number;
	remaining: number;
	status: 'open' | 'partial' | 'filled' | 'cancelled';
	reduceOnly: boolean;
	postOnly: boolean;
	timestamp: number;
	pending?: boolean;
	error?: string;
}

export interface Fill {
	id: string;
	orderId: string;
	market: string;
	apiCoin?: string;
	marketKey?: string;
	side: 'buy' | 'sell';
	price: number;
	size: number;
	fee: number;
	timestamp: number;
}

export interface TwapJob {
	id: string;
	twapId?: number;
	market: string;
	side: 'buy' | 'sell';
	size: number;
	executedSize: number;
	executedNotional: number;
	minutes: number;
	randomize: boolean;
	reduceOnly: boolean;
	startedAt: number;
	updatedAt: number;
	status: 'active' | 'finished' | 'terminated' | 'error';
	error?: string;
}

export interface Balance {
	asset: string;
	total: number;
	available: number;
	inOrders: number;
	unrealizedPnl: number;
	equity: number;
}

export interface RevenueSnapshot {
	status: 'live' | 'degraded';
	referral: {
		assigned: boolean;
		code?: string;
		cumVolume: number;
		unclaimedRewards: number;
		claimedRewards: number;
		builderRewards: number;
	};
	fees: {
		activeReferralDiscount: number;
		userCrossRate: number;
		userAddRate: number;
	};
	error?: string;
}

export interface OptionContract {
	symbol: string;
	underlying: string;
	strike: number;
	expiry: string;
	expiryTimestamp: number;
	optionType: 'call' | 'put';
	bid: number;
	ask: number;
	last: number;
	iv: number;
	volume: number;
	openInterest: number;
	delta: number;
	gamma: number;
	theta: number;
	vega: number;
	rho?: number;
	isITM: boolean;
	isATM: boolean;
}

export interface OptionChain {
	underlying: string;
	spotPrice: number;
	expiries: string[];
	strikes: number[];
	contracts: OptionContract[];
}

export interface Greeks {
	delta: number;
	gamma: number;
	theta: number;
	vega: number;
	rho?: number;
}

export interface PortfolioGreeks extends Greeks {
	netDelta: number;
	netGamma: number;
	netTheta: number;
	netVega: number;
}

export interface Subaccount {
	id: string;
	name: string;
	avatar: string;
	equity: number;
	marginUsed: number;
	marginFree: number;
	leverage: number;
}

export type OrderSide = 'buy' | 'sell';
export type OrderType =
	| 'limit'
	| 'market'
	| 'stop'
	| 'stop_limit'
	| 'trailing_stop'
	| 'break_even'
	| 'maker'
	| 'conditional_ladder'
	| 'twap'
	| 'adaptive_twap'
	| 'vwap'
	| 'pov'
	| 'scale'
	| 'chase'
	| 'swarm'
	| 'iceberg'
	| 'bracket'
	| 'oco'
	| 'ping_pong';
export type MarketType = 'perp' | 'option' | 'spot';

export type ChartActiveField =
	| 'entry'
	| 'trigger'
	| 'takeProfit'
	| 'stopLoss'
	| 'scaleStart'
	| 'scaleEnd';

export type ChartInteractionMode =
	| { kind: 'idle' }
	| { kind: 'designer'; activeField: ChartActiveField }
	| { kind: 'clickPlacement'; side: 'auto' | 'buy' | 'sell' };

export interface ChartOrderOverlay {
	orderId: string;
	marketKey: string;
	side: OrderSide;
	price: number;
	size: number;
	remaining: number;
	kind: 'limit' | 'stop' | 'takeProfit';
	pending: boolean;
}

export interface ChartPositionOverlay {
	positionId: string;
	marketKey: string;
	side: 'long' | 'short';
	entryPrice: number;
	size: number;
	unrealizedPnl: number;
	liquidationPrice?: number;
}

export interface ChartDraft {
	entry?: number;
	trigger?: number;
	takeProfit?: number;
	stopLoss?: number;
	scaleStart?: number;
	scaleEnd?: number;
}

export interface AdvancedOrderConfig {
	// Auto take-profit (reduce-only Scale after a direct entry acknowledgement)
	autoTakeProfitEnabled?: boolean;
	autoTakeProfitStartPrice?: number;
	autoTakeProfitEndPrice?: number;
	autoTakeProfitLevels?: number;
	autoTakeProfitSkew?: number;
	// Scale
	scaleLevels?: number;
	scaleStartPrice?: number;
	scaleEndPrice?: number;
	scaleSkew?: number;
	conditionalTriggerPrice?: number;
	conditionalTriggerKind?: 'stop' | 'takeProfit';
	conditionalTriggerSource?: 'priceCross' | 'candleClose' | 'candleVolume' | 'time' | 'syntheticPair';
	conditionalTriggerInterval?: '1m' | '5m' | '15m' | '1h' | '4h' | '1D';
	conditionalTriggerAtMs?: number;
	conditionalPairMarketKey?: string;
	conditionalPairOperation?: 'ratio' | 'spread';
	// TWAP
	twapDuration?: number; // minutes
	twapIntervals?: number;
	twapRandomize?: boolean;
	// Adaptive TWAP / VWAP
	adaptiveDuration?: number; // minutes
	adaptiveIntervals?: number;
	adaptiveOffsetTicks?: number;
	povParticipation?: number;
	povWindowTrades?: number;
	adaptiveParticipation?: number;
	volatilityLookback?: number;
	volatilityMultiplier?: number;
	// Chase
	chaseOffset?: number; // ticks behind best bid/ask
	chaseMaxChases?: number;
	// Maker routing
	makerOffsetTicks?: number;
	// Swarm
	swarmOrders?: number;
	swarmSpread?: number;
	// Iceberg
	icebergDisplaySize?: number;
	icebergWaitForFill?: boolean;
	icebergFillPollMs?: number;
	icebergFillTimeoutMs?: number;
	icebergRefillMs?: number;
	// Bracket / OCO
	takeProfit?: number;
	stopLoss?: number;
	triggerPrice?: number;
	// Trailing
	trailOffset?: number;
	breakEvenTrigger?: number;
	breakEvenOffset?: number;
	// Ping pong
	pingPongRange?: number;
	pingPongCycles?: number;
	pingPongPauseMs?: number;
	deadmanEnabled?: boolean;
	deadmanMs?: number;
}

export interface OrderPreset {
	id: string;
	name: string;
	orderType: OrderType;
	orderSide: OrderSide;
	orderPrice: number | null;
	orderSize: number;
	orderLeverage: number;
	reduceOnly: boolean;
	postOnly: boolean;
	ioc: boolean;
	advancedConfig: AdvancedOrderConfig;
	createdAt: number;
	updatedAt: number;
}

export interface ChartCandle {
	time: number;
	open: number;
	high: number;
	low: number;
	close: number;
	volume?: number;
}

export interface CLICommand {
	input: string;
	output: string;
	timestamp: number;
	type: 'success' | 'error' | 'info';
}
