export type ConditionalLadderSide = 'buy' | 'sell';
export type ConditionalLadderTriggerKind = 'stop' | 'takeProfit';

export function conditionalLadderTriggered(side: ConditionalLadderSide, kind: ConditionalLadderTriggerKind, triggerPrice: number, currentPrice: number): boolean {
	if (![triggerPrice, currentPrice].every(Number.isFinite) || triggerPrice <= 0 || currentPrice <= 0) return false;
	if (kind === 'takeProfit') return side === 'buy' ? currentPrice <= triggerPrice : currentPrice >= triggerPrice;
	return side === 'buy' ? currentPrice >= triggerPrice : currentPrice <= triggerPrice;
}

export function validConditionalLadderParameters(size: number, triggerPrice: number, startPrice: number, endPrice: number, levels: number, skew: number, requirePriceTrigger = true, allowSignedTrigger = false): boolean {
	const triggerIsValid = !requirePriceTrigger || (allowSignedTrigger ? Number.isFinite(triggerPrice) : triggerPrice > 0);
	return size > 0 && triggerIsValid && startPrice > 0 && endPrice > 0 && Number.isInteger(levels) && levels >= 2 && levels <= 100 && skew > 0;
}
