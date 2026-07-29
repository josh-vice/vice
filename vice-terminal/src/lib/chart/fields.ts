import type { ChartActiveField, ChartDraft } from '$lib/types';

export type ChartPriceUpdate = {
	draft: Partial<ChartDraft>;
	advanced: Record<string, number>;
	entryPrice?: number;
};

export function chartPriceUpdate(field: ChartActiveField, price: number): ChartPriceUpdate {
	switch (field) {
		case 'entry':
			return { draft: { entry: price }, advanced: {}, entryPrice: price };
		case 'trigger':
			return { draft: { trigger: price }, advanced: { triggerPrice: price } };
		case 'takeProfit':
			return { draft: { takeProfit: price }, advanced: { takeProfit: price } };
		case 'stopLoss':
			return { draft: { stopLoss: price }, advanced: { stopLoss: price } };
		case 'scaleStart':
			return { draft: { scaleStart: price }, advanced: { scaleStartPrice: price } };
		case 'scaleEnd':
			return { draft: { scaleEnd: price }, advanced: { scaleEndPrice: price } };
	}
}
