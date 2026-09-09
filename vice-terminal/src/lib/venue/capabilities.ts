import { assertVenueCapabilities, type VenueCapabilities } from './identity';

function immutableCapabilities(capabilities: VenueCapabilities): Readonly<VenueCapabilities> {
	const validated = assertVenueCapabilities(capabilities);
	return Object.freeze({
		...validated,
		products: Object.freeze([...validated.products]),
		orderTypes: Object.freeze([...validated.orderTypes]),
		nativeAlgorithmTypes: Object.freeze([...validated.nativeAlgorithmTypes])
	});
}

export const HYPERLIQUID_CAPABILITIES = immutableCapabilities({
	venue: 'hyperliquid',
	products: ['linearPerp', 'spot'],
	orderTypes: ['limit', 'market', 'post_only', 'ioc', 'stop', 'stop_limit'],
	supportsHedgeMode: false,
	supportsMarginModes: true,
	supportsAmend: true,
	amendSemantics: 'inPlace',
	supportsClientOrderIds: true,
	supportsNativeAlgorithms: false,
	nativeAlgorithmTypes: [],
	supportsWebSocketOrderEntry: false,
	supportsPrivateStreams: true,
	privateStreamGuarantee: 'authenticatedReconciliation',
	certification: 'productionExposed'
});

export const BLOFIN_CAPABILITIES = immutableCapabilities({
	venue: 'blofin',
	products: ['linearPerp'],
	orderTypes: ['limit', 'market', 'post_only', 'ioc'],
	supportsHedgeMode: false,
	supportsMarginModes: true,
	supportsAmend: true,
	amendSemantics: 'inPlace',
	supportsClientOrderIds: true,
	supportsNativeAlgorithms: false,
	nativeAlgorithmTypes: [],
	supportsWebSocketOrderEntry: false,
	supportsPrivateStreams: true,
	privateStreamGuarantee: 'authenticatedReconciliation',
	certification: 'reviewOnly'
});
