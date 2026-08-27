import type { OrderType } from '$lib/types';

export type OrderTypeDefinition = { id: OrderType; label: string; desc: string };
export type OrderTypeGroup = { group: string; types: OrderTypeDefinition[] };

export const ORDER_TYPE_GROUPS: OrderTypeGroup[] = [
	{
		group: 'Basic',
		types: [
			{ id: 'limit', label: 'Limit', desc: 'Resting order at a set price' },
			{ id: 'market', label: 'Market', desc: 'Fill immediately at best price' }
		]
	},
	{
		group: 'Conditional',
		types: [
			{ id: 'stop', label: 'Stop Market', desc: 'Market order on trigger' },
			{ id: 'stop_limit', label: 'Stop Limit', desc: 'Limit order on trigger' },
			{ id: 'bracket', label: 'Bracket (TP/SL)', desc: 'Entry with take-profit & stop-loss' }
		]
	},
	{
		group: 'Advanced',
		types: [
			{ id: 'twap', label: 'Native TWAP', desc: 'Venue-managed slices over 5–1440 minutes' },
			{ id: 'adaptive_twap', label: 'Adaptive TWAP', desc: 'Local liquidity-aware slices with persisted reconciliation' },
			{ id: 'vwap', label: 'VWAP', desc: 'Local volume-weighted slices from live public trade flow' },
			{ id: 'pov', label: 'POV', desc: 'Participate at a capped fraction of observed public volume' },
			{ id: 'break_even', label: 'Break-even Stop', desc: 'Move protection to entry after a favorable move' },
			{ id: 'maker', label: 'Maker Route', desc: 'Post a non-crossing order at the live top of book' },
			{ id: 'conditional_ladder', label: 'Conditional Ladder', desc: 'Arm a scale ladder after a trigger price is reached' },
			{ id: 'scale', label: 'Scale / Ladder', desc: 'Atomic limit orders across a price range' },
			{ id: 'chase', label: 'Chase', desc: 'Reprice a post-only child toward the live book' },
			{ id: 'oco', label: 'OCO', desc: 'Take-profit and stop-loss children with sibling cancellation' },
			{ id: 'trailing_stop', label: 'Trailing Stop', desc: 'Move a trigger only as the favorable extreme improves' },
			{ id: 'iceberg', label: 'Iceberg', desc: 'Sequential display-size child orders' },
			{ id: 'swarm', label: 'Swarm', desc: 'Distributed post-only child ladder around a center price' },
			{ id: 'ping_pong', label: 'Ping-Pong', desc: 'Alternating post-only legs after authoritative fills' }
		]
	}
];

export const SIZE_PRESETS = [10, 25, 50, 75, 100] as const;

export const QUICK_ORDER_TYPES: OrderTypeDefinition[] = [
	{ id: 'limit', label: 'Limit', desc: 'Resting order at a set price' },
	{ id: 'market', label: 'Market', desc: 'Fill immediately at best price' },
	{ id: 'stop', label: 'Stop', desc: 'Market order on trigger' },
	{ id: 'bracket', label: 'TP/SL', desc: 'Entry with take-profit & stop-loss' }
];

export const VENUE_NATIVE_ORDER_TYPES = new Set<OrderType>(['limit', 'market', 'stop', 'stop_limit', 'bracket', 'twap']);

export function persistenceClass(type: OrderType): { label: string; detail: string; local: boolean } {
	if (VENUE_NATIVE_ORDER_TYPES.has(type)) {
		return {
			label: 'Venue-native',
			detail: 'The venue manages this order after it is accepted. It can survive this browser closing.',
			local: false
		};
	}
	return {
		label: 'Device-local',
		detail: 'Vice persists and reconciles this job on this device. It does not run on Vice servers; reopening this device reconciles before resuming.',
		local: true
	};
}
