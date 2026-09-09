export type BlofinEnvironment = 'demo' | 'production';

export const BLOFIN_ENVIRONMENTS = Object.freeze({
	demo: {
		rest: 'https://demo-trading-openapi.blofin.com',
		publicWs: 'wss://demo-trading-openapi.blofin.com/ws/public',
		privateWs: 'wss://demo-trading-openapi.blofin.com/ws/private'
	},
	production: {
		rest: 'https://openapi.blofin.com',
		publicWs: 'wss://openapi.blofin.com/ws/public',
		privateWs: 'wss://openapi.blofin.com/ws/private'
	}
} as const);
