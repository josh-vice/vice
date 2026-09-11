import type { ChartActiveField, ChartDraft, OrderSide, OrderType } from '$lib/types';

const FIELD_LABELS: Record<ChartActiveField, string> = {
	entry: 'ENTRY',
	trigger: 'TRIGGER',
	takeProfit: 'TAKE PROFIT',
	stopLoss: 'STOP LOSS',
	scaleStart: 'SCALE START',
	scaleEnd: 'SCALE END'
};

function validPrice(value: number | null | undefined): number | null {
	return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

function orderTypeLabel(orderType: OrderType): string {
	return orderType.replaceAll('_', ' ').toUpperCase();
}

function orderTypeSentence(orderType: OrderType): string {
	return orderType.replaceAll('_', ' ');
}

/** Return the price represented by the active Designer field. */
export function chartDraftPrice(
	field: ChartActiveField,
	draft: ChartDraft,
	previewPrice: number | null | undefined
): number | null {
	return validPrice(previewPrice) ?? validPrice(draft[field]);
}

export type DesignerDraftPresentation = {
	action: string;
	field: string;
	side: Uppercase<OrderSide>;
	details: string;
	ariaLabel: string;
};

/** Build stable, non-actionable text for the on-chart Designer cursor. */
export function designerDraftPresentation(input: {
	field: ChartActiveField;
	orderType: OrderType;
	side: OrderSide;
	size: number;
	baseAsset: string;
	priceText: string;
}): DesignerDraftPresentation {
	const field = FIELD_LABELS[input.field];
	const side = input.side.toUpperCase() as Uppercase<OrderSide>;
	const size = Number.isFinite(input.size) && input.size > 0 ? String(input.size) : '0';
	return {
		action: `PLACE ${orderTypeLabel(input.orderType)}`,
		field,
		side,
		details: `${side} · ${size} ${input.baseAsset} @ ${input.priceText}`,
		ariaLabel: `Place ${orderTypeSentence(input.orderType)} ${side} ${field.toLowerCase()} draft at ${input.priceText}`
	};
}
