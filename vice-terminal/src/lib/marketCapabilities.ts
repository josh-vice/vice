import type { MarketDescriptor, OrderType } from './types';

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

export function marketCapabilities(market: MarketDescriptor | null | undefined): MarketCapabilityProfile {
	if (!market || (market.kind !== 'corePerp' && market.kind !== 'hip3Perp' && market.kind !== 'spot')) {
		return Object.freeze({
			executable: false, readOnlyReason: 'Select a market before placing an order.', allowedOrderTypes: [],
			leverageEnabled: false, maxLeverage: 1, amountUnit: 'base', amountUnits: [], usesMargin: false,
			supportsReduceOnly: false, supportsPostOnly: false, supportsIoc: false, supportsTriggers: false,
			supportsPositionLifecycle: false, supportsAdvancedOrders: false, meaningfulStats: spotStats
		});
	}
	if (market.kind === 'corePerp' || market.kind === 'hip3Perp') return { ...perpProfile, maxLeverage: Math.max(1, market.maxLeverage ?? 1) };
	return Object.freeze({
		executable: true, readOnlyReason: null, allowedOrderTypes: ['limit', 'market'] as const,
		leverageEnabled: false, maxLeverage: 1, amountUnit: 'quote', amountUnits: ['base', 'quote'] as const, usesMargin: false,
		supportsReduceOnly: false, supportsPostOnly: true, supportsIoc: true, supportsTriggers: false,
		supportsPositionLifecycle: false, supportsAdvancedOrders: false, meaningfulStats: spotStats
	});
}
