import type { MarketDescriptor, OrderType } from './types';
import { BLOFIN_CAPABILITIES } from './venue/capabilities';
import type { AccountRef, VenueCapabilities } from './venue/identity';
import type { VenueEnvironment } from './venue/adapter';

export type MarketAmountUnit = 'base' | 'quote';

export interface MarketMeaningfulStats {
	fundingRate: boolean;
	markPrice: boolean;
	indexPrice: boolean;
	openInterest: boolean;
	liquidationPrice: boolean;
	volume24h: boolean;
	change24h: boolean;
	probability: boolean;
	settlement: boolean;
}

export interface MarketCapabilityProfile {
	executable: boolean;
	readOnlyReason: string | null;
	allowedOrderTypes: readonly OrderType[];
	leverageEnabled: boolean;
	maxLeverage: number;
	amountUnit: MarketAmountUnit;
	amountUnits: readonly MarketAmountUnit[];
	usesMargin: boolean;
	supportsReduceOnly: boolean;
	supportsPostOnly: boolean;
	supportsIoc: boolean;
	supportsTriggers: boolean;
	supportsPositionLifecycle: boolean;
	supportsAdvancedOrders: boolean;
	meaningfulStats: MarketMeaningfulStats;
	/** Present for venue-aware profiles; legacy Hyperliquid callers remain unchanged. */
	supportsHedgeMode?: boolean;
	supportsMarginModes?: boolean;
	supportsAmend?: boolean;
	amendSemantics?: VenueCapabilities['amendSemantics'];
	supportsClientOrderIds?: boolean;
	supportsNativeAlgorithms?: boolean;
	nativeAlgorithmTypes?: readonly string[];
	supportsWebSocketOrderEntry?: boolean;
	supportsPrivateStreams?: boolean;
	privateStreamGuarantee?: VenueCapabilities['privateStreamGuarantee'];
	certification?: VenueCapabilities['certification'];
}

export interface MarketCapabilityContext {
	account?: AccountRef | null;
	environment?: VenueEnvironment;
}

const perpStats: MarketMeaningfulStats = Object.freeze({
	fundingRate: true, markPrice: true, indexPrice: true, openInterest: true,
	liquidationPrice: true, volume24h: true, change24h: true, probability: false, settlement: false
});
const spotStats: MarketMeaningfulStats = Object.freeze({
	fundingRate: false, markPrice: false, indexPrice: false, openInterest: false,
	liquidationPrice: false, volume24h: true, change24h: true, probability: false, settlement: false
});

const perpProfile: MarketCapabilityProfile = Object.freeze({
	executable: true, readOnlyReason: null, allowedOrderTypes: ['limit', 'market', 'stop', 'stop_limit'] as const,
	leverageEnabled: true, maxLeverage: 1, amountUnit: 'base', amountUnits: ['base'] as const, usesMargin: true,
	supportsReduceOnly: true, supportsPostOnly: true, supportsIoc: true, supportsTriggers: true,
	supportsPositionLifecycle: true, supportsAdvancedOrders: true, meaningfulStats: perpStats
});

const BLOFIN_ALLOWED_ORDER_TYPES = Object.freeze(['limit', 'market'] as const);

function isBlofinLinearPerp(market: MarketDescriptor): boolean {
	return market.instrument?.venue === BLOFIN_CAPABILITIES.venue && market.instrument.product === 'linearPerp';
}

function blofinCapabilityProfile(market: MarketDescriptor, context: MarketCapabilityContext): MarketCapabilityProfile {
	const account = context.account ?? null;
	const environment = context.environment ?? 'demo';
	const hasBlofinAccount = account?.venue === BLOFIN_CAPABILITIES.venue;
	const productionLocked = environment === 'production' && BLOFIN_CAPABILITIES.certification === 'reviewOnly';
	const readOnlyReason = !hasBlofinAccount
		? 'Connect a BloFin account before placing an order.'
		: productionLocked
			? 'BloFin live execution is not certified; use demo trading'
			: null;

	return Object.freeze({
		executable: hasBlofinAccount && !productionLocked,
		readOnlyReason,
		allowedOrderTypes: BLOFIN_ALLOWED_ORDER_TYPES,
		leverageEnabled: true,
		maxLeverage: Math.max(1, market.maxLeverage ?? 1),
		amountUnit: 'base' as const,
		amountUnits: ['base'] as const,
		usesMargin: true,
		supportsReduceOnly: false,
		supportsPostOnly: BLOFIN_CAPABILITIES.orderTypes.includes('post_only'),
		supportsIoc: BLOFIN_CAPABILITIES.orderTypes.includes('ioc'),
		supportsTriggers: false,
		supportsPositionLifecycle: false,
		supportsAdvancedOrders: false,
		meaningfulStats: perpStats,
		supportsHedgeMode: BLOFIN_CAPABILITIES.supportsHedgeMode,
		supportsMarginModes: BLOFIN_CAPABILITIES.supportsMarginModes,
		supportsAmend: BLOFIN_CAPABILITIES.supportsAmend,
		amendSemantics: BLOFIN_CAPABILITIES.amendSemantics,
		supportsClientOrderIds: BLOFIN_CAPABILITIES.supportsClientOrderIds,
		supportsNativeAlgorithms: BLOFIN_CAPABILITIES.supportsNativeAlgorithms,
		nativeAlgorithmTypes: BLOFIN_CAPABILITIES.nativeAlgorithmTypes,
		supportsWebSocketOrderEntry: BLOFIN_CAPABILITIES.supportsWebSocketOrderEntry,
		supportsPrivateStreams: BLOFIN_CAPABILITIES.supportsPrivateStreams,
		privateStreamGuarantee: BLOFIN_CAPABILITIES.privateStreamGuarantee,
		certification: BLOFIN_CAPABILITIES.certification
	});
}

export function marketCapabilities(
	market: MarketDescriptor | null | undefined,
	context: MarketCapabilityContext = {}
): MarketCapabilityProfile {
	if (!market || (market.kind !== 'corePerp' && market.kind !== 'hip3Perp' && market.kind !== 'spot')) {
		return Object.freeze({
			executable: false, readOnlyReason: 'Select a market before placing an order.', allowedOrderTypes: [],
			leverageEnabled: false, maxLeverage: 1, amountUnit: 'base', amountUnits: [], usesMargin: false,
			supportsReduceOnly: false, supportsPostOnly: false, supportsIoc: false, supportsTriggers: false,
			supportsPositionLifecycle: false, supportsAdvancedOrders: false, meaningfulStats: spotStats
		});
	}
	if (isBlofinLinearPerp(market)) return blofinCapabilityProfile(market, context);
	if (market.kind === 'corePerp' || market.kind === 'hip3Perp') return { ...perpProfile, maxLeverage: Math.max(1, market.maxLeverage ?? 1) };
	return Object.freeze({
		executable: true, readOnlyReason: null, allowedOrderTypes: ['limit', 'market'] as const,
		leverageEnabled: false, maxLeverage: 1, amountUnit: 'quote', amountUnits: ['base', 'quote'] as const, usesMargin: false,
		supportsReduceOnly: false, supportsPostOnly: true, supportsIoc: true, supportsTriggers: false,
		supportsPositionLifecycle: false, supportsAdvancedOrders: false, meaningfulStats: spotStats
	});
}
