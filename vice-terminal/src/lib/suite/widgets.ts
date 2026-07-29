/**
 * Native widget ports coexist with the preserved Hub until their layout,
 * lifecycle, visual, and migration gates are all certified. A port is never
 * permission to create a new data, account, or execution boundary.
 */
export const nativeWidgetPorts = {
	vWatch: {
		legacyId: 'vWatch',
		title: 'Market Watchlist',
		story: 'US-014',
		nativeRoute: '/hub/native/watchlist',
		provenance: 'Hyperliquid canonical public market registry',
		status: 'ported'
	},
	vAlerts: {
		legacyId: 'vAlerts',
		title: 'Price Alerts',
		story: 'US-014',
		nativeRoute: '/hub/native/watchlist',
		provenance: 'Hyperliquid canonical public market registry (browser-local alerts)',
		status: 'ported'
	},
	vNotes: {
		legacyId: 'vNotes',
		title: 'Notes',
		story: 'US-014',
		nativeRoute: '/hub/native/notes',
		provenance: 'Device-local notes with one-time legacy Hub scratchpad import',
		status: 'ported'
	}
} as const;

export type NativeWidgetPortId = keyof typeof nativeWidgetPorts;
